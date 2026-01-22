import * as crypto from "node:crypto";

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

