# NiubiGEO – upstream-referens och licens

## Sammanfattning

Aurora GEO är en egen kommersiell produkt utvecklad av Aurora Media AB. Projektet NiubiGEO
(licensierat under **Apache License 2.0**) har använts som **arkitektonisk referens och
inspiration** för hur GEO-mätning kan struktureras: promptbibliotek grupperat efter köpintention,
klassificering av modellsvar, evidenslagring och åtgärdsförslag.

Aurora GEO innehåller ingen kopierad proprietär kod eller tjänst. All kod i detta repo är skriven
för Aurora GEO.

## Vad Apache-2.0 innebär i praktiken

- Fri användning, modifiering och kommersiell distribution är tillåten.
- Om kod från NiubiGEO faktiskt kopieras in måste licenstexten och upphovsrättsnotisen följa med,
  och ändringar ska markeras. **I nuläget kopieras ingen kod.**
- Apache-2.0 ger ingen varumärkeslicens. Aurora GEO använder inte NiubiGEO-namnet i marknadsföring
  och påstår inte att produkterna är samma sak.

## Viktig avgränsning: API ≠ konsument-UI

Aurora GEO frågar modell-API:er (via OpenRouter) och sparar råsvaren som evidens. Detta är
**inte** samma sak som vad en enskild användare ser i ChatGPT:s, Geminis eller Perplexitys
konsumentgränssnitt. Skillnaderna kan bero på personalisering, minne, systeminstruktioner,
A/B-tester, verktyg och tidpunkt.

Vi:

- skrapar inte konsumentgränssnitt,
- påstår inte att API-svar motsvarar vad en viss slutanvändare ser,
- redovisar alltid modell, leverantör, sökläge och tidpunkt för varje mätning.

## Framtida NiubiGeoAdapter

`src/lib/providers/types.ts` definierar ett valfritt `NiubiGeoAdapter`-interface. Syftet är att en
självhostad NiubiGEO-instans (v0.2.x) senare ska kunna kopplas in som ytterligare datakälla utan
att MVP:n blir beroende av den. Interfacet är i dagsläget **inte implementerat** och används inte i
körningsmotorn.

Krav om det aktiveras:

1. Egen självhostad instans – ingen delad eller tredjeparts-endpoint.
2. Basadress och eventuell nyckel lagras som serverhemligheter, aldrig i databas eller klient.
3. Resultat märks med källa så att de aldrig blandas ihop med direkta API-mätningar.
