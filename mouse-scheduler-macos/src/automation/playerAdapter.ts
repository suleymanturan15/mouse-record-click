import type { MacroEvent } from "../shared/models";

export type PlayOptions = {
  speedMultiplier?: number;
  minDelayMs?: number;
  signal?: AbortSignal;
  onStatus?: (s: { paused: boolean }) => void;
};

export interface PlayerAdapter {
  ensureReady(): Promise<void>;
  move(x: number, y: number): Promise<void>;
  click(button: "left" | "right", double?: boolean): Promise<void>;
  down(button: "left" | "right"): Promise<void>;
  up(button: "left" | "right"): Promise<void>;
  scroll(dx: number, dy: number): Promise<void>;
  keyTap(key: string, modifiers?: Array<"shift" | "control" | "alt" | "command">): Promise<void>;
}

export async function createRobotJsPlayerAdapter(): Promise<PlayerAdapter> {
  // Keep playback optional. We try a few known robotjs packages; if none exist, we fail with a clear message.
  let robot: any;
  try {
    robot = (await import("@jitsi/robotjs")).default ?? (await import("@jitsi/robotjs"));
  } catch {
    try {
      robot = (await import("@hurdlegroup/robotjs")).default ?? (await import("@hurdlegroup/robotjs"));
    } catch {
      try {
        robot = (await import("robotjs")).default ?? (await import("robotjs"));
      } catch {
        throw new Error(
          "Player adapter missing: install a mouse automation library (e.g. @jitsi/robotjs or robotjs) to enable playback."
        );
      }
    }
  }

  // Accumulate fractional scroll and only send integer steps to robotjs
  let scrollAccX = 0;
  let scrollAccY = 0;

  return {
    async ensureReady() {
      // no-op
    },
    async move(x, y) {
      robot.moveMouse(Math.round(x), Math.round(y));
    },
    async click(button, double) {
      robot.mouseClick(button, !!double);
    },
    async down(button) {
      robot.mouseToggle("down", button);
    },
    async up(button) {
      robot.mouseToggle("up", button);
    },
    async scroll(dx, dy) {
      scrollAccX += Number(dx) || 0;
      scrollAccY += Number(dy) || 0;
      const sendX = Math.trunc(scrollAccX);
      const sendY = Math.trunc(scrollAccY);
      if (sendX === 0 && sendY === 0) return;
      robot.scrollMouse(sendX, sendY);
      scrollAccX -= sendX;
      scrollAccY -= sendY;
    },
    async keyTap(key, modifiers) {
      if (modifiers && modifiers.length > 0) robot.keyTap(key, modifiers);
      else robot.keyTap(key);
    }
  };
}

export function computeDelayMs(ev: MacroEvent, speedMultiplier = 1, minDelayMs = 20): number {
  const raw =
    ev.type === "wait"
      ? ev.ms
      : "deltaMs" in ev
        ? (ev as any).deltaMs ?? 0
        : 0;
  const scaled = Math.max(0, Math.round(raw / Math.max(0.1, speedMultiplier)));
  return Math.max(minDelayMs, scaled);
}

export async function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("Aborted");
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error("Aborted"));
    };
    const cleanup = () => {
      clearTimeout(t);
      if (signal) signal.removeEventListener("abort", onAbort);
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

