import React, { useEffect, useState } from "react";

export function PermissionsScreen() {
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof window.mouseScheduler.permissions.getStatus>
  > | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    try {
      const s = await window.mouseScheduler.permissions.getStatus();
      setStatus(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>Permissions</h2>
        <div className="spacer" />
        <button onClick={refresh}>Refresh</button>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="row">
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 600 }}>Accessibility</div>
            <small>
              macOS’ta mouse kontrol/automation için Accessibility izni gerekir. İzin yoksa record/play
              bloklanır.
            </small>
          </div>
          <div className="spacer" />
          <span className={`pill ${status?.accessibilityTrusted ? "ok" : "bad"}`}>
            {status?.accessibilityTrusted ? "GRANTED" : "NOT GRANTED"}
          </span>
        </div>

        {err ? <span className="pill bad">{err}</span> : null}

        <div className="row">
          <button onClick={() => window.mouseScheduler.permissions.openAccessibilitySettings()}>
            Open System Settings
          </button>
          <button className="primary" onClick={() => window.mouseScheduler.permissions.promptForAccessibility()}>
            Prompt (if supported)
          </button>
        </div>

        <small>
          Not: Electron `systemPreferences.isTrustedAccessibilityClient(true)` bazı sürümlerde prompt
          gösterebilir; her durumda Settings ekranını açma butonu mevcut.
        </small>
      </div>
    </div>
  );
}

