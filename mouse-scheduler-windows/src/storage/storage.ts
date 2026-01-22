import { app, dialog } from "electron";
import * as fs from "node:fs/promises";
import type { Macro, MacroEvent, Schedule } from "../shared/models";
import { makeId } from "./ids";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import { macrosPath, schedulesPath } from "./paths";

type MacrosDb = { macros: Macro[] };
type SchedulesDb = { schedules: Schedule[] };

export class Storage {
  private userDataDir: string;
  constructor(userDataDir: string) {
    this.userDataDir = userDataDir;
  }

  static createForApp() {
    return new Storage(app.getPath("userData"));
  }

  async listMacros(): Promise<Macro[]> {
    const db = await readJsonFile<MacrosDb>(macrosPath(this.userDataDir), { macros: [] });
    return db.macros.sort((a: Macro, b: Macro) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getMacro(macroId: string): Promise<Macro> {
    const all = await this.listMacros();
    const m = all.find((x) => x.macroId === macroId);
    if (!m) throw new Error(`Macro not found: ${macroId}`);
    return m;
  }

  async upsertMacro(macro: Macro): Promise<void> {
    const db = await readJsonFile<MacrosDb>(macrosPath(this.userDataDir), { macros: [] });
    const idx = db.macros.findIndex((m: Macro) => m.macroId === macro.macroId);
    if (idx >= 0) db.macros[idx] = macro;
    else db.macros.push(macro);
    await writeJsonFile(macrosPath(this.userDataDir), db);
  }

  async createMacro(name: string): Promise<Macro> {
    const now = new Date().toISOString();
    const macro: Macro = {
      macroId: makeId("m"),
      name,
      createdAt: now,
      updatedAt: now,
      events: []
    };
    await this.upsertMacro(macro);
    return macro;
  }

  async renameMacro(macroId: string, name: string): Promise<void> {
    const m = await this.getMacro(macroId);
    m.name = name;
    m.updatedAt = new Date().toISOString();
    await this.upsertMacro(m);
  }

  async copyMacro(macroId: string): Promise<Macro> {
    const m = await this.getMacro(macroId);
    const now = new Date().toISOString();
    const copy: Macro = {
      ...m,
      macroId: makeId("m"),
      name: `${m.name} (copy)`,
      createdAt: now,
      updatedAt: now
    };
    await this.upsertMacro(copy);
    return copy;
  }

  async removeMacro(macroId: string): Promise<void> {
    const db = await readJsonFile<MacrosDb>(macrosPath(this.userDataDir), { macros: [] });
    db.macros = db.macros.filter((m: Macro) => m.macroId !== macroId);
    await writeJsonFile(macrosPath(this.userDataDir), db);
  }

  async updateMacroEvents(macroId: string, events: MacroEvent[]): Promise<void> {
    const m = await this.getMacro(macroId);
    m.events = events;
    m.updatedAt = new Date().toISOString();
    await this.upsertMacro(m);
  }

  async listSchedules(): Promise<Schedule[]> {
    const db = await readJsonFile<SchedulesDb>(schedulesPath(this.userDataDir), { schedules: [] });
    return db.schedules.sort((a: Schedule, b: Schedule) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async upsertSchedule(schedule: Schedule): Promise<void> {
    const db = await readJsonFile<SchedulesDb>(schedulesPath(this.userDataDir), { schedules: [] });
    const idx = db.schedules.findIndex((s: Schedule) => s.scheduleId === schedule.scheduleId);
    if (idx >= 0) db.schedules[idx] = schedule;
    else db.schedules.push(schedule);
    await writeJsonFile(schedulesPath(this.userDataDir), db);
  }

  async createSchedule(
    input: Omit<Schedule, "scheduleId" | "createdAt" | "updatedAt">
  ): Promise<Schedule> {
    const now = new Date().toISOString();
    const schedule: Schedule = {
      ...input,
      scheduleId: makeId("s"),
      createdAt: now,
      updatedAt: now
    };
    await this.upsertSchedule(schedule);
    return schedule;
  }

  async patchSchedule(scheduleId: string, patch: Partial<Schedule>): Promise<void> {
    const all = await this.listSchedules();
    const s = all.find((x: Schedule) => x.scheduleId === scheduleId);
    if (!s) throw new Error(`Schedule not found: ${scheduleId}`);
    Object.assign(s, patch);
    s.updatedAt = new Date().toISOString();
    await this.upsertSchedule(s);
  }

  async removeSchedule(scheduleId: string): Promise<void> {
    const db = await readJsonFile<SchedulesDb>(schedulesPath(this.userDataDir), { schedules: [] });
    db.schedules = db.schedules.filter((s: Schedule) => s.scheduleId !== scheduleId);
    await writeJsonFile(schedulesPath(this.userDataDir), db);
  }

  // Import/Export
  async exportMacroJson(macroId: string): Promise<void> {
    const macro = await this.getMacro(macroId);
    const res = await dialog.showSaveDialog({
      title: "Export Macro JSON",
      defaultPath: `${macro.name}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (res.canceled || !res.filePath) return;
    await fs.writeFile(res.filePath, JSON.stringify(macro, null, 2), "utf-8");
  }

  async exportAllMacrosJson(): Promise<void> {
    const macros = await this.listMacros();
    const res = await dialog.showSaveDialog({
      title: "Export All Macros JSON",
      defaultPath: `macros.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (res.canceled || !res.filePath) return;
    await fs.writeFile(res.filePath, JSON.stringify({ macros }, null, 2), "utf-8");
  }

  async importMacroJson(): Promise<void> {
    const res = await dialog.showOpenDialog({
      title: "Import Macro JSON",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (res.canceled || !res.filePaths[0]) return;
    const raw = await fs.readFile(res.filePaths[0], "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.macroId && parsed?.events) {
      // single macro
      const now = new Date().toISOString();
      const macro: Macro = {
        ...parsed,
        macroId: makeId("m"),
        createdAt: now,
        updatedAt: now
      };
      await this.upsertMacro(macro);
      return;
    }
    if (parsed?.macros && Array.isArray(parsed.macros)) {
      for (const m of parsed.macros) {
        const now = new Date().toISOString();
        const macro: Macro = {
          ...m,
          macroId: makeId("m"),
          createdAt: now,
          updatedAt: now
        };
        await this.upsertMacro(macro);
      }
      return;
    }
    throw new Error("Invalid JSON format for import");
  }
}

