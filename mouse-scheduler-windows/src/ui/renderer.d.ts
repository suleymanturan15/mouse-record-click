import type { RendererApi } from "../shared/ipc";

declare global {
  interface Window {
    mouseScheduler: RendererApi;
  }
}

export {};

