import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPricingPlans } from "@/lib/public.functions";
import heroImage from "@/assets/aurora-hero.jpg";
import {
  Search,
  ListChecks,
  ShieldCheck,
  BarChart3,
  FileText,
  Repeat,
  Quote,
  ArrowRight,
} from "lucide-react";

const plansQuery = queryOptions({
  queryKey: ["pricing-plans"],
  queryFn: () => getPricingPlans(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  head: () => ({
    meta: [
      { title: "Aurora GEO – Syns ditt varumärke när AI svarar?" },
      {
        name: "description",
        content:
          "Aurora GEO mäter hur ChatGPT, Claude och Perplexity svarar om ditt varumärke på köpnära svenska frågor. Spårbar evidens, konkurrentjämförelse och prioriterade åtgärder.",
      },
      { property: "og:title", content: "Aurora GEO – Syns ditt varumärke när AI svarar?" },
      {
        property: "og:description",
        content:
          "AI-synlighetsanalys och löpande bevakning för svenska varumärken. Varje slutsats länkad till ett faktiskt modellsvar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Aurora GEO",
          serviceType: "AI-synlighetsanalys (GEO)",
          provider: { "@type": "Organization", name: "Aurora Media AB" },
          areaServed: "SE",
          description:
            "Mätning och förbättring av hur AI-modeller svarar om varumärken på köpnära frågor.",
        }),
      },
    ],
  }),
  component: HomePage,
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Sidan kunde inte laddas.</div>
  ),
});

const steps = [
  {
    icon: ListChecks,
    title: "1. Köpprompter",
    body: "Vi definierar de frågor dina kunder faktiskt ställer till AI – uppdagande, jämförande, rekommenderande och lokala köpfrågor på svenska.",
  },
  {
    icon: Search,
    title: "2. Riktiga modellsvar",
    body: "Varje prompt skickas separat till valda modeller via API. Vi sparar hela svaret, modell, tidpunkt och om webbsökning användes.",
  },
  {
    icon: BarChart3,
    title: "3. Klassificering",
    body: "Varje svar klassas som Rekommenderad, Citerad, Nämnd eller Frånvarande enligt öppet redovisade regler.",
  },
  {
    icon: FileText,
    title: "4. Åtgärder och rapport",
    body: "Du får prioriterade hypoteser kopplade till de exakta prompter som motiverar dem – plus en delbar kundrapport.",
  },
];

function HomePage() {
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="aurora-hero relative overflow-hidden">
          <img
            src={heroImage}
            alt="Abstrakt visualisering av AI-svar och synlighetsdata under norrsken"
            width={1600}
            height={1008}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-24 lg:grid-cols-[1.15fr_0.85fr] lg:py-32">
            <div>
              <Badge className="border-0 bg-accent/20 text-accent-foreground backdrop-blur">
                GEO – Generative Engine Optimization
              </Badge>
              <h1 className="mt-6 text-4xl leading-tight font-semibold text-ink-foreground sm:text-5xl">
                Syns ditt varumärke när AI svarar på köpfrågan?
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-foreground/80">
                Aurora GEO mäter hur språkmodellerna faktiskt svarar om dig och dina konkurrenter –
                med hela modellsvaret sparat som evidens. Ingen gissad poäng, inga påhittade källor.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/kontakt">Beställ AI-synlighetsanalys</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-ink-foreground/30 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
                >
                  <Link to="/priser">Se priser</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-ink-foreground/60">
                Byggd av Aurora Media AB. Används internt på egna projekt innan den säljs vidare.
              </p>
            </div>

            <Card className="self-center border-ink-foreground/15 bg-ink-foreground/8 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base text-ink-foreground">
                  Så redovisas ett resultat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Rekommenderad", "Nämns i rekommenderande sammanhang", "bg-rec"],
                  ["Citerad", "Egen domän används som källa", "bg-cited"],
                  ["Nämnd", "Nämns utan rekommendation", "bg-mentioned"],
                  ["Frånvarande", "Förekommer inte i svaret", "bg-absent"],
                ].map(([label, desc, color]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                    <div>
                      <p className="font-medium text-ink-foreground">{label}</p>
                      <p className="text-ink-foreground/70">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h2 className="text-3xl font-semibold">Sökningen flyttar in i svaret</h2>
              <p className="mt-4 text-muted-foreground">
                Allt fler köpbeslut börjar med en fråga till en AI-assistent. Där finns ingen
                resultatlista att klättra i – antingen nämns du i svaret, eller så gör du det inte.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {[
                {
                  title: "Du vet inte vad modellerna säger",
                  body: "Utan mätning är AI-svaren en blind fläck mellan din SEO och din försäljning.",
                },
                {
                  title: "Konkurrenter rekommenderas i ditt ställe",
                  body: "Vi visar vem som nämns i stället för dig, prompt för prompt.",
                },
                {
                  title: "Poäng utan bevis är värdelösa",
                  body: "Varje siffra i Aurora GEO går att klicka sig ner till ett sparat modellsvar.",
                },
                {
                  title: "Åtgärder måste vara hypoteser",
                  body: "Vi lovar aldrig orsakssamband. Vi visar vad som saknas och vad som är rimligt att testa.",
                },
              ].map((item) => (
                <Card key={item.title} className="card-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Metod */}
        <section id="metod" className="border-y border-border/60 bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold">Så fungerar det</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Fyra steg, samma arbetsflöde varje gång – vilket gör körningar jämförbara över tid.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <Card key={step.title} className="card-soft h-full">
                  <CardHeader className="pb-2">
                    <step.icon className="h-5 w-5 text-primary" aria-hidden />
                    <CardTitle className="mt-3 text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{step.body}</CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Endast officiella
                API:er – inga skrapade konsumentgränssnitt
              </span>
              <span className="inline-flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" aria-hidden /> Jämförelser endast mellan
                körningar med samma villkor
              </span>
              <span className="inline-flex items-center gap-2">
                <Quote className="h-4 w-4 text-primary" aria-hidden /> Källor sparas i original –
                aldrig genererade
              </span>
            </div>
          </div>
        </section>

        {/* Priser */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Paket och priser</h2>
              <p className="mt-3 text-muted-foreground">
                Börja med en engångsanalys, fortsätt med löpande bevakning.
              </p>
            </div>
            <Button asChild variant="ghost">
              <Link to="/priser">
                Full prisjämförelse <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.key}
                className={`card-soft flex h-full flex-col ${plan.highlight ? "ring-2 ring-primary" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="mt-2 text-2xl font-semibold">
                    {plan.is_contact
                      ? "Offert"
                      : `${plan.price_sek.toLocaleString("sv-SE")} kr${plan.interval === "month" ? "/mån" : ""}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {f}
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
        </section>

        {/* CTA */}
        <section className="aurora-hero">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h2 className="text-3xl font-semibold text-ink-foreground">
              Ta reda på vad AI säger om er – med bevis
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-foreground/80">
              Vi kör analysen på era faktiska köpfrågor och levererar en rapport ni kan visa för
              ledning eller kund.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/kontakt">Boka AI-synlighetsanalys</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
