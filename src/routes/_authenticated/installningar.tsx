import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getProviderStatus } from "@/lib/audit.functions";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/installningar")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [prices, setPrices] = useState<Record<string, string>>({});

  const status = useQuery({ queryKey: ["provider-status"], queryFn: () => getProviderStatus() });

  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const [providers, plans, subs, roles] = await Promise.all([
        supabase.from("provider_configs").select("*").order("model_label"),
        supabase.from("pricing_plans").select("*").order("sort_order"),
        supabase.from("subscriptions").select("*"),
        supabase.from("user_roles").select("role"),
      ]);
      return {
        providers: providers.data ?? [],
        plans: plans.data ?? [],
        subs: subs.data ?? [],
        isAdmin: (roles.data ?? []).some((r) => r.role === "aurora_admin"),
      };
    },
  });

  const toggleProvider = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("provider_configs").update({ enabled }).eq("id", id);
      if (error) throw new Error("Modellen kunde inte uppdateras.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const savePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("pricing_plans")
        .update({ price_sek: price })
        .eq("id", id);
      if (error) throw new Error("Priset kunde inte sparas. Kräver Aurora-administratör.");
    },
    onSuccess: () => {
      toast.success("Priset är uppdaterat.");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Inställningar"
      description="Modeller, priser, abonnemang och nyckelstatus."
    >
      <div className="space-y-6">
        <Card className="card-soft">
          <CardHeader>
            <CardTitle className="text-base">Modellnyckel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {status.isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : status.data?.liveEnabled ? (
              <div>
                <Badge className="mr-2 border-transparent bg-rec text-rec-foreground">LIVE</Badge>
                OPENROUTER_API_KEY är konfigurerad. Riktiga analyser kan köras.
              </div>
            ) : (
              <div>
                <Badge className="mr-2 border-transparent bg-demo text-demo-foreground">DEMO</Badge>
                Ingen nyckel hittad. Lägg till <code>OPENROUTER_API_KEY</code> under
                Projektinställningar → Secrets. Nyckeln lagras endast på servern och visas aldrig i
                gränssnittet eller i databasen.
              </div>
            )}

          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardHeader>
            <CardTitle className="text-base">Modeller</CardTitle>
            <p className="text-sm text-muted-foreground">
              Endast aktiverade modeller kan väljas i en körning.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(q.data?.providers ?? []).map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{p.model_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.provider} · {p.model_id}
                    {p.supports_native_search ? " · stödjer webbsök" : ""}
                  </p>
                </div>
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(enabled) => toggleProvider.mutate({ id: p.id, enabled })}
                  aria-label={`Aktivera ${p.model_label}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardHeader>
            <CardTitle className="text-base">Priser</CardTitle>
            <p className="text-sm text-muted-foreground">
              {q.data?.isAdmin
                ? "Priserna visas direkt på den publika prissidan."
                : "Endast Aurora-administratörer kan ändra priser."}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(q.data?.plans ?? []).map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.is_contact
                      ? "Offert"
                      : `${Number(plan.price_sek).toLocaleString("sv-SE")} kr / ${
                          plan.interval === "once" ? "engång" : "mån"
                        }`}
                  </p>
                </div>
                {!plan.is_contact && q.data?.isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`price-${plan.id}`} className="sr-only">
                      Pris för {plan.name}
                    </Label>
                    <Input
                      id={`price-${plan.id}`}
                      className="w-32"
                      inputMode="numeric"
                      value={prices[plan.id] ?? String(plan.price_sek)}
                      onChange={(e) =>
                        setPrices((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        savePrice.mutate({
                          id: plan.id,
                          price: Number(prices[plan.id] ?? plan.price_sek),
                        })
                      }
                      disabled={savePrice.isPending}
                    >
                      Spara
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardHeader>
            <CardTitle className="text-base">Abonnemang och fakturering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(q.data?.subs ?? []).length === 0 ? (
              <p className="text-muted-foreground">Inga abonnemang registrerade.</p>
            ) : (
              (q.data?.subs ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3"
                >
                  <span>{s.plan_key}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {Number(s.mrr_sek).toLocaleString("sv-SE")} kr/mån
                    <Badge
                      className={
                        s.status === "active"
                          ? "border-transparent bg-rec text-rec-foreground"
                          : "border-transparent bg-demo text-demo-foreground"
                      }
                    >
                      {s.status}
                    </Badge>
                  </span>
                </div>
              ))
            )}
            <p className="text-muted-foreground">
              Stripe-koppling är förberedd i datamodellen (kund- och prenumerations-id) men ingen
              betalning kan genomföras förrän riktiga Stripe-nycklar lagts in. Inga betalningar
              simuleras.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
