import { contextBridge, ipcRenderer } from "electron";
import type { RendererApi } from "../shared/ipc";
import { IPC_CHANNEL } from "../shared/ipc";

function invoke(method: string, args?: unknown) {
  return ipcRenderer.invoke(IPC_CHANNEL, { method, args });
}

const api: RendererApi = {
  app: {
    getVersion: () => invoke("app.getVersion")
  },
  status: {
    get: () => invoke("status.get")
  },
  permissions: {
    getStatus: () => invoke("permissions.getStatus"),
    openAccessibilitySettings: () => invoke("permissions.openAccessibilitySettings"),
    promptForAccessibility: () => invoke("permissions.promptForAccessibility")
  },
  macros: {
    list: () => invoke("macros.list"),
    get: (args: Parameters<RendererApi["macros"]["get"]>[0]) => invoke("macros.get", args),
    create: (args: Parameters<RendererApi["macros"]["create"]>[0]) => invoke("macros.create", args),
    rename: (args: Parameters<RendererApi["macros"]["rename"]>[0]) => invoke("macros.rename", args),
    copy: (args: Parameters<RendererApi["macros"]["copy"]>[0]) => invoke("macros.copy", args),
    remove: (args: Parameters<RendererApi["macros"]["remove"]>[0]) => invoke("macros.remove", args),
    updateEvents: (args: Parameters<RendererApi["macros"]["updateEvents"]>[0]) =>
      invoke("macros.updateEvents", args),
    exportJson: (args: Parameters<RendererApi["macros"]["exportJson"]>[0]) =>
      invoke("macros.exportJson", args),
    exportAllJson: () => invoke("macros.exportAllJson"),
    importJson: () => invoke("macros.importJson")
  },
  schedules: {
    list: () => invoke("schedules.list"),
    create: (args: Parameters<RendererApi["schedules"]["create"]>[0]) => invoke("schedules.create", args),
    update: (args: Parameters<RendererApi["schedules"]["update"]>[0]) => invoke("schedules.update", args),
    remove: (args: Parameters<RendererApi["schedules"]["remove"]>[0]) => invoke("schedules.remove", args)
  },
  scheduler: {
    reload: () => invoke("scheduler.reload")
  },
  recorder: {
    start: (args: Parameters<RendererApi["recorder"]["start"]>[0]) => invoke("recorder.start", args),
    stop: () => invoke("recorder.stop")
  },
  player: {
    play: (args: Parameters<RendererApi["player"]["play"]>[0]) => invoke("player.play", args),
    pause: () => invoke("player.pause"),
    resume: () => invoke("player.resume"),
    stop: () => invoke("player.stop")
  }
};

contextBridge.exposeInMainWorld("mouseScheduler", api);

