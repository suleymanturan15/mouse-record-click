import React, { useEffect, useMemo, useState } from "react";
import type { ConflictPolicy, DayCode } from "../../shared/models";
import { useAsync } from "../lib/useAsync";
import { conflictLabel, dayLabel } from "../lib/format";
import { addHoursToTime, addMinutesToTime, generateTimesBetween, parseFlexibleTime } from "../lib/time";

const ALL_DAYS: DayCode[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const POLICIES: ConflictPolicy[] = ["SKIP", "QUEUE", "RESTART"];
const MODES = ["SIMPLE", "TIMES", "INTERVAL", "QUOTA", "CHAIN"] as const;
type Mode = (typeof MODES)[number];

export function SchedulerScreen() {
  const { data: macros } = useAsync(() => window.mouseScheduler.macros.list(), []);
  const { data: schedules, loading, error, reload } = useAsync(
    () => window.mouseScheduler.schedules.list(),
    []
  );

  const [mode, setMode] = useState<Mode>("TIMES");
  const [macroId, setMacroId] = useState<string>("");
  const [days, setDays] = useState<DayCode[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  const [time, setTime] = useState("09:00");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("18:00");
  const [everyMin, setEveryMin] = useState(60);
  const [intervalStart, setIntervalStart] = useState("00:00");
  const [intervalEnd, setIntervalEnd] = useState("23:59");
  const [intervalEveryMin, setIntervalEveryMin] = useState(60);
  const [is24h, setIs24h] = useState(true);
  const [quotaStart, setQuotaStart] = useState("09:00");
  const [quotaWindowHours, setQuotaWindowHours] = useState(24);
  const [quotaIntervalMin, setQuotaIntervalMin] = useState(60);
  const [quotaRunsPerWindow, setQuotaRunsPerWindow] = useState(20);
  const [quotaBufferSec, setQuotaBufferSec] = useState(5);
  const [chainStart, setChainStart] = useState("09:10");
  const [chainWindowHours, setChainWindowHours] = useState(24);
  const [chainIntervalMin, setChainIntervalMin] = useState(60);
  const [chainRunsPerWindow, setChainRunsPerWindow] = useState(20);
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
    if (is24h) {
      setIntervalStart("00:00");
      setIntervalEnd("23:59");
    }
  }, [is24h]);

  useEffect(() => {
    if (!macroId && macros && macros.length > 0) setMacroId(macros[0].macroId);
  }, [macroId, macros]);

  const addTime = () => {
    const t = parseFlexibleTime(time);
    if (!t) return;
    if (times.includes(t)) return;
    setTimes([...times, t].sort());
  };

  const removeTime = (t: string) => setTimes((prev) => prev.filter((x) => x !== t));

  const normalizeTimeField = () => {
    const t = parseFlexibleTime(time);
    if (t) setTime(t);
  };

  const onTimeWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const step = e.shiftKey ? 10 : 1;
    setTime((prev) => addMinutesToTime(prev, delta * step));
  };

  const onTimeKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      const step = e.shiftKey ? 10 : 1;
      setTime((prev) => addMinutesToTime(prev, delta * step));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addTime();
    }
  };

  const applyInterval = () => {
    const generated = generateTimesBetween(rangeStart, rangeEnd, everyMin);
    if (generated.length === 0) return;
    const merged = Array.from(new Set([...times, ...generated])).sort();
    setTimes(merged);
  };

  const nextRunsPreview = (() => {
    const now = new Date();
    const dayMap: Record<DayCode, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 } as any;
    const parsedTimes = times
      .map((t) => parseFlexibleTime(t))
      .filter((x): x is string => !!x)
      .sort();
    const out: Date[] = [];
    for (let addDay = 0; addDay < 14; addDay++) {
      const d = new Date(now);
      d.setDate(now.getDate() + addDay);
      const dow = d.getDay();
      const allowed = days.some((dc) => dayMap[dc] === dow);
      if (!allowed) continue;
      for (const t of parsedTimes) {
        const [hh, mm] = t.split(":").map(Number);
        const runAt = new Date(d);
        runAt.setHours(hh, mm, 0, 0);
        if (runAt > now) out.push(runAt);
      }
    }
    out.sort((a, b) => a.getTime() - b.getTime());
    return out.slice(0, 5).map((d) => d.toLocaleString());
  })();

  const intervalPreview = useMemo(() => {
    const s = parseFlexibleTime(intervalStart);
    const e = parseFlexibleTime(intervalEnd);
    const step = Math.max(1, Math.floor(intervalEveryMin));
    if (!s || !e) return "";
    return `Every ${step} min between ${s}–${e}`;
  }, [intervalStart, intervalEnd, intervalEveryMin]);

  const quotaPreview = useMemo(() => {
    const s = parseFlexibleTime(quotaStart);
    if (!s) return "";
    const wh = Math.max(1, Math.floor(quotaWindowHours));
    const im = Math.max(1, Math.floor(quotaIntervalMin));
    const runs = Math.max(1, Math.floor(quotaRunsPerWindow));
    const buf = Math.max(0, Math.floor(quotaBufferSec));
    return `Start ${s} · Window ${wh}h · Every ${im}m · Target ${runs} runs · Buffer +${buf}s`;
  }, [quotaStart, quotaWindowHours, quotaIntervalMin, quotaRunsPerWindow, quotaBufferSec]);

  const chainPreview = useMemo(() => {
    const s = parseFlexibleTime(chainStart);
    if (!s) return "";
    const wh = Math.max(1, Math.floor(chainWindowHours));
    const im = Math.max(1, Math.floor(chainIntervalMin));
    const runs = Math.max(1, Math.floor(chainRunsPerWindow));
    return `Start ${s} · Window ${wh}h · AfterFinish +${im}m · Target ${runs} runs`;
  }, [chainStart, chainWindowHours, chainIntervalMin, chainRunsPerWindow]);

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
    return run(() =>
      window.mouseScheduler.schedules.create({
        macroId,
        enabled,
        days: useDays,
        mode: mode === "SIMPLE" ? "INTERVAL" : mode,
        times: mode === "TIMES" ? times : [],
        interval:
          mode === "INTERVAL" || mode === "SIMPLE"
            ? {
                start:
                  mode === "SIMPLE"
                    ? addMinutesToTime(
                        parseFlexibleTime(simpleStart) ?? simpleStart,
                        Math.max(0, Math.floor(simpleOffsetMin))
                      )
                    : parseFlexibleTime(intervalStart) ?? intervalStart,
                end:
                  mode === "SIMPLE"
                    ? addMinutesToTime(
                        addHoursToTime(
                          parseFlexibleTime(simpleStart) ?? simpleStart,
                          Math.max(1, Math.floor(simpleActiveHours))
                        ),
                        Math.max(0, Math.floor(simpleOffsetMin)) - 1
                      )
                    : parseFlexibleTime(intervalEnd) ?? intervalEnd,
                everyMin: mode === "SIMPLE" ? 60 : intervalEveryMin
              }
            : undefined,
        quota:
          mode === "QUOTA"
            ? {
                start: parseFlexibleTime(quotaStart) ?? quotaStart,
                windowHours: quotaWindowHours,
                intervalMin: quotaIntervalMin,
                runsPerWindow: quotaRunsPerWindow,
                bufferSec: quotaBufferSec
              }
            : undefined,
        chain:
          mode === "CHAIN"
            ? {
                start: parseFlexibleTime(chainStart) ?? chainStart,
                windowHours: chainWindowHours,
                intervalMin: chainIntervalMin,
                runsPerWindow: chainRunsPerWindow
              }
            : undefined,
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

        <div className="row">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="SIMPLE">Basit Panel (önerilen)</option>
            <option value="TIMES">Belirli saatler</option>
            <option value="INTERVAL">Aralık (her N dk)</option>
            <option value="QUOTA">24 saatte X kere (quota)</option>
            <option value="CHAIN">Bitti + 60dk (09:10→10:10)</option>
          </select>
        {mode === "SIMPLE" ? (
          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Basit Plan</div>
            <small>
              Sadece şunu seç: başlangıç saati + günde kaç saat aktif + her saat çalış + (istersen) her saati +2dk kaydır.
              Uygulama 30 günlük planı otomatik hesaplar.
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
                  <b>Önizleme ({Math.max(1, Math.floor(simplePreviewDays))} gün):</b> Toplam{" "}
                  {simpleWindowPreview.total} çalıştırma. İlk 20:{" "}
                  {simpleWindowPreview.first.length ? simpleWindowPreview.first.join(" · ") : "—"}
                </small>
              </div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <span>Oluştur</span>
              <button
                className="primary"
                disabled={!macroId}
                onClick={() => {
                  setMode("SIMPLE");
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
                  setMode("SIMPLE");
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
                  setMode("SIMPLE");
                  setSimplePreviewDays(365);
                  return createScheduleNow();
                }}
              >
                Yıllık
              </button>
            </div>
          </div>
        ) : null}
          <span>Macro</span>
          <select value={macroId} onChange={(e) => setMacroId(e.target.value)}>
            {(macros ?? []).map((m) => (
              <option key={m.macroId} value={m.macroId}>
                {m.name}
              </option>
            ))}
          </select>
          <span>Policy</span>
          <select
            value={conflictPolicy}
            onChange={(e) => setConflictPolicy(e.target.value as ConflictPolicy)}
          >
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

        {mode === "TIMES" ? (
        <div className="row">
          <span>Times</span>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={normalizeTimeField}
            onWheel={onTimeWheel}
            onKeyDown={onTimeKeyDown}
            placeholder="0830 / 08:30"
            style={{ width: 140 }}
          />
          <button onClick={addTime}>Add</button>
          <div className="spacer" />
          <small>İpucu: mouse wheel/↑↓ ile dakika değişir (Shift=10dk). “0830” yaz → 08:30.</small>
        </div>
        ) : null}

        {mode === "TIMES" ? (
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Saat listesi</div>
            <small>Her bir saat tetikleyicidir. İstersen alttan “Her N dakikada bir” ile otomatik ekleyebilirsin.</small>
          </div>
          <div className="spacer" />
          <div className="row" style={{ gap: 8 }}>
            {times.map((t) => (
              <span key={t} className="pill">
                {t}{" "}
                <button
                  style={{ padding: "2px 8px", marginLeft: 6 }}
                  onClick={() => removeTime(t)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        ) : null}

        {mode === "TIMES" ? (
        <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="row">
            <div style={{ fontWeight: 600 }}>Her N dakikada bir (otomatik saat üret)</div>
            <div className="spacer" />
            <button
              onClick={() => {
                setEveryMin(60);
                setRangeStart("09:00");
                setRangeEnd("18:00");
              }}
            >
              Örnek: 09:00–18:00 her 60dk
            </button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span>Start</span>
            <input value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ width: 120 }} />
            <span>End</span>
            <input value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ width: 120 }} />
            <span>Every (min)</span>
            <input
              type="number"
              value={everyMin}
              onChange={(e) => setEveryMin(Number(e.target.value))}
              style={{ width: 120 }}
            />
            <button onClick={applyInterval}>Generate + Add</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <small>
              Not: Bu uygulama içi scheduler’dır. <b>Uygulama açıkken</b> belirtilen saatlerde macro otomatik çalışır.
            </small>
            <div style={{ marginTop: 8 }}>
              <small>
                <b>Next runs:</b> {nextRunsPreview.length ? nextRunsPreview.join(" · ") : "—"}
              </small>
            </div>
          </div>
        </div>
        ) : null}

        {mode === "INTERVAL" ? (
          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="row">
              <div style={{ fontWeight: 600 }}>Aralık modu (24 saat / 14 saat / 20 saat…)</div>
              <div className="spacer" />
              <label className="row">
                <input type="checkbox" checked={is24h} onChange={(e) => setIs24h(e.target.checked)} />
                <span>24 saat</span>
              </label>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>Start</span>
              <input
                value={intervalStart}
                onChange={(e) => setIntervalStart(e.target.value)}
                onBlur={() => {
                  const t = parseFlexibleTime(intervalStart);
                  if (t) setIntervalStart(t);
                }}
                style={{ width: 120 }}
                disabled={is24h}
              />
              <span>End</span>
              <input
                value={intervalEnd}
                onChange={(e) => setIntervalEnd(e.target.value)}
                onBlur={() => {
                  const t = parseFlexibleTime(intervalEnd);
                  if (t) setIntervalEnd(t);
                }}
                style={{ width: 120 }}
                disabled={is24h}
              />
              <span>Every (min)</span>
              <input
                type="number"
                value={intervalEveryMin}
                onChange={(e) => setIntervalEveryMin(Number(e.target.value))}
                style={{ width: 120 }}
              />
              <button onClick={() => setIntervalEveryMin(60)}>Her saat (60dk)</button>
              <button onClick={() => setIntervalEveryMin(2)}>2dk</button>
              <button onClick={() => setIntervalEveryMin(3)}>3dk</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <small>
                <b>Örnek:</b> 24 saat boyunca her 2 dakikada bir çalıştırmak için: 24 saat ✅ ve Every=2.
                Her saat başı ama 2dk gecikmeli için: Start=00:02, End=23:59, Every=60.
              </small>
              <div style={{ marginTop: 8 }}>
                <small>
                  <b>Preview:</b> {intervalPreview}
                </small>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "QUOTA" ? (
          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 600 }}>24 saatte X kere (saatlik aralıkla, macro uzunsa bazılarını atlar)</div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>Start</span>
              <input
                value={quotaStart}
                onChange={(e) => setQuotaStart(e.target.value)}
                onBlur={() => {
                  const t = parseFlexibleTime(quotaStart);
                  if (t) setQuotaStart(t);
                }}
                style={{ width: 120 }}
                placeholder="09:00"
              />
              <span>Window (h)</span>
              <input
                type="number"
                value={quotaWindowHours}
                onChange={(e) => setQuotaWindowHours(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <span>Every (min)</span>
              <input
                type="number"
                value={quotaIntervalMin}
                onChange={(e) => setQuotaIntervalMin(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <button onClick={() => setQuotaIntervalMin(60)}>Her saat</button>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>Target runs</span>
              <input
                type="number"
                value={quotaRunsPerWindow}
                onChange={(e) => setQuotaRunsPerWindow(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <span>+ Buffer (sec)</span>
              <input
                type="number"
                value={quotaBufferSec}
                onChange={(e) => setQuotaBufferSec(Math.max(0, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <button onClick={() => setQuotaRunsPerWindow(20)}>20</button>
              <button onClick={() => setQuotaBufferSec(5)}>+5s</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <small>
                Mantık: Start saatinden itibaren 24 saatlik pencerede, her “Every(min)” slotunda çalışmayı dener.
                Macro uzun sürerse ve slot kaçarsa <b>telafi etmez</b>, atlar.
              </small>
              <div style={{ marginTop: 8 }}>
                <small>
                  <b>Preview:</b> {quotaPreview}
                </small>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "CHAIN" ? (
          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontWeight: 600 }}>Bitti + 60dk (tam senin istediğin: 09:10→10:10→11:10)</div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>First start</span>
              <input
                value={chainStart}
                onChange={(e) => setChainStart(e.target.value)}
                onBlur={() => {
                  const t = parseFlexibleTime(chainStart);
                  if (t) setChainStart(t);
                }}
                style={{ width: 120 }}
                placeholder="09:10"
              />
              <span>Window (h)</span>
              <input
                type="number"
                value={chainWindowHours}
                onChange={(e) => setChainWindowHours(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <span>After finish + (min)</span>
              <input
                type="number"
                value={chainIntervalMin}
                onChange={(e) => setChainIntervalMin(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <button onClick={() => setChainIntervalMin(60)}>60</button>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>Target runs</span>
              <input
                type="number"
                value={chainRunsPerWindow}
                onChange={(e) => setChainRunsPerWindow(Math.max(1, Number(e.target.value)))}
                style={{ width: 120 }}
              />
              <button onClick={() => setChainRunsPerWindow(20)}>20</button>
              <button onClick={() => setChainRunsPerWindow(23)}>23</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <small>
                Mantık: İlk çalıştırma saatinde başlar. Macro <b>bittikten sonra</b> tam 60dk bekler ve tekrar başlar.
              </small>
              <div style={{ marginTop: 8 }}>
                <small>
                  <b>Preview:</b> {chainPreview}
                </small>
              </div>
            </div>
          </div>
        ) : null}

        <div className="row">
          <button
            className="primary"
            onClick={() => createScheduleNow()}
            disabled={
              !macroId ||
              days.length === 0 ||
              (mode === "TIMES"
                ? times.length === 0
                : mode === "INTERVAL"
                  ? intervalEveryMin <= 0
                  : mode === "SIMPLE"
                    ? simpleActiveHours <= 0
                  : mode === "QUOTA"
                    ? quotaRunsPerWindow <= 0 || quotaIntervalMin <= 0 || quotaWindowHours <= 0
                    : chainRunsPerWindow <= 0 || chainIntervalMin <= 0 || chainWindowHours <= 0)
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

