import React, { useEffect, useMemo, useState } from "react";
import { useAsync } from "../lib/useAsync";

export function DashboardScreen() {
  const { data: macros, loading, error, reload } = useAsync(
    () => window.mouseScheduler.macros.list(),
    []
  );
  const [selectedMacroId, setSelectedMacroId] = useState<string>("");
  const [status, setStatus] = useState<Awaited<ReturnType<typeof window.mouseScheduler.status.get>> | null>(
    null
  );
  const [opError, setOpError] = useState<string | null>(null);
  const [lastRecordInfo, setLastRecordInfo] = useState<{
    savedAt: string;
    macroName: string;
    macroId: string;
    eventCount: number;
  } | null>(null);

  const selectedMacro = useMemo(
    () => macros?.find((m) => m.macroId === selectedMacroId) ?? null,
    [macros, selectedMacroId]
  );

  useEffect(() => {
    if (macros && macros.length > 0 && !selectedMacroId) {
      setSelectedMacroId(macros[0].macroId);
    }
  }, [macros, selectedMacroId]);

  useEffect(() => {
    let t: number | undefined;
    const tick = async () => {
      const s = await window.mouseScheduler.status.get();
      setStatus(s);
    };
    tick();
    t = window.setInterval(tick, 500);
    return () => {
      if (t) window.clearInterval(t);
    };
  }, []);

  // Keyboard shortcuts (app-focused):
  // Ctrl+R = Record, Ctrl+P = Pause/Resume, Ctrl+S = Stop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key === "r") {
        e.preventDefault();
        if (status?.mode === "IDLE" && selectedMacroId) {
          run(() => window.mouseScheduler.recorder.start({ macroId: selectedMacroId }));
        }
      } else if (key === "p") {
        e.preventDefault();
        if (status?.mode === "PLAYING") run(() => window.mouseScheduler.player.pause());
        else if (status?.mode === "PAUSED") run(() => window.mouseScheduler.player.resume());
      } else if (key === "s") {
        e.preventDefault();
        if (status?.mode === "RECORDING") stopRecording();
        else run(() => window.mouseScheduler.player.stop());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status?.mode, selectedMacroId]);

  const run = async (fn: () => Promise<unknown>) => {
    setOpError(null);
    try {
      const res = await fn();
      return res;
    } catch (e) {
      setOpError(e instanceof Error ? e.message : String(e));
    }
  };

  const stopRecording = async () => {
    const macro = (await run(() => window.mouseScheduler.recorder.stop())) as any;
    if (macro?.macroId) {
      setLastRecordInfo({
        savedAt: new Date(macro.updatedAt ?? Date.now()).toLocaleString(),
        macroName: macro.name ?? "Recorded Macro",
        macroId: macro.macroId,
        eventCount: Array.isArray(macro.events) ? macro.events.length : 0
      });
      // refresh macro list so event count/name updates are visible elsewhere
      reload();
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div className="spacer" />
        <span className={`pill ${status?.mode === "IDLE" ? "" : "ok"}`}>
          {status?.mode ?? "…"}
        </span>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Macro</div>
            <small>Record/Play işlemleri seçili macro üstünde çalışır.</small>
          </div>
          <div className="spacer" />
          <select
            value={selectedMacroId}
            onChange={(e) => setSelectedMacroId(e.target.value)}
            disabled={loading || !!error}
          >
            {(macros ?? []).map((m) => (
              <option key={m.macroId} value={m.macroId}>
                {m.name}
              </option>
            ))}
          </select>
          <button onClick={reload}>Refresh</button>
        </div>
        {error ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill bad">{error}</span>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Controls</div>
            <small>
              Acil durdurma kısayolu (örn. ESC 3sn) native hook ile eklenir; bu iskelette UI Stop
              her zaman aktif.
            </small>
            <small>
              Kısayollar: <b>Ctrl+R</b> Record, <b>Ctrl+P</b> Pause/Resume, <b>Ctrl+S</b> Stop
            </small>
          </div>
          <div className="spacer" />
          <button
            className="primary"
            onClick={() =>
              run(() =>
                window.mouseScheduler.recorder.start({
                  macroId: selectedMacroId || undefined
                })
              )
            }
            disabled={!selectedMacroId || status?.mode !== "IDLE"}
          >
            Record
          </button>
          <button
            onClick={stopRecording}
            disabled={status?.mode !== "RECORDING"}
          >
            Stop Record
          </button>
          <button
            className="primary"
            onClick={() =>
              run(() =>
                window.mouseScheduler.player.play({
                  macroId: selectedMacroId,
                  speedMultiplier: 1,
                  minDelayMs: 20
                })
              )
            }
            disabled={!selectedMacroId || (status?.mode !== "IDLE" && status?.mode !== "PAUSED")}
          >
            Play
          </button>
          <button
            onClick={() => run(() => window.mouseScheduler.player.pause())}
            disabled={status?.mode !== "PLAYING"}
          >
            Pause
          </button>
          <button
            onClick={() => run(() => window.mouseScheduler.player.resume())}
            disabled={status?.mode !== "PAUSED"}
          >
            Resume
          </button>
          <button className="danger" onClick={() => run(() => window.mouseScheduler.player.stop())}>
            Stop
          </button>
        </div>
        {opError ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill bad">{opError}</span>
          </div>
        ) : null}
        {lastRecordInfo ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill ok">
              Saved {lastRecordInfo.savedAt} · {lastRecordInfo.macroName} ({lastRecordInfo.macroId}) ·{" "}
              {lastRecordInfo.eventCount} events
            </span>
          </div>
        ) : null}
        <div style={{ marginTop: 10 }}>
          <small>
            Seçili macro: <b>{selectedMacro?.name ?? "—"}</b>
          </small>
        </div>
      </div>
    </div>
  );
}

