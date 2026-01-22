import { app, BrowserWindow } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { registerIpcHandlers } from "./registerIpcHandlers";
import { AppServices } from "./services/AppServices";
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from "./registerGlobalShortcuts";
import { stopSchedulerPowerBlocker, updateSchedulerPowerBlocker } from "./services/SchedulerPowerService";

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, "preload.js"),
    path.join(app.getAppPath(), "dist", "main", "main", "preload.js"),
    path.join(process.resourcesPath, "app", "dist", "main", "main", "preload.js")
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    // main: dist/main/main/main.js ; renderer: dist/renderer/index.html
    const indexHtml = path.join(__dirname, "..", "..", "renderer", "index.html");
    win.loadFile(indexHtml);
  }

  return win;
}

app.whenReady().then(async () => {
  const services = await AppServices.create();
  registerIpcHandlers(services);
  // Prevent macOS App Nap / background throttling from breaking scheduled jobs.
  await updateSchedulerPowerBlocker(services.storage);

  createWindow();
  registerGlobalShortcuts(services);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  unregisterGlobalShortcuts();
  stopSchedulerPowerBlocker();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

