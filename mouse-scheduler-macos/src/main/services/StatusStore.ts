import type { AppStatus } from "../../shared/models";

export class StatusStore {
  private status: AppStatus = { mode: "IDLE" };

  get() {
    return this.status;
  }

  set(next: AppStatus) {
    this.status = next;
  }
}

