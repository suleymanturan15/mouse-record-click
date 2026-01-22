import type { AppStatus, Macro } from "../shared/models";
import type { RecorderAdapter } from "./recorderAdapter";

export class RecorderService {
  private adapter: RecorderAdapter;
  private statusSetter: (s: AppStatus) => void;
  private active = false;
  private macroId?: string;
  constructor(adapter: RecorderAdapter, statusSetter: (s: AppStatus) => void) {
    this.adapter = adapter;
    this.statusSetter = statusSetter;
  }

  getStatus(): AppStatus {
    return this.active ? { mode: "RECORDING", activeMacroId: this.macroId } : { mode: "IDLE" };
  }

  async start(macroId?: string) {
    if (this.active) throw new Error("Already recording");
    await this.adapter.ensureReady();
    this.macroId = macroId;
    this.active = true;
    this.statusSetter({ mode: "RECORDING", activeMacroId: macroId });
    await this.adapter.start();
  }

  async stop(createMacro: (events: any[], macroId?: string) => Promise<Macro>) {
    if (!this.active) throw new Error("Not recording");
    const events = await this.adapter.stop();
    this.active = false;
    this.statusSetter({ mode: "IDLE" });
    const m = await createMacro(events, this.macroId);
    this.macroId = undefined;
    return m;
  }
}

