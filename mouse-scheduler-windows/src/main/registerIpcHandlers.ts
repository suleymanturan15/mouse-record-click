import { app, ipcMain } from "electron";
import { IPC_CHANNEL } from "../shared/ipc";
import type { MacroEvent, Schedule } from "../shared/models";
import { AppServices } from "./services/AppServices";

export function registerIpcHandlers(services: AppServices) {
  ipcMain.handle(IPC_CHANNEL, async (_evt, payload: { method: string; args?: any }) => {
    const { method, args } = payload ?? {};

    const requireAccessibility = () => {
      if (process.platform !== "darwin") return;
      if (!services.permissions.getAccessibilityTrusted()) {
        throw new Error(
          "Accessibility permission is required for record/playback. Open Permissions screen to grant it."
        );
      }
    };

    switch (method) {
      case "app.getVersion":
        return app.getVersion();

      // Status
      case "status.get":
        return services.status.get();

      // Permissions
      case "permissions.getStatus":
        return {
          accessibilityTrusted: services.permissions.getAccessibilityTrusted(),
          platform: services.permissions.getPlatform()
        };
      case "permissions.openAccessibilitySettings":
        await services.permissions.openAccessibilitySettings();
        return;
      case "permissions.promptForAccessibility":
        services.permissions.promptAccessibility();
        return;

      // Macros
      case "macros.list":
        return services.storage.listMacros();
      case "macros.get":
        return services.storage.getMacro(args.macroId);
      case "macros.create":
        return services.storage.createMacro(String(args.name ?? "New Macro"));
      case "macros.rename":
        await services.storage.renameMacro(String(args.macroId), String(args.name));
        return;
      case "macros.copy":
        return services.storage.copyMacro(String(args.macroId));
      case "macros.remove":
        await services.storage.removeMacro(String(args.macroId));
        await services.scheduler.reload().catch(() => {});
        return;
      case "macros.updateEvents":
        await services.storage.updateMacroEvents(String(args.macroId), args.events as MacroEvent[]);
        return;
      case "macros.exportJson":
        await services.storage.exportMacroJson(String(args.macroId));
        return;
      case "macros.exportAllJson":
        await services.storage.exportAllMacrosJson();
        return;
      case "macros.importJson":
        await services.storage.importMacroJson();
        return;

      // Schedules
      case "schedules.list":
        return services.storage.listSchedules();
      case "schedules.create": {
        const created = await services.storage.createSchedule(args as any);
        await services.scheduler.reload().catch(() => {});
        return created;
      }
      case "schedules.update":
        await services.storage.patchSchedule(String(args.scheduleId), args.patch as Partial<Schedule>);
        await services.scheduler.reload().catch(() => {});
        return;
      case "schedules.remove":
        await services.storage.removeSchedule(String(args.scheduleId));
        await services.scheduler.reload().catch(() => {});
        return;

      case "scheduler.reload":
        await services.scheduler.reload();
        return;

      // Recorder
      case "recorder.start": {
        requireAccessibility();
        const st = services.status.get();
        if (st.mode !== "IDLE") throw new Error(`Cannot start recording while mode=${st.mode}`);
        await services.recorder.start(args?.macroId);
        return;
      }
      case "recorder.stop": {
        requireAccessibility();
        const m = await services.recorder.stop(async (events: MacroEvent[], macroId?: string) => {
          if (macroId) {
            await services.storage.updateMacroEvents(macroId, events);
            return services.storage.getMacro(macroId);
          }
          const created = await services.storage.createMacro(`Recorded ${new Date().toLocaleString()}`);
          await services.storage.updateMacroEvents(created.macroId, events);
          return services.storage.getMacro(created.macroId);
        });
        return m;
      }
      case "recorder.pause":
        requireAccessibility();
        await services.recorder.pause();
        return;
      case "recorder.resume":
        requireAccessibility();
        await services.recorder.resume();
        return;

      // Player
      case "player.play": {
        requireAccessibility();
        const macroId = String(args.macroId);
        const macro = await services.storage.getMacro(macroId);
        await services.player.play(macro, {
          speedMultiplier: args.speedMultiplier,
          minDelayMs: args.minDelayMs
        });
        return;
      }
      case "player.pause":
        await services.player.pause();
        return;
      case "player.resume":
        await services.player.resume();
        return;
      case "player.stop":
        services.coordinator.cancelAll();
        await services.player.stop();
        return;

      case "runner.runNow": {
        requireAccessibility();
        const macroId = String(args.macroId);
        const macro = await services.storage.getMacro(macroId);
        await services.coordinator.trigger({
          macro,
          conflictPolicy: args.conflictPolicy ?? "QUEUE",
          preRunCountdownSec: Number(args.preRunCountdownSec ?? 0),
          repeatCount: Number(args.repeatCount ?? 1),
          source: "manual"
        });
        return;
      }

      default:
        throw new Error(`Unknown IPC method: ${method}`);
    }
  });
}

