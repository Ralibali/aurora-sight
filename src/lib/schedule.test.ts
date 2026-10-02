import { describe, expect, it } from "vitest";
import { nextScheduleRun, scheduleStatus } from "./schedule";

describe("nextScheduleRun", () => {
  it("advances daily and weekly schedules deterministically", () => {
    const start = new Date("2026-10-02T07:00:00.000Z");
    expect(nextScheduleRun("daily", start)).toBe("2026-10-03T07:00:00.000Z");
    expect(nextScheduleRun("weekly", start)).toBe("2026-10-09T07:00:00.000Z");
  });

  it("advances monthly schedules", () => {
    expect(nextScheduleRun("monthly", new Date("2026-10-02T07:00:00.000Z")))
      .toBe("2026-11-02T07:00:00.000Z");
  });

  it("rejects unknown cadence", () => {
    expect(() => nextScheduleRun("hourly")).toThrow(/Ogiltig cadence/);
  });
});

describe("scheduleStatus", () => {
  const now = new Date("2026-10-02T07:00:00.000Z");

  it("distinguishes paused, running, due and scheduled", () => {
    expect(scheduleStatus({ enabled: false, now })).toBe("paused");
    expect(scheduleStatus({ enabled: true, runningAt: "2026-10-02T06:59:00Z", now })).toBe("running");
    expect(scheduleStatus({ enabled: true, nextRunAt: "2026-10-02T06:00:00Z", now })).toBe("due");
    expect(scheduleStatus({ enabled: true, nextRunAt: "2026-10-03T06:00:00Z", now })).toBe("scheduled");
  });

  it("surfaces the last error when no run is active", () => {
    expect(scheduleStatus({ enabled: true, lastError: "provider failed", now })).toBe("error");
  });
});
