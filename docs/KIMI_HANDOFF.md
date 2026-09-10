# Aurora GEO – arbetspaket för Kimi / AgentSwarm

Alla paket är oberoende och kan köras parallellt. Arbetsordning per paket:
**DEFINE DONE → IMPLEMENT → TEST → FIX → RETEST → VERIFY.**
Referera alltid till `docs/ACCEPTANCE_CRITERIA.md` för färdigkriterier.

Grundregler som inte får brytas:

- Ingen fabricerad live-data. Saknas nyckel ska körningen misslyckas synligt.
- Inga hemligheter i databas, klientkod eller loggar.
- Ingen rekommendation utan länkad evidens.

---

## WP1 – Härdning av leverantörsadapter

Filer: `src/lib/providers/openrouter.server.ts`, `src/lib/audit.functions.ts`
Uppgift: timeout per anrop, exponentiell backoff vid 429/5xx, strukturerade felkoder,
respektera `Retry-After`, avbryt hela körningen vid 401/402 i stället för att fortsätta bränna
anrop.
Done: simulerade 429/500/401-svar ger dokumenterat beteende i test; ingen körning fastnar.

## WP2 – Tester för klassificering

Filer: `src/lib/geo.ts`, `src/lib/geo.test.ts`
Uppgift: utöka testsviten med svenska formuleringar, negationer ("jag skulle inte välja X"),
plural/genitiv, versalvariation och listformat.
Done: minst 30 fall, alla gröna, inga falska RECOMMENDED vid negation.

## WP3 – Entitetsdetektion för konkurrenter

Uppgift: aliashantering, bolagsformer (AB, Ltd), domännamn som alias, undvik träff på delsträngar.
Done: testfall där "Mews" inte träffar "Mewsic"; alias ger träff.

## WP4 – Citatparsning

Uppgift: parsa både `annotations`/citations-fält från leverantören och URL:er i brödtext,
normalisera domän, deduplicera, markera egen domän.
Done: testfall med markdown-länkar, nakna URL:er och dubbletter.

## WP5 – RLS- och säkerhetsgranskning

Uppgift: verifiera org-isolering med två testkonton, granska SECURITY DEFINER-funktioner, se till
att `service_role` bara används där det krävs, kontrollera att inga hemligheter läcker till
klientbundlen.
Done: D1–D5 i acceptanskriterierna uppfyllda, linter utan säkerhetsfel.

## WP6 – Kostnadskontroll

Uppgift: budgettak per organisation och månad, varning vid X % av tak, blockering vid tak,
kostnadsrapport per klient.
Done: körning nekas när taket nås, med tydligt meddelande.

## WP7 – Bakgrundskörning av bevakning

Uppgift: aktivera schemaläggning. Endpoint under `src/routes/api/public/hooks/` med hemlig header,
`pg_cron`-jobb med lägsta rimliga frekvens (dygn eller mer sällan), idempotens och låsning så att
samma schema inte körs dubbelt.
Done: schema körs, `last_run_at` uppdateras, dubbelkörning omöjlig.

## WP8 – Stripe-fakturering

Uppgift: checkout för engångsanalys och prenumeration, webhook som uppdaterar `subscriptions`,
kundportal. Inga låtsassvar – utan nycklar ska flödet visa att betalning inte är aktiverad.
Done: testläge fungerar mot Stripe-testnycklar; utan nycklar visas korrekt blockerat läge.

## WP9 – Rapport-QA

Uppgift: utskriftslayout i A4, sidbrytningar, kontrastkontroll, korrekt svenska, DEMO-märkning på
varje sida i utskrift.
Done: PDF-export granskad på tre rapporter.

## WP10 – Svensk promptresearch för Auroras portfölj

Uppgift: ta fram 20 köpnära prompter per projekt (Hönsgården, Stayboost, Updro, AgilityManager,
Aurora Transport, Cykelhjälpen) med intentionsklassning och motivering.
Done: promptlistor levererade och importerbara; inga påhittade sökvolymer.

## WP11 – E2E-tester

Uppgift: Playwright-flöden för registrering, skapa varumärke, se demodata, skapa rapport, dela och
avdela rapport, samt kontroll att skyddade sidor kräver inloggning.
Done: flödena gröna i CI.
