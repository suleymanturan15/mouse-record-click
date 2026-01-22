export type IsoDateString = string;

export type MouseEventType =
  | "move"
  | "left_click"
  | "right_click"
  | "double_click"
  | "mouse_down"
  | "mouse_up"
  | "scroll";

export type MacroEvent =
  | { type: "wait"; ms: number }
  | { type: "move"; x: number; y: number; deltaMs: number }
  | { type: "left_click" | "right_click" | "double_click"; x: number; y: number; deltaMs: number }
  | { type: "mouse_down" | "mouse_up"; x: number; y: number; button: "left" | "right"; deltaMs: number }
  | {
      type: "key_tap";
      key: string;
      modifiers?: Array<"shift" | "control" | "alt" | "command">;
      deltaMs: number;
    }
  | { type: "scroll"; deltaMs: number; dx: number; dy: number };

export type Macro = {
  macroId: string;
  name: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  events: MacroEvent[];
  meta?: {
    screen?: {
      width: number;
      height: number;
      scaleFactor?: number;
    };
  };
};

export type DayCode = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type ConflictPolicy = "SKIP" | "QUEUE" | "RESTART";
export type ScheduleMode = "TIMES" | "INTERVAL" | "QUOTA" | "CHAIN";

export type ScheduleInterval = {
  start: string; // HH:MM
  end: string; // HH:MM
  everyMin: number; // 1..1440
};

export type ScheduleQuota = {
  start: string; // HH:MM - window start (e.g. 09:00)
  windowHours: number; // typically 24
  intervalMin: number; // typically 60 (hourly)
  runsPerWindow: number; // e.g. 20
  bufferSec: number; // e.g. 5 (extra wait after macro completion before next run)
};

export type ScheduleChain = {
  start: string; // HH:MM (first run time)
  windowHours: number; // typically 24
  intervalMin: number; // 60 means "after finish + 60min"
  runsPerWindow: number; // e.g. 20 / 23
};

export type Schedule = {
  scheduleId: string;
  macroId: string;
  enabled: boolean;
  days: DayCode[];
  mode?: ScheduleMode;
  times: string[]; // HH:MM (used when mode=TIMES or interval is undefined)
  interval?: ScheduleInterval; // used when mode=INTERVAL
  quota?: ScheduleQuota; // used when mode=QUOTA
  chain?: ScheduleChain; // used when mode=CHAIN
  repeatCount?: number; // default 1; how many times to run per trigger
  preRunCountdownSec: number;
  conflictPolicy: ConflictPolicy;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type RunnerMode = "IDLE" | "RECORDING" | "RECORDING_PAUSED" | "PLAYING" | "PAUSED";

export type AppStatus = {
  mode: RunnerMode;
  activeMacroId?: string;
  details?: string;
};

