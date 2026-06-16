import type { CommitProgress } from "../hooks/useTransaction";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getRetryDelayMs = (attempt: number) => {
  if (attempt === 1) return 1_000;
  if (attempt === 2) return 15_000;
  if (attempt === 3) return 30_000;
  return 60_000;
};

export type QueueItem = {
  id: string;
  label: string;
  run: () => Promise<void>;
};

export async function runWithInfiniteRetry(
  item: QueueItem,
  onRetry?: (retry: {
    id: string;
    label: string;
    attempt: number;
    delayMs: number;
  }) => void,
) {
  let attempt = 0;

  while (true) {
    try {
      await item.run();
      return;
    } catch (error) {
      attempt++;

      const delayMs = getRetryDelayMs(attempt);

      onRetry?.({
        id: item.id,
        label: item.label,
        attempt,
        delayMs,
      });

      console.warn(
        `${item.label} failed. Retry ${attempt} in ${delayMs / 1000}s`,
        error,
      );

      await sleep(delayMs);
    }
  }
}

type QueueProgress = {
  done: number;
  total: number;
  success: number;
  failed: number;
  current?: string;
  retrying?: CommitProgress["retrying"];
};

export async function runQueue({
  items,
  concurrency = 6,
  launchEveryMs = 100,
  onProgress,
}: {
  items: QueueItem[];
  concurrency?: number;
  launchEveryMs?: number;
  onProgress?: (p: QueueProgress) => void;
}) {
  let done = 0;
  let success = 0;
  let failed = 0;
  let index = 0;
  let active = 0;
  let retrying: QueueProgress["retrying"] = null;

  const total = items.length;

  const report = (current?: string) => {
    onProgress?.({
      done,
      total,
      success,
      failed,
      current,
      retrying,
    });
  };

  report();

  return await new Promise<{ failed: string[] }>((resolve) => {
    const launchNext = () => {
      while (active < concurrency && index < items.length) {
        const item = items[index++];
        active++;

        runWithInfiniteRetry(item, (retry) => {
          retrying = retry;
          report(item.label);
        }).then(() => {
          active--;

          if (retrying?.id === item.id) {
            retrying = null;
          }

          done++;
          success++;
          report(item.label);

          if (done === total) {
            resolve({ failed: [] });
          }
        });

        break; // important: only launch one per tick
      }

      if (index >= items.length && active === 0) {
        resolve({ failed: [] });
      }
    };

    launchNext();

    const interval = window.setInterval(() => {
      launchNext();

      if (index >= items.length) {
        window.clearInterval(interval);
      }
    }, launchEveryMs);
  });
}
