# Real AI Surface provider

Aurora Sight kan köra samma audit-flöde mot en extern browser/surface-worker i stället för enbart ett modell-API. Funktionen är opt-in och påverkar inte befintliga OpenRouter-körningar.

## Server-secrets

- `AURORA_SURFACE_PROVIDER_URL` – HTTPS-endpoint till den worker som hämtar det verkliga AI-svaret.
- `AURORA_SURFACE_PROVIDER_TOKEN` – valfri bearer-token för endpointen.

Secrets används endast på servern och ska inte exponeras i klienten eller sparas i databasen.

## Request-kontrakt

Aurora Sight skickar ett `POST`-anrop med JSON:

```json
{
  "prompt": "bästa bokningssystemet för små hotell i Sverige",
  "model": "surface/default",
  "modelId": "surface/default",
  "language": "sv",
  "country": "SE",
  "nativeSearch": true
}
```

Workern får gärna mappa `modelId` vidare till exempelvis ChatGPT, Perplexity, Gemini eller en annan stödd yta. Aurora Sight är avsiktligt vendor-neutral på denna nivå.

## Response-kontrakt

Följande format rekommenderas:

```json
{
  "answer": "...",
  "model": "surface-name-or-version",
  "citations": [
    { "url": "https://example.com/source" }
  ],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

Adaptern accepterar även `text` eller `content` i stället för `answer`, `sources`/`citationUrls` i stället för `citations`, samt vanliga alias för token usage.

## Datamodell och evidens

Surface-körningar använder samma `audit_runs`, `audit_results` och `citations` som övriga körningar. Råsvaret klassificeras med samma regler, citationer dedupliceras och sparas som evidens. Surface-körningar behandlas som `native_search` eftersom resultatet kommer från en verklig sök-/AI-yta.

Migrationen `20260916104500_real_surface_provider.sql` skapar en avstängd `Real AI Surface (browser)`-konfiguration per organisation. Aktivera den först när endpointen är konfigurerad och testad.

## Drift

Workern ansvarar för browserautomation, rate limits, eventuella upstream-kostnader och efterlevnad av respektive tjänsts villkor. Aurora Sight ska inte kringgå inloggning, åtkomstskydd eller andra tekniska begränsningar. Spara alltid källa/evidens där det är möjligt och betrakta AI-resultat som mätningar, inte garantier om ranking eller framtida synlighet.
