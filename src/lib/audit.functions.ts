import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { executeAuditRun } from "@/lib/audit-runner.server";

/** Leverantörsstatus – avslöjar aldrig nyckelvärden, bara om de finns. */
export const getProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const openRouterKey = process.env["OPENROUTER_API_KEY"];
  const surfaceUrl = process.env["AURORA_SURFACE_PROVIDER_URL"];
  const openrouter = Boolean(openRouterKey && openRouterKey.length > 10);
  const surface = Boolean(surfaceUrl && surfaceUrl.startsWith("http"));
  return { openrouter, surface, liveEnabled: openrouter || surface };
});

const RunInput = z.object({
  brandId: z.string().uuid(),
  promptSetId: z.string().uuid(),
  providerConfigId: z.string().uuid(),
  searchMode: z.enum(["offline", "native_search"]),
  label: z.string().max(120).optional(),
});

export const startAuditRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) =>
    executeAuditRun({
      supabase: context.supabase,
      userId: context.userId,
      data,
    }),
  );

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
