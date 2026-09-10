import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getProviderStatus, startAuditRun, generateFindings } from "@/lib/audit.functions";
import { AppShell } from "@/components/app/app-shell";
import { ModeBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  INTENT_LABELS,
  MAX_PROMPTS_PER_RUN,
  comparabilityIssues,
  type Intent,
} from "@/lib/geo";
import { AlertTriangle, ArrowRight, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/varumarke/$brandId")({
  component: BrandPage,
});

const pct = (v: number | undefined) =>
  v === undefined || Number.isNaN(v) ? "–" : `${Math.round(v * 100)} %`;

function BrandPage() {
  const { brandId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmRun, setConfirmRun] = useState(false);
  const [runConfig, setRunConfig] = useState({
    promptSetId: "",
    providerConfigId: "",
    searchMode: "offline" as "offline" | "native_search",
    label: "",
  });
  const [newPrompt, setNewPrompt] = useState({ text: "", intent: "discovery" as Intent, setId: "" });
  const [newCompetitor, setNewCompetitor] = useState("");

  const providerStatus = useQuery({
    queryKey: ["provider-status"],
    queryFn: () => getProviderStatus(),
  });

  const q = useQuery({
    queryKey: ["brand", brandId],
    queryFn: async () => {
      const [brand, sets, competitors, runs, providers, actions, reports] = await Promise.all([
        supabase.from("brands").select("*").eq("id", brandId).single(),
        supabase.from("prompt_sets").select("id, name, description").eq("brand_id", brandId),
        supabase.from("competitors").select("id, name, domain").eq("brand_id", brandId),
        supabase
          .from("audit_runs")
          .select("*")
          .eq("brand_id", brandId)
          .order("started_at", { ascending: false }),
        supabase.from("provider_configs").select("*").eq("enabled", true),
        supabase
          .from("actions")
          .select("id, title, category, rationale, priority, status, finding_id")
          .eq("brand_id", brandId)
          .order("priority"),
        supabase
          .from("reports")
          .select("id, title, run_id, is_shared, share_token, created_at")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false }),
      ]);
      const setIds = (sets.data ?? []).map((s) => s.id);
      const prompts = setIds.length
        ? ((
            await supabase
              .from("prompts")
              .select("id, prompt_set_id, text, intent, enabled")
              .in("prompt_set_id", setIds)
          ).data ?? [])
        : [];
      return {
        brand: brand.data,
        sets: sets.data ?? [],
        prompts,
        competitors: competitors.data ?? [],
        runs: runs.data ?? [],
        providers: providers.data ?? [],
        actions: actions.data ?? [],
        reports: reports.data ?? [],
      };
    },
  });

  const brand = q.data?.brand;
  const latest = q.data?.runs[0];
  const previous = q.data?.runs[1];
  const metrics = (latest?.metrics ?? {}) as Record<string, number>;
  const prevMetrics = (previous?.metrics ?? {}) as Record<string, number>;
  const compareIssues =
    latest && previous
      ? comparabilityIssues(
          {
            brandId: latest.brand_id,
            promptSetId: latest.prompt_set_id,
            modelId: latest.model_id,
            provider: latest.provider,
            searchMode: latest.search_mode,
            mode: latest.mode,
          },
          {
            brandId: previous.brand_id,
            promptSetId: previous.prompt_set_id,
            modelId: previous.model_id,
            provider: previous.provider,
            searchMode: previous.search_mode,
            mode: previous.mode,
          },
        )
      : [];

  const selectedSetPrompts = (q.data?.prompts ?? []).filter(
    (p) => p.prompt_set_id === runConfig.promptSetId && p.enabled,
  );

  const run = useMutation({
    mutationFn: () =>
      startAuditRun({
        data: {
          brandId,
          promptSetId: runConfig.promptSetId,
          providerConfigId: runConfig.providerConfigId,
          searchMode: runConfig.searchMode,
          label: runConfig.label || undefined,
        },
      }),
    onSuccess: (result) => {
      toast.success(`Körningen är klar: ${result.completed} lyckade, ${result.failed} fel.`);
      qc.invalidateQueries({ queryKey: ["brand", brandId] });
      navigate({ to: "/korning/$runId", params: { runId: result.runId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const findings = useMutation({
    mutationFn: (runId: string) => generateFindings({ data: { runId } }),
    onSuccess: (r) => {
      toast.success(`${r.findings} insikter skapade med länkad evidens.`);
      qc.invalidateQueries({ queryKey: ["brand", brandId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPrompt = useMutation({
    mutationFn: async () => {
      if (!brand) throw new Error("Varumärket saknas.");
      if (!newPrompt.setId) throw new Error("Välj en promptgrupp.");
      const { error } = await supabase.from("prompts").insert({
        org_id: brand.org_id,
        prompt_set_id: newPrompt.setId,
        text: newPrompt.text.trim(),
        intent: newPrompt.intent,
        language: brand.language,
      });
      if (error) throw new Error("Prompten kunde inte sparas.");
    },
    onSuccess: () => {
      setNewPrompt((p) => ({ ...p, text: "" }));
      qc.invalidateQueries({ queryKey: ["brand", brandId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCompetitor = useMutation({
    mutationFn: async () => {
      if (!brand) throw new Error("Varumärket saknas.");
      const { error } = await supabase
        .from("competitors")
        .insert({ org_id: brand.org_id, brand_id: brandId, name: newCompetitor.trim() });
      if (error) throw new Error("Konkurrenten kunde inte sparas.");
    },
    onSuccess: () => {
      setNewCompetitor("");
      qc.invalidateQueries({ queryKey: ["brand", brandId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCompetitor = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("competitors").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand", brandId] }),
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("actions").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand", brandId] }),
  });

  if (q.isLoading) {
    return (
      <AppShell title="Varumärke">
        <Skeleton className="h-64 rounded-xl" />
      </AppShell>
    );
  }
  if (!brand) {
    return (
      <AppShell title="Varumärke">
        <p className="text-sm text-muted-foreground">Varumärket hittades inte.</p>
      </AppShell>
    );
  }

  const liveEnabled = providerStatus.data?.liveEnabled;

  return (
    <AppShell
      title={brand.name}
      description={`${brand.domain ?? "Ingen domän"} · ${brand.country} · ${brand.language}`}
      actions={brand.is_demo ? <ModeBadge mode="demo" /> : <ModeBadge mode="live" />}
    >
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="prompts">Prompter</TabsTrigger>
          <TabsTrigger value="competitors">Konkurrenter</TabsTrigger>
          <TabsTrigger value="run">Ny körning</TabsTrigger>
          <TabsTrigger value="actions">Åtgärder</TabsTrigger>
          <TabsTrigger value="reports">Rapporter</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {!latest ? (
            <Card className="card-soft">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Ingen körning ännu. Gå till “Ny körning” för att mäta AI-synligheten.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <ModeBadge mode={latest.mode} />
                <span className="text-sm text-muted-foreground">
                  {latest.model_label} ·{" "}
                  {latest.search_mode === "native_search" ? "med webbsök" : "utan webbsök"} ·{" "}
                  {new Date(latest.started_at).toLocaleString("sv-SE")}
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/korning/$runId" params={{ runId: latest.id }}>
                    Öppna evidens <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Synlighetsgrad", key: "visibility_rate" },
                  { label: "Rekommendationsgrad", key: "recommendation_rate" },
                  { label: "Citeringsgrad", key: "citation_rate" },
                  { label: "Frånvarande", key: "absent_rate" },
                ].map((m) => {
                  const now = metrics[m.key];
                  const before = prevMetrics[m.key];
                  const delta =
                    now !== undefined && before !== undefined && compareIssues.length === 0
                      ? Math.round((now - before) * 100)
                      : null;
                  return (
                    <Card key={m.key} className="card-soft">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {m.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-display text-3xl font-semibold">{pct(now)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {delta === null
                            ? "Ingen jämförbar tidigare körning"
                            : `${delta > 0 ? "+" : ""}${delta} p.e. mot föregående`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {previous && compareIssues.length > 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-mentioned/50 bg-mentioned/15 px-4 py-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-medium">Körningarna är inte jämförbara.</p>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {compareIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <Card className="card-soft">
                <CardHeader>
                  <CardTitle className="text-base">Konkurrenters andel av omnämnanden</CardTitle>
                </CardHeader>
                <CardContent>
                  <CompetitorShare runId={latest.id} brandName={brand.name} />
                </CardContent>
              </Card>

              <Card className="card-soft">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Alla körningar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(q.data?.runs ?? []).map((r) => (
                    <Link
                      key={r.id}
                      to="/korning/$runId"
                      params={{ runId: r.id }}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-4 py-3 text-sm hover:bg-muted/60"
                    >
                      <span>
                        {r.label ?? "Körning"} · {r.model_label}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {new Date(r.started_at).toLocaleDateString("sv-SE")} · {r.status} ·{" "}
                        {r.total_prompts} prompter
                        <ModeBadge mode={r.mode} />
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="mt-6 space-y-6">
          {(q.data?.sets ?? []).map((set) => {
            const promptsInSet = (q.data?.prompts ?? []).filter((p) => p.prompt_set_id === set.id);
            return (
              <Card key={set.id} className="card-soft">
                <CardHeader>
                  <CardTitle className="text-base">{set.name}</CardTitle>
                  {set.description ? (
                    <p className="text-sm text-muted-foreground">{set.description}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-2">
                  {promptsInSet.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Inga prompter i gruppen ännu.</p>
                  ) : (
                    promptsInSet.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-4 py-2.5 text-sm"
                      >
                        <span>{p.text}</span>
                        <Badge variant="secondary">{INTENT_LABELS[p.intent as Intent]}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="card-soft">
            <CardHeader>
              <CardTitle className="text-base">Lägg till prompt</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Input
                value={newPrompt.text}
                onChange={(e) => setNewPrompt((p) => ({ ...p, text: e.target.value }))}
                placeholder="T.ex. bästa leverantören av … i Sverige"
                aria-label="Promptext"
              />
              <Select
                value={newPrompt.setId}
                onValueChange={(v) => setNewPrompt((p) => ({ ...p, setId: v }))}
              >
                <SelectTrigger aria-label="Promptgrupp">
                  <SelectValue placeholder="Grupp" />
                </SelectTrigger>
                <SelectContent>
                  {(q.data?.sets ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={newPrompt.intent}
                onValueChange={(v) => setNewPrompt((p) => ({ ...p, intent: v as Intent }))}
              >
                <SelectTrigger aria-label="Intention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => addPrompt.mutate()}
                disabled={!newPrompt.text.trim() || addPrompt.isPending}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <Card className="card-soft">
            <CardHeader>
              <CardTitle className="text-base">Konkurrenter</CardTitle>
              <p className="text-sm text-muted-foreground">
                Endast exakta namnträffar räknas – vi gissar aldrig.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(q.data?.competitors ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-2.5 text-sm"
                >
                  <span>
                    {c.name}
                    {c.domain ? (
                      <span className="ml-2 text-xs text-muted-foreground">{c.domain}</span>
                    ) : null}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompetitor.mutate(c.id)}
                    aria-label={`Ta bort ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Namn på konkurrent"
                  aria-label="Ny konkurrent"
                />
                <Button
                  onClick={() => addCompetitor.mutate()}
                  disabled={!newCompetitor.trim() || addCompetitor.isPending}
                >
                  Lägg till
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="run" className="mt-6">
          <Card className="card-soft max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Starta analys</CardTitle>
              <p className="text-sm text-muted-foreground">
                Varje prompt skickas separat till vald modell. Råsvar och citat sparas som evidens.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!liveEnabled ? (
                <div className="rounded-lg border border-demo/50 bg-demo/15 px-4 py-3 text-sm">
                  Live-analys kräver <code>OPENROUTER_API_KEY</code> i serverns miljö. Utan nyckel
                  kan endast demodata visas – ingen körning startas.
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Promptgrupp</Label>
                <Select
                  value={runConfig.promptSetId}
                  onValueChange={(v) => setRunConfig((c) => ({ ...c, promptSetId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj promptgrupp" />
                  </SelectTrigger>
                  <SelectContent>
                    {(q.data?.sets ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modell</Label>
                <Select
                  value={runConfig.providerConfigId}
                  onValueChange={(v) => setRunConfig((c) => ({ ...c, providerConfigId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj modell" />
                  </SelectTrigger>
                  <SelectContent>
                    {(q.data?.providers ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.model_label}
                        {p.supports_native_search ? " (stödjer webbsök)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sökläge</Label>
                <Select
                  value={runConfig.searchMode}
                  onValueChange={(v) =>
                    setRunConfig((c) => ({ ...c, searchMode: v as "offline" | "native_search" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Utan webbsök (modellens egen kunskap)</SelectItem>
                    <SelectItem value="native_search">
                      Med leverantörens egen webbsökning
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="run-label">Etikett (valfritt)</Label>
                <Input
                  id="run-label"
                  value={runConfig.label}
                  onChange={(e) => setRunConfig((c) => ({ ...c, label: e.target.value }))}
                  placeholder="T.ex. Baslinje mars"
                />
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm">
                <p>
                  {selectedSetPrompts.length} prompter valda. Max {MAX_PROMPTS_PER_RUN} per körning.
                </p>
                <p className="text-muted-foreground">
                  Uppskattad kostnad visas per körning efteråt, baserat på faktisk tokenförbrukning.
                </p>
              </div>

              <Button
                className="w-full"
                disabled={
                  !liveEnabled ||
                  !runConfig.promptSetId ||
                  !runConfig.providerConfigId ||
                  selectedSetPrompts.length === 0 ||
                  run.isPending
                }
                onClick={() => setConfirmRun(true)}
              >
                {run.isPending ? "Kör analys …" : "Starta live-analys"}
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bekräfta live-körning</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedSetPrompts.length} prompter skickas till modellen. Detta kostar pengar hos
                  leverantören. Vill du fortsätta?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={() => run.mutate()}>Kör analys</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="actions" className="mt-6 space-y-4">
          {latest ? (
            <Button
              variant="outline"
              onClick={() => findings.mutate(latest.id)}
              disabled={findings.isPending}
            >
              {findings.isPending ? "Analyserar …" : "Skapa insikter från senaste körningen"}
            </Button>
          ) : null}
          {(q.data?.actions ?? []).length === 0 ? (
            <Card className="card-soft">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Inga åtgärder ännu. Åtgärder skapas alltid från verkliga resultat i en körning.
              </CardContent>
            </Card>
          ) : (
            (q.data?.actions ?? []).map((a) => (
              <Card key={a.id} className="card-soft">
                <CardContent className="flex flex-wrap items-start justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.title}</p>
                      <Badge variant="secondary">Prio {a.priority}</Badge>
                      <Badge variant="outline">{a.category}</Badge>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{a.rationale}</p>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={(status) => updateAction.mutate({ id: a.id, status })}
                  >
                    <SelectTrigger className="w-40" aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Öppen</SelectItem>
                      <SelectItem value="in_progress">Pågår</SelectItem>
                      <SelectItem value="done">Klar</SelectItem>
                      <SelectItem value="dismissed">Avfärdad</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-3">
          {(q.data?.reports ?? []).length === 0 ? (
            <Card className="card-soft">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Inga rapporter ännu. Skapa en rapport från en körning.
              </CardContent>
            </Card>
          ) : (
            (q.data?.reports ?? []).map((r) => (
              <Card key={r.id} className="card-soft">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("sv-SE")} ·{" "}
                      {r.is_shared ? "Delad via länk" : "Ej delad"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.run_id ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/korning/$runId" params={{ runId: r.run_id }}>
                          Öppna körning
                        </Link>
                      </Button>
                    ) : null}
                    {r.is_shared && r.share_token ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/rapport/$token" params={{ token: r.share_token }}>
                          Visa delad rapport
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function CompetitorShare({ runId, brandName }: { runId: string; brandName: string }) {
  const q = useQuery({
    queryKey: ["competitor-share", runId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_results")
        .select("classification, competitor_mentions")
        .eq("run_id", runId);
      const totals = new Map<string, number>();
      let brandTotal = 0;
      for (const row of data ?? []) {
        if (row.classification !== "ABSENT") brandTotal += 1;
        for (const m of (row.competitor_mentions as { name: string; count: number }[] | null) ??
          []) {
          totals.set(m.name, (totals.get(m.name) ?? 0) + m.count);
        }
      }
      return { brandTotal, totals: Array.from(totals.entries()).sort((a, b) => b[1] - a[1]) };
    },
  });

  if (q.isLoading) return <Skeleton className="h-24 rounded-lg" />;
  const rows = [
    { name: `${brandName} (egna svar)`, count: q.data?.brandTotal ?? 0, own: true },
    ...(q.data?.totals ?? []).map(([name, count]) => ({ name, count, own: false })),
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex justify-between text-sm">
            <span className={r.own ? "font-medium" : ""}>{r.name}</span>
            <span className="text-muted-foreground">{r.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div
              className={`h-2 rounded-full ${r.own ? "bg-primary" : "bg-accent"}`}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
