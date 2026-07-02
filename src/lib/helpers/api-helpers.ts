import type { CommitProgress } from "../hooks/useTransaction";
import { health } from "./health-check";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type QueueItem = {
  id: string;
  label: string;
  run: () => Promise<void>;
};

type QueueProgress = {
  done: number;
  total: number;
  success: number;
  failed: number;
  current?: string;
  waiting: CommitProgress["waiting"];
};

export async function runQueue({
  items,
  batchSize = 2,
  launchEveryMs = 100,
  onProgress,
}: {
  items: QueueItem[];
  batchSize?: number;
  launchEveryMs?: number;
  onProgress?: (p: QueueProgress) => void;
}) {
  let index = 0;
  let done = 0;
  let success = 0;
  let failed = 0;
  let active = 0;
  let paused = false;
  let waiting: QueueProgress["waiting"] = null;

  const total = items.length;

  const report = (current?: string) => {
    onProgress?.({
      done,
      total,
      success,
      failed,
      current,
      waiting,
    });
  };

  let pausePromise: Promise<void> | null = null;

  const pauseUntilHealthy = (current?: string) => {
    if (!pausePromise) {
      paused = true;

      waiting = {
        reason: "server",
        label: "Server is not responding. Waiting for server...",
      };

      report(current);

      pausePromise = health.waitUntilHealthy(5_000).then(() => {
        waiting = null;
        paused = false;
        pausePromise = null;
        report(current);
      });
    }

    return pausePromise;
  };

  report();

  const initialOk = await health.check();

  if (!initialOk) {
    await pauseUntilHealthy("Waiting for server...");
  }

  return await new Promise<{ failed: string[] }>((resolve) => {
    const maybeResolve = () => {
      if (index >= items.length && active === 0 && !paused) {
        resolve({ failed: [] });
      }
    };

    const runItem = async (item: QueueItem) => {
      active++;

      try {
        while (true) {
          try {
            await item.run();
            break;
          } catch {
            await pauseUntilHealthy(item.label);
          }
        }

        done++;
        success++;
        report(item.label);
      } finally {
        active--;
        maybeResolve();
      }
    };

    const launchBatch = () => {
      if (paused) return;

      for (let i = 0; i < batchSize && index < items.length; i++) {
        const item = items[index++];
        void runItem(item);
      }

      maybeResolve();
    };

    launchBatch();

    const interval = window.setInterval(() => {
      if (index >= items.length) {
        window.clearInterval(interval);
        maybeResolve();
        return;
      }

      launchBatch();
    }, launchEveryMs);
  });
}
