import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitLead } from "@/lib/public.functions";
import { CheckCircle2 } from "lucide-react";

const searchSchema = z.object({ plan: z.string().max(40).optional() });

export const Route = createFileRoute("/kontakt")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Boka AI-synlighetsanalys – Aurora GEO" },
      {
        name: "description",
        content:
          "Berätta om ert varumärke så återkommer Aurora Media AB med upplägg, tidplan och pris för en AI-synlighetsanalys.",
      },
      { property: "og:title", content: "Boka AI-synlighetsanalys – Aurora GEO" },
      {
        property: "og:description",
        content: "Kontakta Aurora Media AB för analys eller löpande bevakning av AI-synlighet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const PLAN_LABELS: Record<string, string> = {
  analys: "AI-synlighetsanalys (2 995 kr)",
  monitor: "Monitor (995 kr/mån)",
  growth: "Growth (2 495 kr/mån)",
  agency: "Byrå / Custom",
};

function ContactPage() {
  const { plan } = Route.useSearch();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? ""),
      website: String(form.get("website") ?? ""),
      plan_interest: String(form.get("plan_interest") ?? ""),
      message: String(form.get("message") ?? ""),
    };
    if (payload.name.trim().length < 2 || !payload.email.includes("@")) {
      setError("Fyll i namn och en giltig e-postadress.");
      return;
    }
    setSending(true);
    try {
      await submitLead({ data: payload });
      setDone(true);
      toast.success("Tack! Vi hör av oss inom en arbetsdag.");
    } catch {
      setError("Förfrågan kunde inte skickas just nu. Försök igen om en stund.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h1 className="text-4xl font-semibold">Boka AI-synlighetsanalys</h1>
            <p className="mt-4 text-muted-foreground">
              Berätta kort om varumärket och marknaden. Vi återkommer med förslag på köpprompter,
              modeller och tidplan – samt vad analysen kostar i ert fall.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              {[
                "Svar inom en arbetsdag",
                "Ingen bindningstid på engångsanalysen",
                "Rapport ni kan vidarebefordra till kund eller ledning",
                "Vi redovisar exakt vilka modeller som använts",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="card-soft">
            <CardHeader>
              <CardTitle>Skicka en förfrågan</CardTitle>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-sm">
                  <p className="font-medium">Tack – din förfrågan är registrerad.</p>
                  <p className="mt-2 text-muted-foreground">
                    Vi hör av oss till angiven e-postadress inom en arbetsdag.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Namn *</Label>
                      <Input id="name" name="name" required autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-post *</Label>
                      <Input id="email" name="email" type="email" required autoComplete="email" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">Företag</Label>
                      <Input id="company" name="company" autoComplete="organization" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Webbplats</Label>
                      <Input id="website" name="website" placeholder="exempel.se" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan_interest">Intresserad av</Label>
                    <Input
                      id="plan_interest"
                      name="plan_interest"
                      defaultValue={plan ? (PLAN_LABELS[plan] ?? plan) : ""}
                      placeholder="T.ex. Monitor 995 kr/mån"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Vad vill ni ta reda på?</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={4}
                      placeholder="Marknad, viktigaste köpfrågor, konkurrenter …"
                    />
                  </div>

                  {error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? "Skickar …" : "Skicka förfrågan"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Vi använder uppgifterna endast för att kontakta dig om Aurora GEO.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
