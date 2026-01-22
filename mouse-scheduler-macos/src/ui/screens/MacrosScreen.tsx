import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../lib/useAsync";

export function MacrosScreen() {
  const { data: macros, loading, error, reload } = useAsync(
    () => window.mouseScheduler.macros.list(),
    []
  );
  const [name, setName] = useState("New Macro");
  const [opError, setOpError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setOpError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>Macros</h2>
        <div className="spacer" />
        <button onClick={reload} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Macro name" />
          <button
            className="primary"
            onClick={() => run(() => window.mouseScheduler.macros.create({ name }))}
          >
            Create
          </button>
          <div className="spacer" />
          <button onClick={() => run(() => window.mouseScheduler.macros.importJson())}>
            Import JSON
          </button>
          <button onClick={() => run(() => window.mouseScheduler.macros.exportAllJson())}>
            Export All
          </button>
        </div>
        {opError ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill bad">{opError}</span>
          </div>
        ) : null}
        {error ? (
          <div style={{ marginTop: 10 }}>
            <span className="pill bad">{error}</span>
          </div>
        ) : null}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Events</th>
              <th>Updated</th>
              <th style={{ width: 340 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(macros ?? []).map((m) => (
              <tr key={m.macroId}>
                <td>
                  <Link to={`/macros/${m.macroId}`}>{m.name}</Link>
                </td>
                <td>{m.events.length}</td>
                <td>
                  <small>{new Date(m.updatedAt).toLocaleString()}</small>
                </td>
                <td>
                  <div className="row">
                    <button
                      onClick={() =>
                        run(() =>
                          window.mouseScheduler.macros.rename({
                            macroId: m.macroId,
                            name: prompt("New name", m.name) ?? m.name
                          })
                        )
                      }
                    >
                      Rename
                    </button>
                    <button onClick={() => run(() => window.mouseScheduler.macros.copy({ macroId: m.macroId }))}>
                      Copy
                    </button>
                    <button onClick={() => run(() => window.mouseScheduler.macros.exportJson({ macroId: m.macroId }))}>
                      Export
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        run(() =>
                          window.confirm(`Delete macro "${m.name}"?`)
                            ? window.mouseScheduler.macros.remove({ macroId: m.macroId })
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
            {(macros ?? []).length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <small>Henüz macro yok. “Create” ile başlayın.</small>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

