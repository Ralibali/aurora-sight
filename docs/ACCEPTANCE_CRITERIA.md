# Aurora GEO – acceptanskriterier (v0.1)

Arbetsordning för varje paket: **DEFINE DONE → IMPLEMENT → TEST → FIX → RETEST → VERIFY.**
Ett paket är klart först när kriteriet nedan kan verifieras maskinellt eller genom ett
reproducerbart manuellt steg med angivet förväntat resultat.

## A. Bygg och typer

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| A1 | Typkontroll passerar utan fel | `bunx tsgo --noEmit -p tsconfig.json` → exit 0 |
| A2 | Enhetstester passerar | `bunx vitest run` → alla gröna |
| A3 | Inga oanvända routes eller trasiga länkar | Alla `Link to=` motsvarar en fil i `src/routes` |

## B. Klassificering och mätvärden

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| B1 | `classifyAnswer` returnerar ABSENT när varumärket inte förekommer | Test i `src/lib/geo.test.ts` |
| B2 | Delsträngsträff räknas inte som omnämnande (ordgräns krävs) | Test |
| B3 | CITED kräver länk till varumärkets domän i svaret | Test |
| B4 | RECOMMENDED kräver rekommendationssignal nära varumärket eller topp-3-placering i lista | Test |
| B5 | Precedens RECOMMENDED > CITED > MENTIONED > ABSENT | Test |
| B6 | `computeMetrics` ger korrekta andelar för känt indata | Test |
| B7 | Jämförelse blockeras när varumärke, promptset, modell, leverantör, sökläge eller demo/live skiljer | Test + varningsruta på varumärkessidan |

## C. Demo kontra live

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| C1 | Utan `OPENROUTER_API_KEY` kastar `startAuditRun` fel och skapar ingen körning | Manuellt: knappen är avstängd, serverfunktionen returnerar fel |
| C2 | Ingen demodata skrivs någonsin med `mode = 'live'` | SQL: `select count(*) from audit_runs where mode='live' and model_id='demo/seeded'` = 0 |
| C3 | Varje vy som visar körningsdata visar DEMO- eller LIVE-märkning | Manuell genomgång av översikt, varumärke, körning, rapport |
| C4 | Demosvar innehåller texten "DEMO-SVAR" och kan inte förväxlas med modellsvar | SQL-stickprov |

## D. Säkerhet och RLS

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| D1 | Alla tabeller i `public` har RLS aktiverat | `supabase--linter` utan RLS-fel |
| D2 | Användare i organisation A kan inte läsa rader från organisation B | Manuellt test med två konton |
| D3 | `OPENROUTER_API_KEY` förekommer aldrig i klientbundle | `rg "OPENROUTER" src` ger endast serverfiler |
| D4 | Delad rapport kräver giltig token **och** `is_shared = true` | Anropa `/rapport/<fel-token>` → felmeddelande |
| D5 | Provider-tabellen innehåller inga hemligheter | Kolumngranskning av `provider_configs` |

## E. Kostnadsspärrar

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| E1 | Max 25 prompter per körning | Konstant `MAX_PROMPTS_PER_RUN`, serverfel vid överskridande |
| E2 | Bekräftelsedialog innan live-körning startas | Manuellt |
| E3 | Kostnadsuppskattning sparas per körning från faktisk tokenförbrukning | `audit_runs.cost_estimate_usd > 0` efter live-körning |

## F. Rapport och åtgärder

| Id | Kriterium | Verifiering |
| --- | --- | --- |
| F1 | Varje insikt har minst ett länkat resultat-id som evidens | `findings.evidence_result_ids` inte tom |
| F2 | Åtgärder formuleras som hypoteser utan garantier | Textgranskning |
| F3 | Rapporten kan skrivas ut till PDF med läsbar layout | Manuellt: utskriftsvy |
| F4 | Delningslänk kan stängas av och slutar då fungera direkt | Manuellt |
