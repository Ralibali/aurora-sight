import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyAnswer,
  computeMetrics,
  MAX_PROMPTS_PER_RUN,
  type Classification,
  type Intent,
} from "@/lib/geo";
import type { ProviderAdapter } from "@/lib/providers/types";

export type AuditExecutionInput = {
  brandId: string;
  promptSetId: string;
  providerConfigId: string;
  searchMode: "offline" | "native_search";
  label?: string;
};

type PromptRow = { id: string; text: string; intent: Intent };

async function resolveProviderAdapter(provider: string): Promise<ProviderAdapter> {
  const normalized = provider.trim().toLowerCase();

  if (normalized === "surface" || normalized === "real_surface") {
    const endpoint = process.env["AURORA_SURFACE_PROVIDER_URL"];
    if (!endpoint) {
      throw new Error("Real AI Surface kräver AURORA_SURFACE_PROVIDER_URL i servermiljön.");
    }
    const { createSurfaceAdapter } = await import("@/lib/providers/surface.server");
    return createSurfaceAdapter(endpoint, process.env["AURORA_SURFACE_PROVIDER_TOKEN"]);
  }

  if (normalized !== "openrouter") {
    throw new Error(`Okänd provider: ${provider}. Stödda providers är openrouter och surface.`);
  }

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    throw new Error("Live-analys med OpenRouter kräver OPENROUTER_API_KEY i servermiljön.");
  }
  const { createOpenRouterAdapter } = await import("@/lib/providers/openrouter.server");
  return createOpenRouterAdapter(apiKey);
}

export async function executeAuditRun({
  supabase,
  userId,
  data,
}: {
  supabase: SupabaseClient;
  userId: string | null;
  data: AuditExecutionInput;
}) {
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, org_id, name, domain, aliases, language, country")
    .eq("id", data.brandId)
    .single();
  if (brandError || !brand) throw new Error("Varumärket kunde inte läsas.");

  const { data: providerConfig, error: providerError } = await supabase
    .from("provider_configs")
    .select("*")
    .eq("id", data.providerConfigId)
    .eq("org_id", brand.org_id)
    .eq("enabled", true)
    .single();
  if (providerError || !providerConfig) throw new Error("Modellkonfigurationen kunde inte läsas.");

  const providerName = String(providerConfig.provider ?? "openrouter").toLowerCase();
  const isSurfaceProvider = providerName === "surface" || providerName === "real_surface";
  const effectiveSearchMode = isSurfaceProvider ? "native_search" : data.searchMode;

  if (
    !isSurfaceProvider &&
    effectiveSearchMode === "native_search" &&
    !providerConfig.supports_native_search
  ) {
    throw new Error("Den valda modellen stödjer inte leverantörens egen webbsökning.");
  }

  const adapter = await resolveProviderAdapter(providerName);

  const { data: promptRows, error: promptError } = await supabase
    .from("prompts")
    .select("id, text, intent")
    .eq("prompt_set_id", data.promptSetId)
    .eq("org_id", brand.org_id)
    .eq("enabled", true)
    .order("created_at", { ascending: true });
  if (promptError) throw new Error("Prompterna kunde inte läsas.");

  const prompts = (promptRows ?? []) as PromptRow[];
  if (prompts.length === 0) throw new Error("Promptsetet innehåller inga aktiva prompter.");
  if (prompts.length > MAX_PROMPTS_PER_RUN) {
    throw new Error(
      `Skyddsgräns: max ${MAX_PROMPTS_PER_RUN} prompter per körning (setet har ${prompts.length}).`,
    );
  }

  const { data: competitorRows } = await supabase
    .from("competitors")
    .select("name, aliases")
    .eq("brand_id", data.brandId)
    .eq("org_id", brand.org_id);

  const competitors = (competitorRows ?? []).map((c) => ({
    name: c.name as string,
    aliases: (c.aliases as string[] | null) ?? [],
  }));
  const brandNames = Array.from(
    new Set([brand.name as string, ...(((brand.aliases as string[] | null) ?? []) as string[])]),
  ).filter(Boolean);

  const { data: run, error: runError } = await supabase
    .from("audit_runs")
    .insert({
      org_id: brand.org_id,
      brand_id: brand.id,
      prompt_set_id: data.promptSetId,
      label: data.label ?? null,
      provider: providerConfig.provider,
      model_id: providerConfig.model_id,
      model_label: providerConfig.model_label,
      search_mode: effectiveSearchMode,
      language: brand.language,
      country: brand.country,
      mode: "live",
      status: "running",
      total_prompts: prompts.length,
      created_by: userId,
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error("Körningen kunde inte skapas.");

  try {
    const costIn = Number(providerConfig.est_cost_per_1k_in ?? 0);
    const costOut = Number(providerConfig.est_cost_per_1k_out ?? 0);

    let completed = 0;
    let failed = 0;
    let totalCost = 0;
    const summaries: {
      classification: Classification;
      intent: Intent;
      competitor_mentions: { name: string; count: number }[];
    }[] = [];

    const concurrency = 4;
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const answers = await Promise.all(
        batch.map((prompt) =>
          adapter.ask({
            prompt: prompt.text,
            modelId: providerConfig.model_id,
            language: brand.language,
            country: brand.country,
            nativeSearch: effectiveSearchMode === "native_search",
          }),
        ),
      );

      for (let j = 0; j < batch.length; j += 1) {
        const prompt = batch[j];
        const answer = answers[j];
        if (!prompt || !answer) continue;

        const cost = (answer.tokensIn / 1000) * costIn + (answer.tokensOut / 1000) * costOut;
        totalCost += cost;

        if (answer.error) {
          failed += 1;
          await supabase.from("audit_results").insert({
            org_id: brand.org_id,
            run_id: run.id,
            prompt_id: prompt.id,
            prompt_text: prompt.text,
            intent: prompt.intent,
            classification: "ABSENT",
            classification_reason: "Klassificering ej möjlig – anropet misslyckades.",
            raw_answer: null,
            error: answer.error,
          });
          continue;
        }

        const verdict = classifyAnswer({
          answer: answer.answer,
          brandNames,
          brandDomain: brand.domain,
          competitors,
          citationUrls: answer.citationUrls,
        });

        const { data: inserted } = await supabase
          .from("audit_results")
          .insert({
            org_id: brand.org_id,
            run_id: run.id,
            prompt_id: prompt.id,
            prompt_text: prompt.text,
            intent: prompt.intent,
            classification: verdict.classification,
            classification_reason: verdict.reason,
            raw_answer: answer.answer,
            brand_mentions: verdict.brandMentions,
            competitor_mentions: verdict.competitorMentions,
            tokens_in: answer.tokensIn,
            tokens_out: answer.tokensOut,
            cost_estimate_usd: Number(cost.toFixed(6)),
          })
          .select("id")
          .single();

        if (inserted) {
          const urls = Array.from(new Set(answer.citationUrls));
          if (urls.length > 0) {
            await supabase.from("citations").insert(
              urls.slice(0, 20).map((url) => ({
                org_id: brand.org_id,
                result_id: inserted.id,
                url,
                domain: (() => {
                  try {
                    return new URL(url).hostname.replace(/^www\./, "");
                  } catch {
                    return null;
                  }
                })(),
                is_brand_domain: verdict.brandCitationUrls.includes(url),
              })),
            );
          }
        }

        completed += 1;
        summaries.push({
          classification: verdict.classification,
          intent: prompt.intent,
          competitor_mentions: verdict.competitorMentions,
        });
      }
    }

    const metrics = computeMetrics(summaries);
    await supabase
      .from("audit_runs")
      .update({
        status: failed === 0 ? "completed" : completed === 0 ? "failed" : "partial",
        completed_prompts: completed,
        failed_prompts: failed,
        cost_estimate_usd: Number(totalCost.toFixed(6)),
        metrics: JSON.parse(JSON.stringify(metrics)),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    await supabase.from("audit_log").insert({
      org_id: brand.org_id,
      user_id: userId,
      action: "audit_run.completed",
      entity: "audit_runs",
      entity_id: run.id,
      meta: {
        prompts: prompts.length,
        failed,
        model: providerConfig.model_id,
        provider: providerConfig.provider,
        automatic: userId == null,
      },
    });

    return { runId: run.id as string, completed, failed, metrics };
  } catch (error) {
    await supabase
      .from("audit_runs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 1000) : "Okänt körfel.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}
