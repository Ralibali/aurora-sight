import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TokenInput = z.object({ token: z.string().min(8).max(120) });

/**
 * Publik, tokenskyddad läsning av en delad rapport.
 * Endast rapporter med is_shared = true kan hämtas, och bara med rätt token.
 * Inga personuppgifter returneras.
 */
export const getSharedReport = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => TokenInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("id, title, summary, created_at, brand_id, run_id, is_shared")
      .eq("share_token", data.token)
      .eq("is_shared", true)
      .maybeSingle();

    if (!report) return { found: false as const };

    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("name, domain, country, language, description, is_demo")
      .eq("id", report.brand_id)
      .single();

    const { data: run } = report.run_id
      ? await supabaseAdmin
          .from("audit_runs")
          .select(
            "id, label, model_label, provider, search_mode, mode, status, started_at, completed_at, total_prompts, metrics",
          )
          .eq("id", report.run_id)
          .single()
      : { data: null };

    const { data: results } = report.run_id
      ? await supabaseAdmin
          .from("audit_results")
          .select("id, prompt_text, intent, classification, classification_reason")
          .eq("run_id", report.run_id)
          .order("classification", { ascending: true })
      : { data: [] };

    const { data: actions } = await supabaseAdmin
      .from("actions")
      .select("id, title, category, rationale, priority, status")
      .eq("brand_id", report.brand_id)
      .order("priority", { ascending: true })
      .limit(12);

    const citations = report.run_id
      ? (
          await supabaseAdmin
            .from("citations")
            .select("url, domain, is_brand_domain, result_id")
            .in("result_id", (results ?? []).map((r) => r.id))
        ).data
      : [];

    return {
      found: true as const,
      report: {
        id: report.id,
        title: report.title,
        summary: report.summary,
        created_at: report.created_at,
      },
      brand,
      run,
      results: results ?? [],
      actions: actions ?? [],
      citations: citations ?? [],
    };
  });
