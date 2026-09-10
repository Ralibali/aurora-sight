import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSharedReport } from "@/lib/report.functions";
import { CLASSIFICATION_LABELS, type Classification } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Sparkles } from "lucide-react";

export const Route = createFileRoute("/rapport/$token")({
  head: () => ({
    meta: [
      { title: "AI-synlighetsrapport – Aurora GEO" },
      {
        name: "description",
        content: "Delad AI-synlighetsrapport från Aurora GEO med evidens och prioriterade åtgärder.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "AI-synlighetsrapport – Aurora GEO" },
      { property: "og:description", content: "Delad rapport från Aurora GEO." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharedReportPage,
});

const pct = (v: number | undefined) =>
  v === undefined || Number.isNaN(v) ? "–" : `${Math.round(v * 100)} %`;

function SharedReportPage() {
  const { token } = Route.useParams();
  const q = useQuery({
    queryKey: ["shared-report", token],
    queryFn: () => getSharedReport({ data: { token } }),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Rapporten är inte tillgänglig</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Länken kan ha stängts av eller vara felaktig. Kontakta din kontaktperson på Aurora Media
            AB.
          </p>
        </div>
      </div>
    );
  }

  const { report, brand, run, results, actions, citations } = q.data;
  const metrics = (run?.metrics ?? {}) as Record<string, number>;
  const strongest = results.filter(
    (r) => r.classification === "RECOMMENDED" || r.classification === "CITED",
  );
  const weakest = results.filter((r) => r.classification === "ABSENT");
  const competitorTotals = new Map<string, number>();
  for (const r of results) {
    for (const m of (r.competitor_mentions as { name: string; count: number }[] | null) ?? []) {
      competitorTotals.set(m.name, (competitorTotals.get(m.name) ?? 0) + m.count);
    }
  }
  const topCompetitors = Array.from(competitorTotals.entries()).sort((a, b) => b[1] - a[1]);
  const isDemo = run?.mode === "demo";

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border/60 bg-background print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display font-semibold">Aurora GEO</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" aria-hidden /> Skriv ut / PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <section>
          {isDemo ? (
            <div className="mb-4 rounded-lg border border-demo/50 bg-demo/15 px-4 py-3 text-sm">
              <strong>DEMO-rapport.</strong> Innehållet bygger på seedad exempeldata och är inte en
              genomförd analys.
            </div>
          ) : null}
          <h1 className="font-display text-3xl font-semibold">{report.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {brand?.name}
            {brand?.domain ? ` · ${brand.domain}` : ""} · Modell: {run?.model_label} ·{" "}
            {run?.search_mode === "native_search" ? "med webbsökning" : "utan webbsökning"} ·{" "}
            {run ? new Date(run.started_at).toLocaleDateString("sv-SE") : ""}
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Sammanfattning</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Synlighetsgrad", value: pct(metrics["visibility_rate"]) },
              { label: "Rekommendationsgrad", value: pct(metrics["recommendation_rate"]) },
              { label: "Citeringsgrad", value: pct(metrics["citation_rate"]) },
              { label: "Antal prompter", value: String(results.length) },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border/70 bg-background p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{m.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Varje siffra bygger på sparade modellsvar. Klassificeringen sker med samma regler för
            alla prompter: {Object.values(CLASSIFICATION_LABELS).join(", ")}.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Starkaste köpfrågor</h2>
          {strongest.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Varumärket rekommenderades eller citerades inte i någon prompt i denna körning.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {strongest.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-4 py-3 text-sm"
                >
                  <span>{r.prompt_text}</span>
                  <Badge variant="secondary">
                    {CLASSIFICATION_LABELS[r.classification as Classification]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Svagaste köpfrågor</h2>
          {weakest.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Varumärket nämndes i samtliga prompter.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {weakest.slice(0, 10).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/70 bg-background px-4 py-3 text-sm"
                >
                  <p>{r.prompt_text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.classification_reason ?? "Ingen träff på varumärkesnamnet i svaret."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Konkurrenter som nämns i stället</h2>
          {topCompetitors.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Inga konkurrentomnämnanden registrerades.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topCompetitors.map(([name, count]) => (
                <li
                  key={name}
                  className="flex justify-between rounded-lg border border-border/70 bg-background px-4 py-3 text-sm"
                >
                  <span>{name}</span>
                  <span className="text-muted-foreground">{count} omnämnanden</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Prioriterade åtgärder</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Åtgärderna är hypoteser kopplade till de svar som redovisas ovan. De är inte garanterade
            placeringsförbättringar.
          </p>
          {actions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Inga åtgärder registrerade ännu.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {actions.map((a) => (
                <li key={a.id} className="rounded-lg border border-border/70 bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="secondary">Prio {a.priority}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.rationale}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {citations.length > 0 ? (
          <section>
            <h2 className="font-display text-xl font-semibold">Källor i modellsvaren</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {citations.slice(0, 30).map((c) => (
                <li key={c.id}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline underline-offset-2"
                  >
                    {c.domain ?? c.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-border/70 bg-background p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Nästa kontroll</h2>
          <p className="mt-1 text-muted-foreground">
            Vi rekommenderar en ny mätning om 30 dagar med samma varumärke, promptgrupp, modell och
            sökläge. Endast då är siffrorna jämförbara över tid.
          </p>
        </section>

        <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Aurora GEO av Aurora Media AB. Resultaten kommer från modell-API:er vid angiven tidpunkt.
          AI-svar varierar över tid och mellan användare – rapporten är ett stickprov med sparad
          evidens, inte en garanti.
        </footer>
      </main>
    </div>
  );
}
