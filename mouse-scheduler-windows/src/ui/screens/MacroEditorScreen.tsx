import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { MacroEvent } from "../../shared/models";
import { useAsync } from "../lib/useAsync";

export function MacroEditorScreen() {
  const { macroId } = useParams();
  const { data: macro, loading, error, reload } = useAsync(
    () => window.mouseScheduler.macros.get({ macroId: macroId! }),
    [macroId]
  );
  const [opError, setOpError] = useState<string | null>(null);

  const [draft, setDraft] = useState<MacroEvent[] | null>(null);

  const events = useMemo(() => draft ?? macro?.events ?? [], [draft, macro?.events]);

  const setEvent = (idx: number, next: MacroEvent) => {
    const copy = [...events];
    copy[idx] = next;
    setDraft(copy);
  };

  const removeEvent = (idx: number) => {
    const copy = [...events];
    copy.splice(idx, 1);
    setDraft(copy);
  };

  const addWait = () => {
    setDraft([...events, { type: "wait", ms: 500 }]);
  };

  const save = async () => {
    if (!macroId) return;
    setOpError(null);
    try {
      await window.mouseScheduler.macros.updateEvents({ macroId, events });
      setDraft(null);
      await reload();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>Macro Editor</h2>
        <div className="spacer" />
        <Link to="/macros">
          <button>Back</button>
        </Link>
      </div>

      <div className="card">
        {loading ? <small>Loading…</small> : null}
        {error ? <span className="pill bad">{error}</span> : null}
        {macro ? (
          <div className="row">
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 600 }}>{macro.name}</div>
              <small>
                Kayıt event’leri + manuel <code>wait</code> satırları. (Sürükle-bırak opsiyonel.)
              </small>
            </div>
            <div className="spacer" />
            <button onClick={addWait}>Add wait</button>
            <button className="primary" onClick={save} disabled={!draft}>
              Save
            </button>
          </div>
        ) : null}
        {opError ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill bad">{opError}</span>
          </div>
        ) : null}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Data</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{ev.type}</td>
                <td>
                  {ev.type === "wait" ? (
                    <div className="row">
                      <span>ms</span>
                      <input
                        style={{ width: 120 }}
                        type="number"
                        value={ev.ms}
                        onChange={(e) => setEvent(idx, { ...ev, ms: Number(e.target.value) })}
                      />
                    </div>
                  ) : ev.type === "key_tap" ? (
                    <div className="row">
                      <span>key</span>
                      <input
                        style={{ width: 160 }}
                        value={ev.key}
                        onChange={(e) => setEvent(idx, { ...ev, key: e.target.value })}
                      />
                      {"deltaMs" in ev ? (
                        <>
                          <span>delta</span>
                          <input
                            style={{ width: 100 }}
                            type="number"
                            value={(ev as any).deltaMs ?? 0}
                            onChange={(e) =>
                              setEvent(idx, { ...(ev as any), deltaMs: Number(e.target.value) })
                            }
                          />
                        </>
                      ) : null}
                      {ev.modifiers?.length ? <small>mods: {ev.modifiers.join("+")}</small> : <small />}
                    </div>
                  ) : "x" in ev && "y" in ev ? (
                    <div className="row">
                      <span>x</span>
                      <input
                        style={{ width: 90 }}
                        type="number"
                        value={ev.x}
                        onChange={(e) => setEvent(idx, { ...(ev as any), x: Number(e.target.value) })}
                      />
                      <span>y</span>
                      <input
                        style={{ width: 90 }}
                        type="number"
                        value={ev.y}
                        onChange={(e) => setEvent(idx, { ...(ev as any), y: Number(e.target.value) })}
                      />
                      {"deltaMs" in ev ? (
                        <>
                          <span>delta</span>
                          <input
                            style={{ width: 100 }}
                            type="number"
                            value={(ev as any).deltaMs ?? 0}
                            onChange={(e) =>
                              setEvent(idx, { ...(ev as any), deltaMs: Number(e.target.value) })
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  ) : "deltaMs" in ev ? (
                    <div className="row">
                      <span>delta</span>
                      <input
                        style={{ width: 100 }}
                        type="number"
                        value={(ev as any).deltaMs ?? 0}
                        onChange={(e) => setEvent(idx, { ...(ev as any), deltaMs: Number(e.target.value) })}
                      />
                    </div>
                  ) : (
                    <small>—</small>
                  )}
                </td>
                <td>
                  <button className="danger" onClick={() => removeEvent(idx)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <small>Henüz event yok. Recorder ile kayıt alabilir veya “Add wait” ekleyebilirsiniz.</small>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

