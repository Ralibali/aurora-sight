# Scheduled monitoring

Aurora Sight kan köra samma live-audit automatiskt för aktiva bevakningar.

## Säkerhetsmodell

- Browsern får endast skapa och ändra sin organisations `schedules` genom befintlig org-RLS.
- Själva workern ligger på `POST /api/monitor/run`.
- Workern kräver `Authorization: Bearer <AURORA_MONITOR_CRON_SECRET>`.
- Workern använder server-side `SUPABASE_SERVICE_ROLE_KEY` för att claima due schedules och kan därför aldrig exponeras som en publik klientnyckel.
- RPC:n `claim_due_sight_schedules` är `SECURITY INVOKER`, kan bara köras av `service_role` och använder `FOR UPDATE SKIP LOCKED` för att förhindra dubbla workers.

## Nödvändiga servervariabler

- `AURORA_MONITOR_CRON_SECRET` – separat slumpad hemlighet för scheduler-anrop.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- minst en live-provider:
  - `OPENROUTER_API_KEY`, eller
  - `AURORA_SURFACE_PROVIDER_URL` (+ valfri `AURORA_SURFACE_PROVIDER_TOKEN`).

Samma `AURORA_MONITOR_CRON_SECRET` ska finnas hos den scheduler som POST:ar till endpointen. Lägg den aldrig i Git, browserkod eller en publik tabell.

## Scheduler

En extern scheduler eller server-side cron kan anropa endpointen var 15:e minut:

```
POST https://<aurora-sight-host>/api/monitor/run
Authorization: Bearer <secret>
Content-Type: application/json
```

Endpointen kör högst ett due schema per anrop. Själva kundschemat bestämmer om det ska köras dagligen, veckovis eller månadsvis.

## Felhantering

- Due schedule claimas atomiskt.
- Lås äldre än två timmar får återtas efter en worker-krasch.
- Vid lyckad körning sparas `last_run_at`, `last_run_id` och nytt `next_run_at`.
- Vid fel sparas `last_error` och schemat gör ett nytt försök efter sex timmar.
- En enskild provider/prompt kan misslyckas utan att rådata för övriga prompts går förlorad.

## Driftsättningsordning

1. Kör migration `20261002072000_scheduled_monitoring.sql`.
2. Publicera appen.
3. Sätt `AURORA_MONITOR_CRON_SECRET` server-side.
4. Konfigurera scheduler mot den publicerade `/api/monitor/run`.
5. Aktivera en intern testbevakning i UI och välj **Köa körning nu**.
6. Verifiera att `last_run_id`, `last_run_at` och `next_run_at` uppdateras innan fler kundbevakningar aktiveras.
