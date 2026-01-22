import type { AppStatus, Macro } from "../shared/models";
import type { PlayerAdapter } from "./playerAdapter";
import { computeDelayMs, sleep } from "./playerAdapter";

export class PlayerService {
  private adapter: PlayerAdapter;
  private statusSetter: (s: AppStatus) => void;
  private abort?: AbortController;
  private paused = false;
  private pauseWaiters: Array<() => void> = [];
  private currentMacroId?: string;

  constructor(adapter: PlayerAdapter, statusSetter: (s: AppStatus) => void) {
    this.adapter = adapter;
    this.statusSetter = statusSetter;
  }

  getStatus(): AppStatus {
    if (this.abort) {
      return { mode: this.paused ? "PAUSED" : "PLAYING", activeMacroId: this.currentMacroId };
    }
    return { mode: "IDLE" };
  }

  async play(macro: Macro, opts: { speedMultiplier?: number; minDelayMs?: number }) {
    if (this.abort && !this.paused) throw new Error("Already playing");
    if (this.abort && this.paused) {
      // If paused, resume will continue current macro; explicit play acts as resume
      await this.resume();
      return;
    }
    await this.adapter.ensureReady();
    this.abort = new AbortController();
    this.paused = false;
    this.currentMacroId = macro.macroId;
    this.statusSetter({ mode: "PLAYING", activeMacroId: macro.macroId });

    const { speedMultiplier = 1, minDelayMs = 20 } = opts;
    try {
      for (const ev of macro.events) {
        await this.waitIfPaused();
        const delay = computeDelayMs(ev as any, speedMultiplier, minDelayMs);
        // Make pause responsive even during long delays by sleeping in small chunks.
        await this.sleepWithPause(delay);
        await this.waitIfPaused();
        if (ev.type === "wait") continue;
        if (ev.type === "move") await this.adapter.move(ev.x, ev.y);
        else if (ev.type === "left_click") await this.adapter.click("left", false);
        else if (ev.type === "right_click") await this.adapter.click("right", false);
        else if (ev.type === "double_click") await this.adapter.click("left", true);
        else if (ev.type === "mouse_down") await this.adapter.down(ev.button);
        else if (ev.type === "mouse_up") await this.adapter.up(ev.button);
        else if (ev.type === "key_tap") await this.adapter.keyTap(ev.key, ev.modifiers);
        else if (ev.type === "scroll") await this.adapter.scroll(ev.dx, ev.dy);
      }
    } catch (e: any) {
      if (String(e?.message ?? e).includes("Aborted")) {
        // swallow abort
      } else {
        this.stopInternal();
        throw e;
      }
    }

    this.stopInternal();
  }

  async pause() {
    if (!this.abort) return;
    this.paused = true;
    this.statusSetter({ mode: "PAUSED", activeMacroId: this.currentMacroId });
  }

  async resume() {
    if (!this.abort) return;
    if (!this.paused) return;
    this.paused = false;
    this.statusSetter({ mode: "PLAYING", activeMacroId: this.currentMacroId });
    const waiters = [...this.pauseWaiters];
    this.pauseWaiters = [];
    waiters.forEach((w) => w());
  }

  async stop() {
    if (!this.abort) return;
    this.abort.abort();
    this.stopInternal();
  }

  private stopInternal() {
    this.abort = undefined;
    this.paused = false;
    this.currentMacroId = undefined;
    this.pauseWaiters = [];
    this.statusSetter({ mode: "IDLE" });
  }

  private async waitIfPaused() {
    if (!this.paused) return;
    await new Promise<void>((resolve) => this.pauseWaiters.push(resolve));
  }

  private async sleepWithPause(totalMs: number) {
    if (!this.abort) return;
    let remaining = Math.max(0, Math.floor(totalMs));
    while (remaining > 0) {
      await this.waitIfPaused();
      const slice = Math.min(remaining, 50);
      await sleep(slice, this.abort.signal);
      remaining -= slice;
    }
  }
}

