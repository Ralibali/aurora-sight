import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTENT_LABELS, type Intent } from "@/lib/geo";
import { Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/klienter")({
  component: ClientsPage,
});

type WizardState = {
  clientName: string;
  brandName: string;
  domain: string;
  country: string;
  language: string;
  description: string;
  products: string;
  aliases: string;
  competitors: string;
  prompts: string;
  intent: Intent;
};

const emptyWizard: WizardState = {
  clientName: "",
  brandName: "",
  domain: "",
  country: "SE",
  language: "sv",
  description: "",
  products: "",
  aliases: "",
  competitors: "",
  prompts: "",
  intent: "discovery",
};

function ClientsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(emptyWizard);

  const data = useQuery({
    queryKey: ["clients-brands"],
    queryFn: async () => {
      const [clients, brands, profile] = await Promise.all([
        supabase.from("clients").select("id, name, contact_email, is_demo, notes"),
        supabase.from("brands").select("id, client_id, name, domain, is_demo, country"),
        supabase.from("profiles").select("org_id").maybeSingle(),
      ]);
      return {
        clients: clients.data ?? [],
        brands: brands.data ?? [],
        orgId: profile.data?.org_id as string | undefined,
      };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const orgId = data.data?.orgId;
      if (!orgId) throw new Error("Din profil saknar organisation.");
      if (form.brandName.trim().length < 2) throw new Error("Ange ett varumärkesnamn.");

      let clientId: string | null = null;
      if (form.clientName.trim()) {
        const { data: client, error } = await supabase
          .from("clients")
          .insert({ org_id: orgId, name: form.clientName.trim() })
          .select("id")
          .single();
        if (error) throw new Error("Kunden kunde inte skapas.");
        clientId = client.id;
      }

      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .insert({
          org_id: orgId,
          client_id: clientId,
          name: form.brandName.trim(),
          domain: form.domain.trim() || null,
          country: form.country,
          language: form.language,
          description: form.description.trim() || null,
          products: form.products.trim() || null,
          aliases: form.aliases
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        })
        .select("id")
        .single();
      if (brandError || !brand) throw new Error("Varumärket kunde inte skapas.");

      const competitors = form.competitors
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);
      if (competitors.length > 0) {
        await supabase
          .from("competitors")
          .insert(competitors.map((name) => ({ org_id: orgId, brand_id: brand.id, name })));
      }

      const prompts = form.prompts
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);
      if (prompts.length > 0) {
        const { data: set } = await supabase
          .from("prompt_sets")
          .insert({
            org_id: orgId,
            brand_id: brand.id,
            name: "Köpintentioner",
            description: "Skapat i onboarding-guiden",
          })
          .select("id")
          .single();
        if (set) {
          await supabase.from("prompts").insert(
            prompts.map((text) => ({
              org_id: orgId,
              prompt_set_id: set.id,
              text,
              intent: form.intent,
              language: form.language,
            })),
          );
        }
      }

      return brand.id as string;
    },
    onSuccess: (brandId) => {
      toast.success("Varumärket är skapat.");
      setOpen(false);
      setStep(1);
      setForm(emptyWizard);
      queryClient.invalidateQueries({ queryKey: ["clients-brands"] });
      navigate({ to: "/varumarke/$brandId", params: { brandId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = (key: keyof WizardState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }) as WizardState);

  return (
    <AppShell
      title="Klienter & varumärken"
      description="Hantera kunder, varumärken och deras köpprompter."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Nytt varumärke
        </Button>
      }
    >
      {data.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (data.data?.brands.length ?? 0) === 0 ? (
        <Card className="card-soft">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium">Inga varumärken ännu</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Skapa ditt första varumärke för att kunna köra en AI-synlighetsanalys.
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>Skapa varumärke</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(data.data?.clients ?? []).map((client) => (
            <Card key={client.id} className="card-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  {client.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{client.notes}</p>
                  ) : null}
                </div>
                {client.is_demo ? (
                  <Badge className="border-transparent bg-demo text-demo-foreground">DEMO</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.data?.brands ?? [])
                  .filter((b) => b.client_id === client.id)
                  .map((brand) => (
                    <Link
                      key={brand.id}
                      to="/varumarke/$brandId"
                      params={{ brandId: brand.id }}
                      className="rounded-lg border border-border/70 p-4 transition-colors hover:bg-muted/60"
                    >
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {brand.domain ?? "Ingen domän angiven"} · {brand.country}
                      </p>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          ))}

          {(data.data?.brands ?? []).filter((b) => !b.client_id).length > 0 ? (
            <Card className="card-soft">
              <CardHeader>
                <CardTitle className="text-base">Utan kundkoppling</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.data?.brands ?? [])
                  .filter((b) => !b.client_id)
                  .map((brand) => (
                    <Link
                      key={brand.id}
                      to="/varumarke/$brandId"
                      params={{ brandId: brand.id }}
                      className="rounded-lg border border-border/70 p-4 transition-colors hover:bg-muted/60"
                    >
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {brand.domain ?? "Ingen domän angiven"}
                      </p>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nytt varumärke – steg {step} av 3</DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Grunduppgifter om varumärket och marknaden."
                : step === 2
                  ? "Konkurrenter som ni jämförs med i AI-svar."
                  : "Köpprompter som ska bevakas."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Kund (valfritt)</Label>
                <Input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="T.ex. Aurora Media AB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Varumärke *</Label>
                <Input
                  id="brandName"
                  value={form.brandName}
                  onChange={(e) => set("brandName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domän</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value)}
                  placeholder="exempel.se"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Marknad</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Språk</Label>
                  <Input
                    id="language"
                    value={form.language}
                    onChange={(e) => set("language", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliases">Alias (kommaseparerat)</Label>
                <Input
                  id="aliases"
                  value={form.aliases}
                  onChange={(e) => set("aliases", e.target.value)}
                  placeholder="Alternativa stavningar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="products">Produkter / tjänster</Label>
                <Textarea
                  id="products"
                  rows={2}
                  value={form.products}
                  onChange={(e) => set("products", e.target.value)}
                />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="competitors">Konkurrenter – ett namn per rad</Label>
                <Textarea
                  id="competitors"
                  rows={6}
                  value={form.competitors}
                  onChange={(e) => set("competitors", e.target.value)}
                  placeholder={"Konkurrent AB\nAnnan aktör"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Kort beskrivning av erbjudandet</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompts">Köpprompter – en per rad</Label>
                <Textarea
                  id="prompts"
                  rows={7}
                  value={form.prompts}
                  onChange={(e) => set("prompts", e.target.value)}
                  placeholder={"bästa X i Sverige\nvar kan jag köpa Y\njämför X och Z"}
                />
                <p className="text-xs text-muted-foreground">
                  Du kan lägga till fler prompter och ändra intention per prompt efteråt.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent">Intention för dessa prompter</Label>
                <Select value={form.intent} onValueChange={(v) => set("intent", v)}>
                  <SelectTrigger id="intent">
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
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? setOpen(false) : setStep(step - 1))}
              disabled={create.isPending}
            >
              {step === 1 ? "Avbryt" : "Tillbaka"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !form.brandName}>
                Nästa
              </Button>
            ) : (
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? "Skapar …" : "Skapa varumärke"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
