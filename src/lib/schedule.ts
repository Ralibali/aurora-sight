export type MonitorCadence = "daily" | "weekly" | "monthly";

export function nextScheduleRun(cadence: MonitorCadence | string, from: Date = new Date()) {
  const next = new Date(from.getTime());
  if (!Number.isFinite(next.getTime())) throw new Error("Invalid start date");

  if (cadence === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else throw new Error(`Ogiltig cadence: ${cadence}`);

  return next.toISOString();
}

export function scheduleStatus(input: {
  enabled: boolean;
  runningAt?: string | null;
  nextRunAt?: string | null;
  lastError?: string | null;
  now?: Date;
}) {
  if (!input.enabled) return "paused" as const;
  if (input.runningAt) return "running" as const;
  if (input.lastError) return "error" as const;
  const now = input.now ?? new Date();
  const next = input.nextRunAt ? Date.parse(input.nextRunAt) : Number.NaN;
  if (Number.isFinite(next) && next <= now.getTime()) return "due" as const;
  return "scheduled" as const;
}
