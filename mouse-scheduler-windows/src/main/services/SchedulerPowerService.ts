import { powerSaveBlocker } from "electron";
import type { Storage } from "../../storage/storage";

let blockerId: number | null = null;

export async function updateSchedulerPowerBlocker(storage: Storage) {
  try {
    const schedules = await storage.listSchedules();
    const hasEnabled = schedules.some((s) => s.enabled);
    if (hasEnabled) {
      if (blockerId == null || !powerSaveBlocker.isStarted(blockerId)) {
        blockerId = powerSaveBlocker.start("prevent-display-sleep");
      }
    } else {
      if (blockerId != null && powerSaveBlocker.isStarted(blockerId)) {
        powerSaveBlocker.stop(blockerId);
      }
      blockerId = null;
    }
  } catch {
    // ignore
  }
}

export function stopSchedulerPowerBlocker() {
  try {
    if (blockerId != null && powerSaveBlocker.isStarted(blockerId)) {
      powerSaveBlocker.stop(blockerId);
    }
  } catch {
    // ignore
  } finally {
    blockerId = null;
  }
}

