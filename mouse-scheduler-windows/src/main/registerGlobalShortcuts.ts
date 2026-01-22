import { BrowserWindow, globalShortcut } from "electron";
import type { AppServices } from "./services/AppServices";
import type { MacroEvent } from "../shared/models";

function requireAccessibility(_services: AppServices) {
  // no-op on Windows
}

export function registerGlobalShortcuts(services: AppServices) {
  const bringToFront = () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    } catch {
      // ignore
    }
  };

  const minimizeToBackground = () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      win.minimize();
    } catch {
      // ignore
    }
  };

  const startRecord = async () => {
    try {
      requireAccessibility(services);
      const st = services.status.get();
      if (st.mode !== "IDLE") return;
      await services.recorder.start(undefined);
      minimizeToBackground();
    } catch {
      // swallow
    }
  };

  const stopRecord = async () => {
    try {
      const st = services.status.get();
      if (st.mode !== "RECORDING") return;
      bringToFront();
      await services.recorder.stop(async (events: MacroEvent[], macroId?: string) => {
        if (macroId) {
          await services.storage.updateMacroEvents(macroId, events);
          return services.storage.getMacro(macroId);
        }
        const created = await services.storage.createMacro(`Recorded ${new Date().toLocaleString()}`);
        await services.storage.updateMacroEvents(created.macroId, events);
        return services.storage.getMacro(created.macroId);
      });
    } catch {
      // swallow
    }
  };

  const stopAll = async () => {
    try {
      bringToFront();
      services.coordinator.cancelAll();
      await services.player.stop();
    } catch {
      // swallow
    }
  };

  const togglePause = async () => {
    try {
      const rec = services.recorder.getStatus();
      if (rec.mode === "RECORDING") {
        bringToFront();
        await services.recorder.pause();
        return;
      }
      if (rec.mode === "RECORDING_PAUSED") {
        bringToFront();
        await services.recorder.resume();
        minimizeToBackground();
        return;
      }

      const st = services.player.getStatus();
      if (st.mode === "PLAYING") {
        bringToFront();
        await services.player.pause();
      } else if (st.mode === "PAUSED") {
        bringToFront();
        await services.player.resume();
        minimizeToBackground();
      }
    } catch {
      // swallow
    }
  };

  globalShortcut.register("CommandOrControl+R", () => void startRecord());
  globalShortcut.register("CommandOrControl+P", () => void togglePause());
  globalShortcut.register("CommandOrControl+D", () => void togglePause());
  globalShortcut.register("CommandOrControl+S", () => void stopRecord());
  globalShortcut.register("CommandOrControl+Shift+S", () => void stopAll());
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}

