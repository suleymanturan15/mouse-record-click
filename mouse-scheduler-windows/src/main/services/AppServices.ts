import { app } from "electron";
import { createDefaultAdapters } from "../../automation";
import { PlayerService } from "../../automation/playerService";
import { RecorderService } from "../../automation/recorderService";
import { SchedulerService } from "../../scheduler/schedulerService";
import { RunCoordinator } from "../../scheduler/runCoordinator";
import { Storage } from "../../storage/storage";
import { PermissionService } from "./PermissionService";
import { StatusStore } from "./StatusStore";
import type { Macro } from "../../shared/models";
import type { AppStatus } from "../../shared/models";

export class AppServices {
  storage: Storage;
  permissions: PermissionService;
  status: StatusStore;
  player: PlayerService;
  recorder: RecorderService;
  scheduler: SchedulerService;
  coordinator: RunCoordinator;

  private constructor(args: {
    storage: Storage;
    permissions: PermissionService;
    status: StatusStore;
    player: PlayerService;
    recorder: RecorderService;
    scheduler: SchedulerService;
    coordinator: RunCoordinator;
  }) {
    this.storage = args.storage;
    this.permissions = args.permissions;
    this.status = args.status;
    this.player = args.player;
    this.recorder = args.recorder;
    this.scheduler = args.scheduler;
    this.coordinator = args.coordinator;
  }

  static async create() {
    const storage = Storage.createForApp();
    const permissions = new PermissionService();
    const status = new StatusStore();

    const adapters = await createDefaultAdapters();
    const player = new PlayerService(adapters.player, (s: AppStatus) => status.set(s));
    const recorder = new RecorderService(adapters.recorder, (s: AppStatus) => status.set(s));

    const coordinator = new RunCoordinator(player);
    const scheduler = new SchedulerService(storage, coordinator);

    await scheduler.reload().catch(() => {});

    // Ensure there is at least one macro for UX
    const macros = await storage.listMacros();
    if (macros.length === 0) {
      await storage.createMacro("Macro 1");
    }

    // Optional: parse CLI args e.g. --run-macro=m1 (used by Windows Task Scheduler design)
    const arg = process.argv.find((x) => x.startsWith("--run-macro="));
    if (arg) {
      const macroId = arg.split("=")[1];
      if (macroId) {
        setTimeout(async () => {
          try {
            const macro: Macro = await storage.getMacro(macroId);
            await coordinator.trigger({
              macro,
              conflictPolicy: "RESTART",
              preRunCountdownSec: 0,
              source: "cli"
            });
          } catch {
            // ignore
          }
        }, 1500);
      }
    }

    app.on("before-quit", () => {
      player.stop().catch(() => {});
    });

    return new AppServices({ storage, permissions, status, player, recorder, scheduler, coordinator });
  }
}

