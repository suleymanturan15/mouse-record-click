import type { PlayerAdapter } from "./playerAdapter";
import type { RecorderAdapter } from "./recorderAdapter";
import { createUiohookRecorderAdapter } from "./recorderAdapter";
import { createRobotJsPlayerAdapter } from "./playerAdapter";

function missingRecorderAdapter(errMsg: string): RecorderAdapter {
  return {
    async ensureReady() {
      throw new Error(errMsg);
    },
    async start() {
      throw new Error(errMsg);
    },
    async stop() {
      throw new Error(errMsg);
    }
  };
}

function missingPlayerAdapter(errMsg: string): PlayerAdapter {
  return {
    async ensureReady() {
      throw new Error(errMsg);
    },
    async move() {
      throw new Error(errMsg);
    },
    async click() {
      throw new Error(errMsg);
    },
    async down() {
      throw new Error(errMsg);
    },
    async up() {
      throw new Error(errMsg);
    },
    async scroll() {
      throw new Error(errMsg);
    },
    async keyTap() {
      throw new Error(errMsg);
    }
  };
}

export async function createDefaultAdapters() {
  const recorder = await createUiohookRecorderAdapter({ throttleMoveMs: 15 }).catch((e: unknown) =>
    missingRecorderAdapter(e instanceof Error ? e.message : String(e))
  );
  const player = await createRobotJsPlayerAdapter().catch((e: unknown) =>
    missingPlayerAdapter(e instanceof Error ? e.message : String(e))
  );
  return { recorder, player };
}

