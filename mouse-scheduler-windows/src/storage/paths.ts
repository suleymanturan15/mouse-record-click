import * as path from "node:path";

export function macrosPath(userDataDir: string) {
  return path.join(userDataDir, "macros.json");
}

export function schedulesPath(userDataDir: string) {
  return path.join(userDataDir, "schedules.json");
}

