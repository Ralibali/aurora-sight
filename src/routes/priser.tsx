import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPricingPlans } from "@/lib/public.functions";
import { Check } from "lucide-react";

const plansQuery = queryOptions({
  queryKey: ["pricing-plans"],
  queryFn: () => getPricingPlans(),
});

export const Route = createFileRoute("/priser")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "Priser – Aurora GEO AI-synlighet | Aurora Media AB" },
      {
        name: "description",
        content:
          "AI-synlighetsanalys 2 995 kr engångs, Monitor 995 kr/mån, Growth 2 495 kr/mån och byråpaket. Transparent prissättning för AI-synlighet i Sverige.",
      },
      { property: "og:title", content: "Priser – Aurora GEO AI-synlighet" },
      {
        property: "og:description",
        content: "Engångsanalys och löpande bevakning av hur AI-modeller svarar om ditt varumärke.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Priserna kunde inte laddas.</div>
  ),
});

function PricingPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h1 className="text-4xl font-semibold">Priser</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Alla paket inkluderar spårbar evidens: varje siffra går att följa till ett sparat
              modellsvar. Priser exklusive moms.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.key}
                className={`card-soft flex h-full flex-col ${plan.highlight ? "ring-2 ring-primary" : ""}`}
              >
                <CardHeader>
                  {plan.highlight ? (
                    <Badge className="mb-2 w-fit bg-accent text-accent-foreground">Populärast</Badge>
                  ) : null}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="mt-3 text-3xl font-semibold">
                    {plan.is_contact
                      ? "Offert"
                      : `${plan.price_sek.toLocaleString("sv-SE")} kr`}
                    {!plan.is_contact && plan.interval === "month" ? (
                      <span className="text-base font-normal text-muted-foreground">/mån</span>
                    ) : null}
                  </p>
                  {!plan.is_contact && plan.interval === "once" ? (
                    <p className="text-sm text-muted-foreground">engångskostnad</p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <ul className="space-y-2.5 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={plan.highlight ? "default" : "outline"}>
                    <Link to="/kontakt" search={{ plan: plan.key }}>
                      {plan.cta_label}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                q: "Vad ingår i en analys?",
                a: "Definition av köpprompter, körning mot valda modeller, klassificering av varje svar, konkurrentjämförelse, prioriterade åtgärdshypoteser och en delbar rapport.",
              },
              {
                q: "Hur ofta bör man mäta?",
                a: "Modeller och underlag ändras löpande. Månadsvis bevakning ger jämförbara trender så länge prompter, modell och sökläge hålls konstanta.",
              },
              {
                q: "Garanterar ni resultat?",
                a: "Nej. Vi redovisar vad modellerna faktiskt svarar och föreslår åtgärder som hypoteser. Vi påstår aldrig orsakssamband utan mätning före och efter.",
              },
            ].map((item) => (
              <Card key={item.q} className="card-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
