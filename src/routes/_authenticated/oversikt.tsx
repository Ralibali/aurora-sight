import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProviderStatus } from "@/lib/audit.functions";
import { AppShell } from "@/components/app/app-shell";
import { ModeBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/oversikt")({
  component: OverviewPage,
});

function pct(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "–";
  return `${Math.round(value * 100)} %`;
}

function OverviewPage() {
  const providerStatus = useQuery({
    queryKey: ["provider-status"],
    queryFn: () => getProviderStatus(),
  });

  const summary = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const [brands, clients, runs, schedules, subs, actions] = await Promise.all([
        supabase.from("brands").select("id, name, is_demo, domain"),
        supabase.from("clients").select("id, name, is_demo"),
        supabase
          .from("audit_runs")
          .select(
            "id, brand_id, label, model_label, mode, status, started_at, total_prompts, metrics, cost_estimate_usd",
          )
          .order("started_at", { ascending: false })
          .limit(8),
        supabase.from("schedules").select("id, brand_id, enabled, next_run_at, cadence"),
        supabase.from("subscriptions").select("id, plan_key, status, mrr_sek"),
        supabase.from("actions").select("id, status, priority"),
      ]);
      return {
        brands: brands.data ?? [],
        clients: clients.data ?? [],
        runs: runs.data ?? [],
        schedules: schedules.data ?? [],
        subs: subs.data ?? [],
        actions: actions.data ?? [],
      };
    },
  });

  const live = providerStatus.data?.liveEnabled;
  const d = summary.data;
  const brandName = (id: string) => d?.brands.find((b) => b.id === id)?.name ?? "Okänt varumärke";

  const mrr = (d?.subs ?? [])
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.mrr_sek), 0);
  const demoMrr = (d?.subs ?? [])
    .filter((s) => s.status !== "active")
    .reduce((sum, s) => sum + Number(s.mrr_sek), 0);
  const openActions = (d?.actions ?? []).filter((a) => a.status === "open").length;
  const activeMonitors = (d?.schedules ?? []).filter((s) => s.enabled).length;
  const overdue = (d?.schedules ?? []).filter(
    (s) => s.enabled && s.next_run_at && new Date(s.next_run_at) < new Date(),
  ).length;
  const liveRuns = (d?.runs ?? []).filter((r) => r.mode === "live").length;

  return (
    <AppShell
      title="Översikt"
      description="Kommersiell och operativ status för din organisation."
      actions={
        <Button asChild>
          <Link to="/klienter">Nytt varumärke</Link>
        </Button>
      }
    >
      {providerStatus.isLoading ? null : live ? (
        <div className="mb-6 rounded-lg border border-rec/40 bg-rec/10 px-4 py-3 text-sm">
          <span className="font-semibold">Live-läge aktivt.</span> OPENROUTER_API_KEY är konfigurerad
          – riktiga analyser kan köras.
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-start gap-3 rounded-lg border border-demo/50 bg-demo/15 px-4 py-3 text-sm">
          <KeyRound className="mt-0.5 h-4 w-4" aria-hidden />
          <div>
            <p className="font-semibold">Demoläge – ingen modellnyckel konfigurerad.</p>
            <p className="text-muted-foreground">
              Lägg till <code>OPENROUTER_API_KEY</code> under Projektinställningar → Secrets för att
              köra riktiga analyser. All data du ser nu är märkt DEMO.
            </p>
          </div>
        </div>
      )}

      {summary.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : summary.isError ? (
        <p className="text-sm text-destructive">Data kunde inte hämtas.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Varumärken", value: d?.brands.length ?? 0, hint: `${d?.clients.length ?? 0} klienter` },
              {
                label: "MRR (aktiva abonnemang)",
                value: `${mrr.toLocaleString("sv-SE")} kr`,
                hint: demoMrr > 0 ? `${demoMrr.toLocaleString("sv-SE")} kr i demo/ej aktiverat` : "Inga demoposter",
              },
              {
                label: "Aktiva bevakningar",
                value: activeMonitors,
                hint: overdue > 0 ? `${overdue} försenade` : "Inga försenade",
              },
              { label: "Öppna åtgärder", value: openActions, hint: `${liveRuns} live-körningar totalt` },
            ].map((card) => (
              <Card key={card.label} className="card-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl font-semibold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {overdue > 0 ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-mentioned/50 bg-mentioned/15 px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {overdue} bevakning(ar) har passerat sitt nästa körningsdatum. Bakgrundskörning är
              avstängd i v0.1 – starta om körningen manuellt.
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="card-soft">
              <CardHeader>
                <CardTitle className="text-base">Senaste körningar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(d?.runs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Inga körningar ännu. Skapa ett varumärke och starta din första analys.
                  </p>
                ) : (
                  (d?.runs ?? []).map((run) => {
                    const metrics = (run.metrics ?? {}) as Record<string, number>;
                    return (
                      <Link
                        key={run.id}
                        to="/korning/$runId"
                        params={{ runId: run.id }}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{brandName(run.brand_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.model_label} ·{" "}
                            {new Date(run.started_at).toLocaleDateString("sv-SE")} ·{" "}
                            {run.total_prompts} prompter
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Synlighet {pct(metrics["visibility_rate"])}
                          </span>
                          <ModeBadge mode={run.mode} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="card-soft">
              <CardHeader>
                <CardTitle className="text-base">Varumärken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(d?.brands ?? []).map((brand) => (
                  <Link
                    key={brand.id}
                    to="/varumarke/$brandId"
                    params={{ brandId: brand.id }}
                    className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="truncate">
                      {brand.name}
                      {brand.domain ? (
                        <span className="ml-2 text-xs text-muted-foreground">{brand.domain}</span>
                      ) : null}
                    </span>
                    {brand.is_demo ? (
                      <Badge className="border-transparent bg-demo text-demo-foreground">DEMO</Badge>
                    ) : null}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
