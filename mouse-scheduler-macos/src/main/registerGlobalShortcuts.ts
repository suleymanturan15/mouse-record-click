import { app, BrowserWindow, globalShortcut } from "electron";
import type { AppServices } from "./services/AppServices";
import type { MacroEvent } from "../shared/models";

function requireAccessibility(services: AppServices) {
  if (process.platform !== "darwin") return;
  if (!services.permissions.getAccessibilityTrusted()) {
    throw new Error(
      "Accessibility permission is required for global record/playback shortcuts. Open Permissions screen to grant it."
    );
  }
}

export function registerGlobalShortcuts(services: AppServices) {
  const bringToFront = () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      if (process.platform === "darwin") {
        // If the app is hidden/minimized, bring it back visibly.
        try {
          app.dock?.show();
        } catch {
          // ignore
        }
      }
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
      // Record into a new macro by default (no selected macro required)
      await services.recorder.start(undefined);
      // user requested: when record starts, app should get out of the way
      minimizeToBackground();
    } catch {
      // swallow (no UI in global shortcut)
    }
  };

  const stopRecord = async () => {
    try {
      requireAccessibility(services);
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
      const st = services.status.get();
      if (st.mode === "PLAYING") {
        bringToFront();
        await services.player.pause();
      } else if (st.mode === "PAUSED") {
        bringToFront();
        await services.player.resume();
        // user requested: when resuming, go back to background
        minimizeToBackground();
      }
    } catch {
      // swallow
    }
  };

  // User requested Ctrl+R / Ctrl+S even when app is background.
  // On macOS, CommandOrControl maps to Command; we also register Control explicitly.
  globalShortcut.register("CommandOrControl+R", () => void startRecord());
  globalShortcut.register("CommandOrControl+P", () => void togglePause());
  // User asked: Ctrl+S should stop recording AND bring app to front.
  globalShortcut.register("CommandOrControl+S", () => void stopRecord());

  if (process.platform === "darwin") {
    globalShortcut.register("Control+R", () => void startRecord());
    globalShortcut.register("Control+P", () => void togglePause());
    globalShortcut.register("Control+S", () => void stopRecord());
  } else {
    // On Windows/Linux Ctrl is already covered by CommandOrControl.
    globalShortcut.register("Control+S", () => void stopRecord());
  }

  // Optional: stop playback quickly too
  globalShortcut.register("CommandOrControl+Shift+S", () => void stopAll());
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}

