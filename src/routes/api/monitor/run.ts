import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { executeAuditRun } from "@/lib/audit-runner.server";

type ClaimedSchedule = {
  id: string;
  org_id: string;
  brand_id: string;
  prompt_set_id: string | null;
  provider_config_id: string | null;
  model_id: string | null;
  cadence: string;
  search_mode: "offline" | "native_search";
  next_run_at: string | null;
};

function secureEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return a.length > 0 && b.length > 0 && diff === 0;
}

function nextRun(cadence: string, from = new Date()) {
  const next = new Date(from);
  if (cadence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else throw new Error(`Ogiltig cadence: ${cadence}`);
  return next.toISOString();
}

export const Route = createFileRoute("/api/monitor/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["AURORA_MONITOR_CRON_SECRET"] ?? "";
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!secureEqual(token, expected)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const supabaseUrl =
          process.env["SUPABASE_URL"] ??
          process.env["VITE_SUPABASE_URL"] ??
          "";
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "server_database_not_configured" }, { status: 500 });
        }

        const db = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimed, error: claimError } = await db.rpc(
          "claim_due_sight_schedules",
          { p_limit: 1 },
        );
        if (claimError) {
          console.error("[monitor-run] claim failed", claimError.message);
          return Response.json({ error: "claim_failed" }, { status: 500 });
        }

        const schedules = (claimed ?? []) as ClaimedSchedule[];
        if (schedules.length === 0) return Response.json({ ok: true, processed: 0 });

        let completed = 0;
        const errors: string[] = [];

        for (const schedule of schedules) {
          try {
            let promptSetId = schedule.prompt_set_id;
            if (!promptSetId) {
              const { data } = await db
                .from("prompt_sets")
                .select("id")
                .eq("brand_id", schedule.brand_id)
                .eq("org_id", schedule.org_id)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
              promptSetId = data?.id ?? null;
            }

            let providerConfigId = schedule.provider_config_id;
            if (!providerConfigId) {
              let providerQuery = db
                .from("provider_configs")
                .select("id,model_id")
                .eq("org_id", schedule.org_id)
                .eq("enabled", true);
              if (schedule.model_id) providerQuery = providerQuery.eq("model_id", schedule.model_id);
              const { data } = await providerQuery
                .order("supports_native_search", { ascending: false })
                .limit(1)
                .maybeSingle();
              providerConfigId = data?.id ?? null;
            }

            if (!promptSetId || !providerConfigId) {
              throw new Error("Schemat saknar aktiv promptgrupp eller provider.");
            }

            const run = await executeAuditRun({
              supabase: db,
              userId: null,
              data: {
                brandId: schedule.brand_id,
                promptSetId,
                providerConfigId,
                searchMode: schedule.search_mode ?? "offline",
                label: `Automatisk bevakning ${new Date().toISOString().slice(0, 10)}`,
              },
            });

            const now = new Date();
            const { error: updateError } = await db
              .from("schedules")
              .update({
                running_at: null,
                last_run_at: now.toISOString(),
                last_run_id: run.runId,
                next_run_at: nextRun(schedule.cadence, now),
                last_error: null,
                last_error_at: null,
              })
              .eq("id", schedule.id)
              .eq("org_id", schedule.org_id);
            if (updateError) throw updateError;
            completed += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message.slice(0, 1000) : "Okänt fel.";
            errors.push(message);
            await db
              .from("schedules")
              .update({
                running_at: null,
                next_run_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                last_error: message,
                last_error_at: new Date().toISOString(),
              })
              .eq("id", schedule.id)
              .eq("org_id", schedule.org_id);
          }
        }

        return Response.json({
          ok: errors.length === 0,
          processed: schedules.length,
          completed,
          failed: errors.length,
          errors,
        });
      },
    },
  },
});
