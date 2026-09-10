import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateFindings, setReportSharing } from "@/lib/audit.functions";
import { AppShell } from "@/components/app/app-shell";
import { ClassificationBadge, DemoNotice, ModeBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASSIFICATION_LABELS, INTENT_LABELS, type Classification, type Intent } from "@/lib/geo";
import { ExternalLink, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/korning/$runId")({
  component: RunPage,
});

const pct = (v: number | undefined) =>
  v === undefined || Number.isNaN(v) ? "–" : `${Math.round(v * 100)} %`;

function RunPage() {
  const { runId } = Route.useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | Classification>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["run", runId],
    queryFn: async () => {
      const { data: run } = await supabase.from("audit_runs").select("*").eq("id", runId).single();
      const [results, brand, findings, report] = await Promise.all([
        supabase
          .from("audit_results")
          .select("*")
          .eq("run_id", runId)
          .order("created_at", { ascending: true }),
        run
          ? supabase.from("brands").select("id, name, domain, is_demo").eq("id", run.brand_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("findings").select("*").eq("run_id", runId),
        supabase
          .from("reports")
          .select("id, title, is_shared, share_token")
          .eq("run_id", runId)
          .maybeSingle(),
      ]);
      const resultIds = (results.data ?? []).map((r) => r.id);
      const citations = resultIds.length
        ? ((await supabase.from("citations").select("*").in("result_id", resultIds)).data ?? [])
        : [];
      return {
        run,
        results: results.data ?? [],
        brand: brand.data,
        findings: findings.data ?? [],
        report: report.data,
        citations,
      };
    },
  });

  const findingsMutation = useMutation({
    mutationFn: () => generateFindings({ data: { runId } }),
    onSuccess: (r) => {
      toast.success(`${r.findings} insikter skapade.`);
      qc.invalidateQueries({ queryKey: ["run", runId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createReport = useMutation({
    mutationFn: async () => {
      const run = q.data?.run;
      const brand = q.data?.brand;
      if (!run || !brand) throw new Error("Körningen saknas.");
      const { data, error } = await supabase
        .from("reports")
        .insert({
          org_id: run.org_id,
          brand_id: run.brand_id,
          run_id: run.id,
          title: `${run.mode === "demo" ? "DEMO – " : ""}AI-synlighetsrapport ${brand.name}`,
          summary: `Rapport baserad på ${run.total_prompts} prompter mot ${run.model_label}.`,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Rapporten kunde inte skapas.");
      return data.id as string;
    },
    onSuccess: () => {
      toast.success("Rapport skapad.");
      qc.invalidateQueries({ queryKey: ["run", runId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const share = useMutation({
    mutationFn: async (value: boolean) => {
      const report = q.data?.report;
      if (!report) throw new Error("Ingen rapport att dela.");
      await setReportSharing({ data: { reportId: report.id, share: value } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run", runId] });
      toast.success("Delningsstatus uppdaterad.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <AppShell title="Körning">
        <Skeleton className="h-64 rounded-xl" />
      </AppShell>
    );
  }

  const run = q.data?.run;
  if (!run) {
    return (
      <AppShell title="Körning">
        <p className="text-sm text-muted-foreground">Körningen hittades inte.</p>
      </AppShell>
    );
  }

  const metrics = (run.metrics ?? {}) as Record<string, number>;
  const results = (q.data?.results ?? []).filter(
    (r) => filter === "ALL" || r.classification === filter,
  );

  return (
    <AppShell
      title={`${q.data?.brand?.name ?? "Körning"} – ${run.label ?? "analys"}`}
      description={`${run.model_label} · ${
        run.search_mode === "native_search" ? "med webbsök" : "utan webbsök"
      } · ${new Date(run.started_at).toLocaleString("sv-SE")}`}
      actions={
        <div className="flex items-center gap-2">
          <ModeBadge mode={run.mode} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/varumarke/$brandId" params={{ brandId: run.brand_id }}>
              Till varumärket
            </Link>
          </Button>
        </div>
      }
    >
      {run.mode === "demo" ? (
        <div className="mb-6">
          <DemoNotice />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Synlighetsgrad", value: pct(metrics["visibility_rate"]) },
          { label: "Rekommendationsgrad", value: pct(metrics["recommendation_rate"]) },
          { label: "Citeringsgrad", value: pct(metrics["citation_rate"]) },
          { label: "Prompter", value: `${run.completed_prompts}/${run.total_prompts}` },
          {
            label: "Uppskattad kostnad",
            value: `${Number(run.cost_estimate_usd).toFixed(4)} USD`,
          },
        ].map((m) => (
          <Card key={m.label} className="card-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-semibold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {run.failed_prompts > 0 ? (
        <p className="mt-4 text-sm text-destructive">
          {run.failed_prompts} prompter misslyckades. Felen visas per rad nedan.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as "ALL" | Classification)}>
          <SelectTrigger className="w-56" aria-label="Filtrera klassificering">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alla resultat</SelectItem>
            {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => findingsMutation.mutate()}
          disabled={findingsMutation.isPending}
        >
          {findingsMutation.isPending ? "Analyserar …" : "Skapa insikter"}
        </Button>

        {q.data?.report ? (
          <>
            <Button variant="outline" asChild>
              <Link to="/rapport/$token" params={{ token: q.data.report.share_token ?? "" }}>
                <FileText className="mr-2 h-4 w-4" aria-hidden /> Öppna rapport
              </Link>
            </Button>
            <Button
              variant={q.data.report.is_shared ? "secondary" : "default"}
              onClick={() => share.mutate(!q.data?.report?.is_shared)}
              disabled={share.isPending}
            >
              {q.data.report.is_shared ? "Sluta dela" : "Dela med kund"}
            </Button>
          </>
        ) : (
          <Button onClick={() => createReport.mutate()} disabled={createReport.isPending}>
            Skapa kundrapport
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {results.length === 0 ? (
          <Card className="card-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Inga resultat matchar filtret.
            </CardContent>
          </Card>
        ) : (
          results.map((r) => {
            const citations = (q.data?.citations ?? []).filter((c) => c.result_id === r.id);
            const open = openId === r.id;
            return (
              <Card key={r.id} className="card-soft">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.prompt_text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {INTENT_LABELS[r.intent as Intent]} · {r.tokens_in + r.tokens_out} tokens
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClassificationBadge value={r.classification as Classification} />
                      <Button variant="ghost" size="sm" onClick={() => setOpenId(open ? null : r.id)}>
                        {open ? "Dölj evidens" : "Visa evidens"}
                      </Button>
                    </div>
                  </div>

                  {r.error ? (
                    <p className="mt-3 text-sm text-destructive">Fel: {r.error}</p>
                  ) : null}

                  {open ? (
                    <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Klassificeringsgrund
                        </p>
                        <p className="mt-1 text-sm">{r.classification_reason ?? "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Råsvar från modellen
                        </p>
                        <pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                          {r.raw_answer ?? "Inget svar sparat."}
                        </pre>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(
                          (r.competitor_mentions as { name: string; count: number }[] | null) ?? []
                        ).map((m) => (
                          <Badge key={m.name} variant="secondary">
                            {m.name}: {m.count}
                          </Badge>
                        ))}
                      </div>
                      {citations.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Källor i svaret
                          </p>
                          <ul className="mt-1 space-y-1 text-sm">
                            {citations.map((c) => (
                              <li key={c.id}>
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                                >
                                  {c.domain ?? c.url}
                                  <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                                {c.is_brand_domain ? (
                                  <Badge className="ml-2 border-transparent bg-cited text-cited-foreground">
                                    Egen domän
                                  </Badge>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
