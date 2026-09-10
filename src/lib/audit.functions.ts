import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  classifyAnswer,
  computeMetrics,
  MAX_PROMPTS_PER_RUN,
  type Classification,
  type Intent,
} from "@/lib/geo";

/** Leverantörsstatus – avslöjar aldrig nyckelvärdet, bara om den finns. */
export const getProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["OPENROUTER_API_KEY"];
  return {
    openrouter: Boolean(key && key.length > 10),
    liveEnabled: Boolean(key && key.length > 10),
  };
});

const RunInput = z.object({
  brandId: z.string().uuid(),
  promptSetId: z.string().uuid(),
  providerConfigId: z.string().uuid(),
  searchMode: z.enum(["offline", "native_search"]),
  label: z.string().max(120).optional(),
});

type PromptRow = { id: string; text: string; intent: Intent };

export const startAuditRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Live-analys kräver OPENROUTER_API_KEY i serverns miljö. Lägg till nyckeln under Projektinställningar → Secrets.",
      );
    }

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
      .single();
    if (providerError || !providerConfig) throw new Error("Modellkonfigurationen kunde inte läsas.");

    if (data.searchMode === "native_search" && !providerConfig.supports_native_search) {
      throw new Error("Den valda modellen stödjer inte leverantörens egen webbsökning.");
    }

    const { data: promptRows, error: promptError } = await supabase
      .from("prompts")
      .select("id, text, intent")
      .eq("prompt_set_id", data.promptSetId)
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
      .eq("brand_id", data.brandId);
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
        search_mode: data.searchMode,
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

    const { createOpenRouterAdapter } = await import("@/lib/providers/openrouter.server");
    const adapter = createOpenRouterAdapter(apiKey);

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
        batch.map((p) =>
          adapter.ask({
            prompt: p.text,
            modelId: providerConfig.model_id,
            language: brand.language,
            country: brand.country,
            nativeSearch: data.searchMode === "native_search",
          }),
        ),
      );

      for (let j = 0; j < batch.length; j += 1) {
        const prompt = batch[j];
        const answer = answers[j];
        if (!prompt || !answer) continue;
        const cost =
          (answer.tokensIn / 1000) * costIn + (answer.tokensOut / 1000) * costOut;
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
      meta: { prompts: prompts.length, failed, model: providerConfig.model_id },
    });

    return { runId: run.id as string, completed, failed, metrics };
  });

const FindingsInput = z.object({ runId: z.string().uuid() });

/** Skapar evidensbaserade hypoteser utifrån faktiska resultat i en körning. */
export const generateFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FindingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: run } = await supabase
      .from("audit_runs")
      .select("id, org_id, brand_id, mode, model_label")
      .eq("id", data.runId)
      .single();
    if (!run) throw new Error("Körningen hittades inte.");

    const { data: results } = await supabase
      .from("audit_results")
      .select("id, intent, classification, competitor_mentions, prompt_text")
      .eq("run_id", data.runId);
    const rows = results ?? [];
    if (rows.length === 0) throw new Error("Körningen saknar resultat.");

    const created: string[] = [];

    const absent = rows.filter((r) => r.classification === "ABSENT");
    if (absent.length > 0) {
      const { data: finding } = await supabase
        .from("findings")
        .insert({
          org_id: run.org_id,
          brand_id: run.brand_id,
          run_id: run.id,
          title: `Frånvarande i ${absent.length} av ${rows.length} köpprompter`,
          description: `Modellen ${run.model_label} nämnde inte varumärket alls i ${absent.length} prompter. Varje åtgärd nedan är en hypotes kopplad till dessa svar.`,
          severity: 1,
          evidence_result_ids: absent.slice(0, 12).map((r) => r.id),
        })
        .select("id")
        .single();
      if (finding) {
        created.push(finding.id);
        await supabase.from("actions").insert([
          {
            org_id: run.org_id,
            brand_id: run.brand_id,
            finding_id: finding.id,
            title: "Förtydliga entiteten: vad ni gör, för vem och var",
            category: "entity_clarity",
            rationale: `Hypotes: modellerna saknar entydig information om varumärket. Motiverad av ${absent.length} frånvarande svar.`,
            priority: 1,
          },
          {
            org_id: run.org_id,
            brand_id: run.brand_id,
            finding_id: finding.id,
            title: "Publicera sidor som direkt besvarar de frånvarande prompterna",
            category: "content_gap",
            rationale: `Hypotes: det saknas källmaterial som svarar på: ${absent
              .slice(0, 3)
              .map((r) => `”${r.prompt_text}”`)
              .join(", ")}.`,
            priority: 1,
          },
          {
            org_id: run.org_id,
            brand_id: run.brand_id,
            finding_id: finding.id,
            title: "Lägg till Organization-, Product- och FAQ-schema",
            category: "structured_data",
            rationale:
              "Hypotes: strukturerad data ökar chansen att bli korrekt tolkad och citerad. Ingen garanti för placering.",
            priority: 2,
          },
        ]);
      }
    }

    const competitorTotals = new Map<string, number>();
    for (const r of rows) {
      for (const m of (r.competitor_mentions as { name: string; count: number }[] | null) ?? []) {
        competitorTotals.set(m.name, (competitorTotals.get(m.name) ?? 0) + m.count);
      }
    }
    const topCompetitor = Array.from(competitorTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCompetitor) {
      const evidence = rows
        .filter((r) =>
          ((r.competitor_mentions as { name: string }[] | null) ?? []).some(
            (m) => m.name === topCompetitor[0],
          ),
        )
        .slice(0, 12)
        .map((r) => r.id);
      const { data: finding } = await supabase
        .from("findings")
        .insert({
          org_id: run.org_id,
          brand_id: run.brand_id,
          run_id: run.id,
          title: `${topCompetitor[0]} nämns oftast i stället`,
          description: `${topCompetitor[0]} förekommer ${topCompetitor[1]} gånger i körningens svar. Evidens länkas per prompt.`,
          severity: 2,
          evidence_result_ids: evidence,
        })
        .select("id")
        .single();
      if (finding) {
        created.push(finding.id);
        await supabase.from("actions").insert([
          {
            org_id: run.org_id,
            brand_id: run.brand_id,
            finding_id: finding.id,
            title: `Skapa saklig jämförelse mot ${topCompetitor[0]}`,
            category: "content_gap",
            rationale:
              "Hypotes: en tydlig, faktabaserad jämförelsesida gör skillnaderna maskinläsbara. Inga garantier om ranking.",
            priority: 1,
          },
          {
            org_id: run.org_id,
            brand_id: run.brand_id,
            finding_id: finding.id,
            title: "Sök omnämnanden i tredjepartskällor modellerna redan citerar",
            category: "third_party_citation",
            rationale:
              "Hypotes: modeller återanvänder etablerade källor. Börja med de domäner som faktiskt citeras i körningen.",
            priority: 2,
          },
        ]);
      }
    }

    return { findings: created.length };
  });

const ShareInput = z.object({ reportId: z.string().uuid(), share: z.boolean() });

export const setReportSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShareInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reports")
      .update({ is_shared: data.share })
      .eq("id", data.reportId);
    if (error) throw new Error("Delningsstatus kunde inte uppdateras.");
    return { ok: true };
  });
