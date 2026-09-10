# Aurora Sight

Build a production-quality MVP called **Aurora GEO** for Aurora Media AB. This is a Swedish-first AI Search Visibility / GEO service for agencies and SMBs. It commercializes proven open-source ideas from NiubiGEO (Apache-2.0) but should be its own clean commercial product layer. Do not copy proprietary services or depend on hidden consumer UI scraping. Keep evidence traceable to actual model/API answers.

PRIMARY BUSINESS GOAL
Sell AI visibility audits and recurring monitoring with low owner time. The product should support Aurora Media using it internally on Hönsgården, Stayboost, Updro, AgilityManager, Aurora Transport, Cykelhjälpen and client sites, then package the same workflow for paying customers.

BRAND/UI
Swedish-first. Premium agency SaaS look: trustworthy, analytical, clear, calm. Aurora GEO by Aurora Media AB. Responsive, accessible, polished enough for client demos. shadcn/ui/Tailwind. No lorem ipsum.

COMMERCIAL OFFER
Public marketing site + pricing:
- AI-synlighetsanalys: 2 995 kr one-time
- Monitor: 995 kr/mån up to 1 brand / 20 tracked buyer prompts
- Growth: 2 495 kr/mån up to 3 brands / 60 prompts + monthly recommendations
- Agency/Custom: contact
Prices configurable in admin.

CORE PRODUCT
1. Authenticated agency/admin dashboard.
2. Multi-client + multi-brand/project management.
3. Brand onboarding wizard: domain, brand name, country/market, language, competitors, products/services, target buyer prompts/keywords.
4. Prompt library grouped by intent: discovery, comparison, recommendation, local/buyer-intent, branded, problem-to-solution.
5. Audit run setup: choose configured providers/models, prompt set, market/language, offline vs provider-native search where supported.
6. Results/evidence model:
   - RECOMMENDED
   - CITED
   - MENTIONED
   - ABSENT
   Store raw model answer, model/provider, timestamp, prompt, detected brand/competitor mentions, citations/URLs and execution conditions. Every summary finding must link to evidence.
7. Dashboard metrics: visibility rate, recommendation rate, citation rate, prompt coverage, competitor share-of-mentions, biggest gaps, trend vs previous comparable run.
8. Competitor comparison page.
9. Findings/action board: convert a verified gap into a recommended action such as entity clarity, landing page, structured data, content gap, third-party citation/source opportunity, internal linking, review/authority gap. Never claim causation without evidence.
10. Client-facing branded report: printable/shareable HTML/PDF-ready layout with executive summary, strongest/weakest buyer prompts, competitors appearing instead, evidence links, prioritized actions, next recheck.
11. Scheduled monitoring model in database; actual background scheduling may be disabled in v0.1 until production worker is configured.
12. Commercial dashboard: MRR placeholder/billing state, clients, active monitors, overdue reviews, run cost estimates.

DATA MODEL
Use Supabase/Postgres. Tables for profiles, organizations, clients, brands/projects, competitors, prompt_sets, prompts, provider_configs (NO secrets), audit_runs, audit_results, citations, findings, actions, schedules, reports, subscriptions/billing_state, audit_log. Strong RLS: client users see only their org/brands/reports, Aurora admin sees all.

AI PROVIDER ARCHITECTURE
Implement a server-side provider adapter with OpenRouter first because it can route multiple model families. Secrets only in server-side environment/Supabase secrets, never client-side/database plaintext. Environment variable OPENROUTER_API_KEY. Store provider/model labels and whether native web search was used. If no key exists, run DEMO MODE with clearly labeled seeded results. Never present mock/demo data as live audit data.

AUDIT ENGINE V0.1
Implement a server-side function/edge function that:
- loads selected prompts
- sends each independently to selected model via OpenRouter
- captures raw response and any returned citations/URLs
- detects exact brand/competitor mentions conservatively
- classifies RECOMMENDED/CITED/MENTIONED/ABSENT using transparent rules
- persists results
- computes aggregate metrics
- records errors per prompt/model without failing entire run
No hidden score without evidence. No fake citations. Add a per-run cost-estimate field from token usage where available.

COMPARABILITY
Only compare runs when brand, prompt set, model/provider and search mode are comparable. Clearly warn otherwise.

GEO RECOMMENDATIONS
Recommendations must be evidence-backed and framed as hypotheses/actions, not guaranteed ranking fixes. Include likely high-ROI fixes: entity clarity, product/service positioning, structured data, authoritative third-party mentions/citations, pages that answer missing buyer prompts, technical SEO/indexability, review/source gaps. Link each recommendation to the specific failed/competitive prompts that motivated it.

INTERNAL AURORA DEMO DATA
Seed demo projects for Hönsgården, Stayboost and Updro with clearly marked DEMO audit runs so the UI is immediately useful. Include Swedish buyer-intent prompt examples appropriate to each.

BILLING
Prepare Stripe-ready checkout/subscription architecture without requiring live keys. No fake payment success.

ANALYTICS/SEO
Public pages: excellent metadata, schema, sitemap/robots-ready structure, conversion hooks.

NIUBIGEO COMPATIBILITY / LICENSE
Add `/docs/UPSTREAM_NIUBIGEO.md` documenting that NiubiGEO is Apache-2.0 and is used as architectural/reference inspiration. Do not imply consumer ChatGPT UI results are equivalent to API results. Add an optional future `NiubiGeoAdapter` interface so a self-hosted NiubiGEO v0.2.x instance can be connected later without coupling the MVP to it.

KIMI/AGENTSWARM HANDOFF
Create `/docs/KIMI_HANDOFF.md` with exact parallel work packages for Kimi/AgentSwarm: provider API hardening, classification tests, competitor entity detection, citation parsing, RLS/security audit, cost controls, scheduled monitoring worker, Stripe billing, report QA, Swedish buyer-prompt research for Aurora portfolio projects, E2E tests. Also create `/docs/ACCEPTANCE_CRITERIA.md` with machine-verifiable done conditions. Required workflow: DEFINE DONE -> IMPLEMENT -> TEST -> FIX -> RETEST -> VERIFY.

QUALITY/SAFETY
Demo/live state must be impossible to confuse. Add loading/error/empty states, rate-limit/cost guardrails, confirmation before expensive multi-model run, and a maximum prompts x models guard. Never expose provider keys. Avoid overengineering; ship a clean sellable v0.1.

At the end summarize what is live-working, what is demo-mode, exact setup needed for OPENROUTER_API_KEY, and the highest-value next step.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6ab955f8-87dd-41a6-a730-f7f231c63933).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
