import type { ConflictPolicy, Macro } from "../shared/models";
import { sleep } from "../automation/playerAdapter";
import { PlayerService } from "../automation/playerService";

type RunRequest = {
  macro: Macro;
  conflictPolicy: ConflictPolicy;
  preRunCountdownSec: number;
  repeatCount?: number;
  source?: string;
};

export class RunCoordinator {
  private player: PlayerService;
  private queue: RunRequest[] = [];
  private draining = false;
  private cancelToken = 0;

  constructor(player: PlayerService) {
    this.player = player;
  }

  cancelAll() {
    this.cancelToken++;
    this.queue = [];
  }

  async trigger(req: RunRequest) {
    const status = this.player.getStatus();
    if (status.mode === "IDLE") {
      await this.execute(req);
      return;
    }

    switch (req.conflictPolicy) {
      case "SKIP":
        return;
      case "RESTART":
        await this.player.stop();
        await this.execute(req);
        return;
      case "QUEUE":
        this.queue.push(req);
        this.drain();
        return;
    }
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const status = this.player.getStatus();
        if (status.mode !== "IDLE") {
          await sleep(250);
          continue;
        }
        const next = this.queue.shift()!;
        await this.execute(next);
      }
    } finally {
      this.draining = false;
    }
  }

  private async execute(req: RunRequest) {
    const token = this.cancelToken;
    if (req.preRunCountdownSec > 0) {
      await sleep(req.preRunCountdownSec * 1000);
    }
    const repeat = Math.max(1, Math.floor(req.repeatCount ?? 1));
    for (let i = 0; i < repeat; i++) {
      if (this.cancelToken !== token) break;
      await this.player.play(req.macro, { speedMultiplier: 1, minDelayMs: 20 });
    }
  }
}

