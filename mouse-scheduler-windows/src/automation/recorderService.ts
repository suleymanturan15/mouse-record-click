import type { AppStatus, Macro } from "../shared/models";
import type { RecorderAdapter } from "./recorderAdapter";

export class RecorderService {
  private adapter: RecorderAdapter;
  private statusSetter: (s: AppStatus) => void;
  private active = false;
  private paused = false;
  private macroId?: string;
  constructor(adapter: RecorderAdapter, statusSetter: (s: AppStatus) => void) {
    this.adapter = adapter;
    this.statusSetter = statusSetter;
  }

  getStatus(): AppStatus {
    if (!this.active) return { mode: "IDLE" };
    return this.paused
      ? { mode: "RECORDING_PAUSED", activeMacroId: this.macroId }
      : { mode: "RECORDING", activeMacroId: this.macroId };
  }

  async start(macroId?: string) {
    if (this.active) throw new Error("Already recording");
    await this.adapter.ensureReady();
    this.macroId = macroId;
    this.active = true;
    this.paused = false;
    this.statusSetter({ mode: "RECORDING", activeMacroId: macroId });
    await this.adapter.start();
  }

  async pause() {
    if (!this.active) return;
    if (this.paused) return;
    this.paused = true;
    await this.adapter.pause();
    this.statusSetter({ mode: "RECORDING_PAUSED", activeMacroId: this.macroId });
  }

  async resume() {
    if (!this.active) return;
    if (!this.paused) return;
    this.paused = false;
    await this.adapter.resume();
    this.statusSetter({ mode: "RECORDING", activeMacroId: this.macroId });
  }

  async stop(createMacro: (events: any[], macroId?: string) => Promise<Macro>) {
    if (!this.active) throw new Error("Not recording");
    const events = await this.adapter.stop();
    this.active = false;
    this.paused = false;
    this.statusSetter({ mode: "IDLE" });
    const m = await createMacro(events, this.macroId);
    this.macroId = undefined;
    return m;
  }
}

