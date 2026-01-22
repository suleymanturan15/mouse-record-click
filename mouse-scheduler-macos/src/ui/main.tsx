import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./screens/App";
import "./styles.css";

function showFatalError(title: string, details: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="padding:20px;font-family:ui-sans-serif,system-ui;color:#e9ecf5">
      <h2 style="margin:0 0 10px 0">${title}</h2>
      <div style="opacity:.8;margin-bottom:12px">Renderer crashed. Copy the text below and send it.</div>
      <pre style="white-space:pre-wrap;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);padding:12px;border-radius:12px;overflow:auto">${details}</pre>
    </div>
  `;
}

window.addEventListener("error", (e) => {
  showFatalError("UI Error", String(e.error?.stack ?? e.message ?? e));
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  showFatalError("Unhandled Promise Rejection", String(reason?.stack ?? reason ?? e));
});

// If preload bridge fails, show a clear message instead of crashing.
if (!(window as any).mouseScheduler) {
  showFatalError(
    "Preload bridge missing",
    "window.mouseScheduler is undefined.\n\nFix: reinstall from the latest DMG (Replace app in Applications).\nIf it still happens, the preload script is not loading in the packaged app."
  );
} else {
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
}

