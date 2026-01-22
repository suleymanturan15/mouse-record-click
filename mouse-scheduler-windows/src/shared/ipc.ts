import type { Macro, MacroEvent, AppStatus, Schedule } from "./models";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type RendererApi = {
  app: {
    getVersion: () => Promise<string>;
  };
  status: {
    get: () => Promise<AppStatus>;
  };
  permissions: {
    getStatus: () => Promise<{ accessibilityTrusted: boolean; platform: NodeJS.Platform }>;
    openAccessibilitySettings: () => Promise<void>;
    promptForAccessibility: () => Promise<void>;
  };
  macros: {
    list: () => Promise<Macro[]>;
    get: (args: { macroId: string }) => Promise<Macro>;
    create: (args: { name: string }) => Promise<Macro>;
    rename: (args: { macroId: string; name: string }) => Promise<void>;
    copy: (args: { macroId: string }) => Promise<Macro>;
    remove: (args: { macroId: string }) => Promise<void>;
    updateEvents: (args: { macroId: string; events: MacroEvent[] }) => Promise<void>;
    exportJson: (args: { macroId: string }) => Promise<void>;
    exportAllJson: () => Promise<void>;
    importJson: () => Promise<void>;
  };
  schedules: {
    list: () => Promise<Schedule[]>;
    create: (args: Omit<Schedule, "scheduleId" | "createdAt" | "updatedAt">) => Promise<Schedule>;
    update: (args: { scheduleId: string; patch: Partial<Schedule> }) => Promise<void>;
    remove: (args: { scheduleId: string }) => Promise<void>;
  };
  scheduler: {
    reload: () => Promise<void>;
  };
  recorder: {
    start: (args: { macroId?: string }) => Promise<void>;
    stop: () => Promise<Macro>;
  };
  player: {
    play: (args: { macroId: string; speedMultiplier?: number; minDelayMs?: number }) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
  };
};

export const IPC_CHANNEL = "mouseScheduler:invoke";

export type IpcMethod = keyof Flatten<RendererApi>;

type Flatten<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? `${Extract<K, string>}`
    : T[K] extends object
      ? `${Extract<K, string>}.${Extract<keyof T[K], string>}`
      : never;
}[keyof T];

