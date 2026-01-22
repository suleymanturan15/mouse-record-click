import schedule from "node-schedule";
import type { DayCode, Schedule as ScheduleModel } from "../shared/models";
import type { Storage } from "../storage/storage";
import { RunCoordinator } from "./runCoordinator";

type Job = any;

type QuotaState = {
  windowKey: string;
  nextIndex: number;
  blockedUntilTs: number;
  inFlight: boolean;
};

type ChainState = {
  windowKey: string;
  runsDone: number;
  nextRunAtTs: number;
  inFlight: boolean;
};

type IntervalState = {
  windowKey: string;
  lastIndex: number;
  inFlight: boolean;
};

function dayCodeToNodeScheduleDay(d: DayCode): number {
  // node-schedule: 0=Sunday..6=Saturday
  switch (d) {
    case "SUN":
      return 0;
    case "MON":
      return 1;
    case "TUE":
      return 2;
    case "WED":
      return 3;
    case "THU":
      return 4;
    case "FRI":
      return 5;
    case "SAT":
      return 6;
  }
  // Exhaustive guard
  throw new Error(`Unknown day code: ${d}`);
}

function parseTime(t: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) throw new Error(`Invalid time: ${t}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error(`Invalid time: ${t}`);
  return { hour, minute };
}

export class SchedulerService {
  private storage: Storage;
  private coordinator: RunCoordinator;
  private jobs: Map<string, Job[]> = new Map();
  private quotaState: Map<string, QuotaState> = new Map();
  private chainState: Map<string, ChainState> = new Map();
  private intervalState: Map<string, IntervalState> = new Map();

  constructor(storage: Storage, coordinator: RunCoordinator) {
    this.storage = storage;
    this.coordinator = coordinator;
  }

  async reload() {
    // cancel all
    for (const jobs of this.jobs.values()) jobs.forEach((j) => j.cancel());
    this.jobs.clear();
    this.quotaState.clear();
    this.chainState.clear();
    this.intervalState.clear();

    const schedules = await this.storage.listSchedules();
    for (const s of schedules) {
      if (!s.enabled) continue;
      this.scheduleOne(s);
    }
  }

  private scheduleOne(s: ScheduleModel) {
    const jobs: Job[] = [];
    const mode =
      s.mode ?? (s.chain ? "CHAIN" : s.quota ? "QUOTA" : s.interval ? "INTERVAL" : "TIMES");

    if (s.chain && mode === "CHAIN") {
      const { start, windowHours, intervalMin, runsPerWindow } = s.chain;
      const startT = parseTime(start);
      const windowMs = Math.max(1, Math.floor(windowHours)) * 60 * 60 * 1000;
      const intervalMs = Math.max(1, Math.floor(intervalMin)) * 60 * 1000;
      const runs = Math.max(1, Math.floor(runsPerWindow));

      const rule = new schedule.RecurrenceRule();
      rule.minute = new schedule.Range(0, 59, 1);
      rule.hour = new schedule.Range(0, 23, 1);

      const job = schedule.scheduleJob(rule, async () => {
        const now = new Date();
        try {
          const windowStart = new Date(now);
          windowStart.setHours(startT.hour, startT.minute, 0, 0);
          if (now.getTime() < windowStart.getTime()) windowStart.setDate(windowStart.getDate() - 1);
          const windowEnd = new Date(windowStart.getTime() + windowMs);
          if (now.getTime() < windowStart.getTime() || now.getTime() >= windowEnd.getTime()) return;

          const dow = windowStart.getDay();
          const allowed = s.days.some((dc) => dayCodeToNodeScheduleDay(dc) === dow);
          if (!allowed) return;

          const windowKey = `${windowStart.toISOString().slice(0, 10)}T${start}`;
          const st = this.chainState.get(s.scheduleId) ?? {
            windowKey,
            runsDone: 0,
            nextRunAtTs: windowStart.getTime(),
            inFlight: false
          };
          if (st.windowKey !== windowKey) {
            st.windowKey = windowKey;
            st.runsDone = 0;
            st.nextRunAtTs = windowStart.getTime();
            st.inFlight = false;
          }
          this.chainState.set(s.scheduleId, st);

          if (st.inFlight) return;
          if (st.runsDone >= runs) return;
          if (now.getTime() < st.nextRunAtTs) return;

          st.inFlight = true;
          this.chainState.set(s.scheduleId, st);

          const macro = await this.storage.getMacro(s.macroId);
          await this.coordinator.trigger({
            macro,
            conflictPolicy: s.conflictPolicy,
            preRunCountdownSec: s.preRunCountdownSec,
            repeatCount: s.repeatCount,
            source: `schedule:${s.scheduleId}`
          });

          st.runsDone += 1;
          st.nextRunAtTs = Date.now() + intervalMs;
        } catch {
          // swallow
        } finally {
          const st = this.chainState.get(s.scheduleId);
          if (st) {
            st.inFlight = false;
            this.chainState.set(s.scheduleId, st);
          }
        }
      });
      if (job) jobs.push(job);
    } else if (s.quota && mode === "QUOTA") {
      const { start, windowHours, intervalMin, runsPerWindow, bufferSec } = s.quota;
      const startT = parseTime(start);
      const windowMs = Math.max(1, Math.floor(windowHours)) * 60 * 60 * 1000;
      const stepMs = Math.max(1, Math.floor(intervalMin)) * 60 * 1000;
      const runs = Math.max(1, Math.floor(runsPerWindow));
      const bufferMs = Math.max(0, Math.floor(bufferSec)) * 1000;

      const rule = new schedule.RecurrenceRule();
      rule.minute = new schedule.Range(0, 59, 1);
      rule.hour = new schedule.Range(0, 23, 1);

      const job = schedule.scheduleJob(rule, async () => {
        const now = new Date();
        try {
          const windowStart = new Date(now);
          windowStart.setHours(startT.hour, startT.minute, 0, 0);
          if (now.getTime() < windowStart.getTime()) windowStart.setDate(windowStart.getDate() - 1);
          const windowEnd = new Date(windowStart.getTime() + windowMs);
          if (now.getTime() < windowStart.getTime() || now.getTime() >= windowEnd.getTime()) return;

          const dow = windowStart.getDay();
          const allowed = s.days.some((dc) => dayCodeToNodeScheduleDay(dc) === dow);
          if (!allowed) return;

          const windowKey = `${windowStart.toISOString().slice(0, 10)}T${start}`;
          const st = this.quotaState.get(s.scheduleId) ?? {
            windowKey,
            nextIndex: 0,
            blockedUntilTs: 0,
            inFlight: false
          };
          if (st.windowKey !== windowKey) {
            st.windowKey = windowKey;
            st.nextIndex = 0;
            st.blockedUntilTs = 0;
            st.inFlight = false;
          }
          this.quotaState.set(s.scheduleId, st);

          if (st.inFlight) return;
          if (st.nextIndex >= runs) return;
          if (now.getTime() < st.blockedUntilTs) return;

          // If we missed planned times (because macro took too long), skip them instead of "catching up".
          let plannedAt = new Date(windowStart.getTime() + st.nextIndex * stepMs);
          const graceMs = bufferMs; // after this, consider the slot missed
          while (st.nextIndex < runs && now.getTime() > plannedAt.getTime() + graceMs) {
            st.nextIndex += 1;
            plannedAt = new Date(windowStart.getTime() + st.nextIndex * stepMs);
          }
          if (st.nextIndex >= runs) return;
          if (now.getTime() < plannedAt.getTime()) return;

          st.inFlight = true;
          this.quotaState.set(s.scheduleId, st);

          const macro = await this.storage.getMacro(s.macroId);

          await this.coordinator.trigger({
            macro,
            conflictPolicy: s.conflictPolicy,
            preRunCountdownSec: s.preRunCountdownSec,
            repeatCount: s.repeatCount,
            source: `schedule:${s.scheduleId}`
          });

          st.nextIndex += 1;
          // Coordinator waits until macro completes; enforce buffer after completion.
          st.blockedUntilTs = Date.now() + bufferMs;
        } catch {
          // swallow
        } finally {
          const st = this.quotaState.get(s.scheduleId);
          if (st) {
            st.inFlight = false;
            this.quotaState.set(s.scheduleId, st);
          }
        }
      });
      if (job) jobs.push(job);
    } else if (s.interval && mode === "INTERVAL") {
      const { start, end, everyMin } = s.interval;
      const startT = parseTime(start);
      const endT = parseTime(end);
      const startMin = startT.hour * 60 + startT.minute;
      const endMin = endT.hour * 60 + endT.minute;
      const step = Math.max(1, Math.min(1440, Math.floor(everyMin)));
      const overnight = endMin < startMin;

      const rule = new schedule.RecurrenceRule();
      rule.minute = new schedule.Range(0, 59, 1);
      rule.hour = new schedule.Range(0, 23, 1);

      const job = schedule.scheduleJob(rule, async () => {
        try {
          const now = new Date();
          const curMin = now.getHours() * 60 + now.getMinutes();
          const inWindow = overnight
            ? curMin >= startMin || curMin <= endMin
            : curMin >= startMin && curMin <= endMin;
          if (!inWindow) return;

          const effectiveDate = new Date(now);
          if (overnight && curMin <= endMin) effectiveDate.setDate(now.getDate() - 1);
          const dow = effectiveDate.getDay();
          const allowed = s.days.some((dc) => dayCodeToNodeScheduleDay(dc) === dow);
          if (!allowed) return;

          const windowKey = `${effectiveDate.toISOString().slice(0, 10)}T${start}`;
          const st = this.intervalState.get(s.scheduleId) ?? { windowKey, lastIndex: -1, inFlight: false };
          if (st.windowKey !== windowKey) {
            st.windowKey = windowKey;
            st.lastIndex = -1;
            st.inFlight = false;
          }
          this.intervalState.set(s.scheduleId, st);

          if (st.inFlight) return;

          const delta = ((curMin - startMin) % (24 * 60) + 24 * 60) % (24 * 60);
          const index = Math.floor(delta / step);
          if (index === st.lastIndex) return;

          st.inFlight = true;
          st.lastIndex = index;
          this.intervalState.set(s.scheduleId, st);

          const macro = await this.storage.getMacro(s.macroId);
          await this.coordinator.trigger({
            macro,
            conflictPolicy: s.conflictPolicy,
            preRunCountdownSec: s.preRunCountdownSec,
            repeatCount: s.repeatCount,
            source: `schedule:${s.scheduleId}`
          });
        } catch {
          // swallow
        } finally {
          const st = this.intervalState.get(s.scheduleId);
          if (st) {
            st.inFlight = false;
            this.intervalState.set(s.scheduleId, st);
          }
        }
      });
      if (job) jobs.push(job);
    } else {
      for (const d of s.days) {
        const dayOfWeek = dayCodeToNodeScheduleDay(d);
        for (const t of s.times) {
          const { hour, minute } = parseTime(t);
          const rule = new schedule.RecurrenceRule();
          rule.dayOfWeek = dayOfWeek;
          rule.hour = hour;
          rule.minute = minute;

          const job = schedule.scheduleJob(rule, async () => {
            try {
              const macro = await this.storage.getMacro(s.macroId);
              await this.coordinator.trigger({
                macro,
                conflictPolicy: s.conflictPolicy,
                preRunCountdownSec: s.preRunCountdownSec,
                repeatCount: s.repeatCount,
                source: `schedule:${s.scheduleId}`
              });
            } catch {
              // swallow
            }
          });
          if (job) jobs.push(job);
        }
      }
    }
    this.jobs.set(s.scheduleId, jobs);
  }
}

// Kept for future UX previews (macro duration estimation). Not currently used by QUOTA scheduler.
function estimateMacroDurationMs(macro: { events: any[] }, minDelayMs = 20): number {
  let total = 0;
  for (const ev of macro.events ?? []) {
    if (ev?.type === "wait") total += Math.max(0, Number(ev.ms ?? 0));
    else if (typeof ev?.deltaMs === "number") total += Math.max(minDelayMs, ev.deltaMs);
    else total += minDelayMs;
  }
  return total;
}
