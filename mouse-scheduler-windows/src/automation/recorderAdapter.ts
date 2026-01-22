import type { MacroEvent } from "../shared/models";

export type RecorderOptions = {
  throttleMoveMs?: number;
};

export interface RecorderAdapter {
  ensureReady(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<MacroEvent[]>;
}

export async function createUiohookRecorderAdapter(
  options: RecorderOptions = {}
): Promise<RecorderAdapter> {
  const throttleMoveMs = options.throttleMoveMs ?? 15;
  let uiohook: any;
  try {
    uiohook = (await import("uiohook-napi")).uIOhook ?? (await import("uiohook-napi")).default?.uIOhook;
  } catch {
    throw new Error(
      "Recorder adapter missing: install a global mouse hook library (e.g. uiohook-napi) to enable recording."
    );
  }

  let started = false;
  let events: MacroEvent[] = [];
  let lastTs = 0;
  let lastMoveTs = 0;

  const MASK_SHIFT = (1 << 0) | (1 << 4);
  const MASK_CTRL = (1 << 1) | (1 << 5);
  const MASK_META = (1 << 2) | (1 << 6);
  const MASK_ALT = (1 << 3) | (1 << 7);

  const vcToKey: Record<number, string> = {
    0x0001: "escape",
    0x000e: "backspace",
    0x000f: "tab",
    0x001c: "enter",
    0x0e1c: "enter",
    0x0039: "space",
    0x0002: "1",
    0x0003: "2",
    0x0004: "3",
    0x0005: "4",
    0x0006: "5",
    0x0007: "6",
    0x0008: "7",
    0x0009: "8",
    0x000a: "9",
    0x000b: "0",
    0x001e: "a",
    0x0030: "b",
    0x002e: "c",
    0x0020: "d",
    0x0012: "e",
    0x0021: "f",
    0x0022: "g",
    0x0023: "h",
    0x0017: "i",
    0x0024: "j",
    0x0025: "k",
    0x0026: "l",
    0x0032: "m",
    0x0031: "n",
    0x0018: "o",
    0x0019: "p",
    0x0010: "q",
    0x0013: "r",
    0x001f: "s",
    0x0014: "t",
    0x0016: "u",
    0x002f: "v",
    0x0011: "w",
    0x002d: "x",
    0x0015: "y",
    0x002c: "z"
  };

  const push = (ev: Omit<MacroEvent, "deltaMs"> & Partial<Pick<any, "deltaMs">>, ts: number) => {
    const deltaMs = lastTs ? Math.max(0, ts - lastTs) : 0;
    lastTs = ts;
    if ((ev as any).type === "wait") {
      events.push(ev as any);
      return;
    }
    events.push({ ...(ev as any), deltaMs });
  };

  const onMove = (e: any) => {
    const ts = Date.now();
    if (ts - lastMoveTs < throttleMoveMs) return;
    lastMoveTs = ts;
    push({ type: "move", x: e.x, y: e.y } as any, ts);
  };

  const onMouseDown = (e: any) => {
    const ts = Date.now();
    const button = e.button === 2 ? "right" : "left";
    push({ type: "mouse_down", x: e.x, y: e.y, button } as any, ts);
  };

  const onMouseUp = (e: any) => {
    const ts = Date.now();
    const button = e.button === 2 ? "right" : "left";
    push({ type: "mouse_up", x: e.x, y: e.y, button } as any, ts);
  };

  const onClick = (e: any) => {
    const ts = Date.now();
    const type = e.button === 2 ? "right_click" : "left_click";
    push({ type, x: e.x, y: e.y } as any, ts);
  };

  const onWheel = (e: any) => {
    const ts = Date.now();
    push({ type: "scroll", dx: e.amountX ?? 0, dy: e.amountY ?? e.amount ?? 0 } as any, ts);
  };

  const onKeyDown = (e: any) => {
    const ts = Date.now();
    const key = vcToKey[e.keycode];
    if (!key) return;
    const mask = Number(e.mask ?? 0);
    const modifiers: Array<"shift" | "control" | "alt" | "command"> = [];
    if (mask & MASK_SHIFT) modifiers.push("shift");
    if (mask & MASK_CTRL) modifiers.push("control");
    if (mask & MASK_ALT) modifiers.push("alt");
    if (mask & MASK_META) modifiers.push("command");
    push({ type: "key_tap", key, modifiers: modifiers.length ? modifiers : undefined } as any, ts);
  };

  return {
    async ensureReady() {
      // no-op; library presence is the key
    },
    async start() {
      if (started) throw new Error("Recorder already started");
      started = true;
      events = [];
      lastTs = 0;
      lastMoveTs = 0;
      uiohook.on("mousemove", onMove);
      uiohook.on("mousedown", onMouseDown);
      uiohook.on("mouseup", onMouseUp);
      uiohook.on("mouseclick", onClick);
      uiohook.on("mousewheel", onWheel);
      uiohook.on("keydown", onKeyDown);
      uiohook.start();
    },
    async stop() {
      if (!started) throw new Error("Recorder not started");
      started = false;
      uiohook.off("mousemove", onMove);
      uiohook.off("mousedown", onMouseDown);
      uiohook.off("mouseup", onMouseUp);
      uiohook.off("mouseclick", onClick);
      uiohook.off("mousewheel", onWheel);
      uiohook.off("keydown", onKeyDown);
      uiohook.stop();
      return events;
    }
  };
}

