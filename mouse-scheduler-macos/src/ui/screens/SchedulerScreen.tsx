import React, { useEffect, useMemo, useState } from "react";
import type { ConflictPolicy, DayCode } from "../../shared/models";
import { useAsync } from "../lib/useAsync";
import { conflictLabel, dayLabel } from "../lib/format";
import { addHoursToTime, addMinutesToTime, parseFlexibleTime } from "../lib/time";

const ALL_DAYS: DayCode[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const POLICIES: ConflictPolicy[] = ["SKIP", "QUEUE", "RESTART"];

export function SchedulerScreen() {
  const { data: macros } = useAsync(() => window.mouseScheduler.macros.list(), []);
  const { data: schedules, loading, error, reload } = useAsync(
    () => window.mouseScheduler.schedules.list(),
    []
  );

  const [macroId, setMacroId] = useState<string>("");
  const [days, setDays] = useState<DayCode[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  // SIMPLE (user-friendly) inputs:
  const [simpleStart, setSimpleStart] = useState("09:00");
  const [simpleActiveHours, setSimpleActiveHours] = useState(23);
  const [simpleOffsetMin, setSimpleOffsetMin] = useState(2);
  const [simplePreviewDays, setSimplePreviewDays] = useState(30);
  const [enabled, setEnabled] = useState(true);
  const [repeatCount, setRepeatCount] = useState(1);
  const [preRunCountdownSec, setPreRunCountdownSec] = useState(10);
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>("QUEUE");
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (!macroId && macros && macros.length > 0) setMacroId(macros[0].macroId);
  }, [macroId, macros]);

  const simplePreview = useMemo(() => {
    const s = parseFlexibleTime(simpleStart);
    if (!s) return "";
    const hours = Math.max(1, Math.floor(simpleActiveHours));
    const offset = Math.max(0, Math.floor(simpleOffsetMin));
    const startRun = addMinutesToTime(s, offset);
    const endExclusive = addMinutesToTime(addHoursToTime(s, hours), offset);
    return `Days selected · Start ${s} · Active ${hours}h · Run every 60m at ${startRun} .. before ${endExclusive} (offset +${offset}m)`;
  }, [simpleStart, simpleActiveHours, simpleOffsetMin]);

  const simpleWindowPreview = useMemo(() => {
    const s = parseFlexibleTime(simpleStart);
    if (!s) return { total: 0, first: [] as string[] };
    const hours = Math.max(1, Math.floor(simpleActiveHours));
    const offset = Math.max(0, Math.floor(simpleOffsetMin));
    const [sh, sm] = s.split(":").map(Number);

    const now = new Date();
    const dayMap: Record<DayCode, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 } as any;
    const allowedDows = new Set(days.map((dc) => dayMap[dc]));

    const out: string[] = [];
    for (let dOff = 0; dOff < Math.max(1, Math.floor(simplePreviewDays)); dOff++) {
      const base = new Date(now);
      base.setDate(now.getDate() + dOff);
      base.setHours(0, 0, 0, 0);
      if (!allowedDows.has(base.getDay())) continue;

      const firstRun = new Date(base);
      firstRun.setHours(sh, sm + offset, 0, 0);
      for (let h = 0; h < hours; h++) {
        const runAt = new Date(firstRun.getTime() + h * 60 * 60 * 1000);
        if (runAt > now) out.push(runAt.toLocaleString());
      }
    }
    return { total: out.length, first: out.slice(0, 20) };
  }, [days, simpleStart, simpleActiveHours, simpleOffsetMin, simplePreviewDays]);

  const createScheduleNow = async (override?: { days?: DayCode[] }) => {
    const useDays = override?.days ?? days;
    const base = parseFlexibleTime(simpleStart) ?? simpleStart;
    const hours = Math.max(1, Math.floor(simpleActiveHours));
    const offset = Math.max(0, Math.floor(simpleOffsetMin));
    return run(() =>
      window.mouseScheduler.schedules.create({
        macroId,
        enabled,
        days: useDays,
        mode: "INTERVAL",
        times: [],
        interval: {
          start: addMinutesToTime(base, offset),
          end: addMinutesToTime(addHoursToTime(base, hours), offset - 1),
          everyMin: 60
        },
        repeatCount,
        preRunCountdownSec,
        conflictPolicy
      })
    );
  };

  const run = async (fn: () => Promise<unknown>) => {
    setOpError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleDay = (d: DayCode) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>Scheduler</h2>
        <div className="spacer" />
        <button onClick={reload} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="row">
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 600 }}>Yeni Schedule</div>
            <small>Gün + saat listesi + conflict policy + countdown.</small>
          </div>
          <div className="spacer" />
          <label className="row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Basit Panel</div>
          <small>
            Başlangıç saati + günde kaç saat aktif + her saat çalış + (istersen) her saati +2dk kaydır. Uygulama seçili
            günlere göre otomatik planı hesaplar.
          </small>

          <div className="row" style={{ marginTop: 10 }}>
            <span>Başlangıç</span>
            <input
              value={simpleStart}
              onChange={(e) => setSimpleStart(e.target.value)}
              onBlur={() => {
                const t = parseFlexibleTime(simpleStart);
                if (t) setSimpleStart(t);
              }}
              style={{ width: 120 }}
              placeholder="09:00"
            />
            <span>Günde kaç saat aktif?</span>
            <input
              type="number"
              value={simpleActiveHours}
              onChange={(e) => setSimpleActiveHours(Math.max(1, Number(e.target.value)))}
              style={{ width: 120 }}
            />
            <span>Her saati kaç dk kaydır?</span>
            <input
              type="number"
              value={simpleOffsetMin}
              onChange={(e) => setSimpleOffsetMin(Math.max(0, Number(e.target.value)))}
              style={{ width: 120 }}
            />
            <button onClick={() => setSimpleOffsetMin(2)}>+2dk</button>
            <button onClick={() => setSimpleActiveHours(23)}>23s</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <small>
              <b>Preview:</b> {simplePreview}
            </small>
            <div style={{ marginTop: 6 }}>
              <small>
                <b>Önizleme ({Math.max(1, Math.floor(simplePreviewDays))} gün):</b> Toplam {simpleWindowPreview.total}{" "}
                çalıştırma. İlk 20: {simpleWindowPreview.first.length ? simpleWindowPreview.first.join(" · ") : "—"}
              </small>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <span>Hızlı oluştur</span>
            <button
              className="primary"
              disabled={!macroId}
              onClick={() => {
                setSimplePreviewDays(1);
                return createScheduleNow({ days: ALL_DAYS });
              }}
            >
              Günlük
            </button>
            <button
              className="primary"
              disabled={!macroId}
              onClick={() => {
                setSimplePreviewDays(30);
                return createScheduleNow();
              }}
            >
              Aylık
            </button>
            <button
              className="primary"
              disabled={!macroId}
              onClick={() => {
                setSimplePreviewDays(365);
                return createScheduleNow();
              }}
            >
              Yıllık
            </button>
          </div>
        </div>

        <div className="row">
          <span>Macro</span>
          <select value={macroId} onChange={(e) => setMacroId(e.target.value)}>
            {(macros ?? []).map((m) => (
              <option key={m.macroId} value={m.macroId}>
                {m.name}
              </option>
            ))}
          </select>
          <span>Policy</span>
          <select value={conflictPolicy} onChange={(e) => setConflictPolicy(e.target.value as ConflictPolicy)}>
            {POLICIES.map((p) => (
              <option key={p} value={p}>
                {conflictLabel(p)}
              </option>
            ))}
          </select>
          <span>Countdown</span>
          <input
            style={{ width: 120 }}
            type="number"
            value={preRunCountdownSec}
            onChange={(e) => setPreRunCountdownSec(Number(e.target.value))}
          />
          <span>Repeat</span>
          <input
            style={{ width: 120 }}
            type="number"
            min={1}
            value={repeatCount}
            onChange={(e) => setRepeatCount(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div className="row">
          <span>Days</span>
          {ALL_DAYS.map((d) => (
            <label key={d} className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} />
              <small>{dayLabel(d)}</small>
            </label>
          ))}
        </div>

        <div className="row">
          <button
            className="primary"
            onClick={() => createScheduleNow()}
            disabled={
              !macroId || days.length === 0 || simpleActiveHours <= 0
            }
          >
            Create Schedule
          </button>
          <button
            onClick={() =>
              run(() =>
                window.mouseScheduler.runner.runNow({
                  macroId,
                  preRunCountdownSec,
                  repeatCount,
                  conflictPolicy
                })
              )
            }
            disabled={!macroId}
          >
            Run Now
          </button>
          <div className="spacer" />
          <button onClick={() => run(() => window.mouseScheduler.scheduler.reload())}>Reload Jobs</button>
        </div>

        {opError ? <span className="pill bad">{opError}</span> : null}
        {error ? <span className="pill bad">{error}</span> : null}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Enabled</th>
              <th>Macro</th>
              <th>Days</th>
              <th>Times</th>
              <th>Countdown</th>
              <th>Policy</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(schedules ?? []).map((s) => (
              <tr key={s.scheduleId}>
                <td>{s.enabled ? "Yes" : "No"}</td>
                <td>
                  <small>{s.macroId}</small>
                </td>
                <td>
                  <small>{s.days.join(",")}</small>
                </td>
                <td>
                  <small>
                    {s.quota
                      ? `Quota ${s.quota.runsPerWindow}/${s.quota.windowHours}h every${s.quota.intervalMin}m from ${s.quota.start} (+${s.quota.bufferSec}s)`
                      : (s as any).chain
                        ? `Chain ${(s as any).chain.runsPerWindow}/${(s as any).chain.windowHours}h start ${(s as any).chain.start} +${(s as any).chain.intervalMin}m`
                      : s.interval
                        ? `Every ${s.interval.everyMin}m ${s.interval.start}–${s.interval.end}`
                        : s.times.join(", ")}
                  </small>
                </td>
                <td>{s.preRunCountdownSec}s</td>
                <td>{conflictLabel(s.conflictPolicy)}</td>
                <td>
                  <div className="row">
                    <small>{(s as any).repeatCount ? `×${(s as any).repeatCount}` : ""}</small>
                    <button
                      onClick={() =>
                        run(() =>
                          window.mouseScheduler.runner.runNow({
                            macroId: s.macroId,
                            preRunCountdownSec: s.preRunCountdownSec,
                            repeatCount: (s as any).repeatCount ?? 1,
                            conflictPolicy: s.conflictPolicy
                          })
                        )
                      }
                    >
                      Run Now
                    </button>
                    <button
                      onClick={() =>
                        run(() =>
                          window.mouseScheduler.schedules.update({
                            scheduleId: s.scheduleId,
                            patch: { enabled: !s.enabled }
                          })
                        )
                      }
                    >
                      Toggle
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        run(() =>
                          window.confirm("Delete schedule?")
                            ? window.mouseScheduler.schedules.remove({ scheduleId: s.scheduleId })
                            : Promise.resolve()
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(schedules ?? []).length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <small>Henüz schedule yok.</small>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

