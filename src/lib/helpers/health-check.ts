import { useEffect, useState } from "react";
import { sleep } from "./api-helpers";
import axios from "axios";

export type HealthStatus = "unknown" | "healthy" | "unhealthy" | "checking";

export type HealthSnapshot = {
  status: HealthStatus;
  reconnecting: boolean;
  lastCheckedAt: number | null;
};

const AUTO_PING_MS = 15_000;
const RECONNECT_PING_MS = 5_000;

function createHealthCheck() {
  let snapshot: HealthSnapshot = {
    status: "unknown",
    reconnecting: false,
    lastCheckedAt: null,
  };

  let inFlight: Promise<boolean> | null = null;
  let autoPingId: number | null = null;
  let reconnectPromise: Promise<void> | null = null;

  const listeners = new Set<(snapshot: HealthSnapshot) => void>();

  const emit = () => {
    listeners.forEach((listener) => listener(snapshot));
  };

  const setSnapshot = (patch: Partial<HealthSnapshot>) => {
    snapshot = {
      ...snapshot,
      ...patch,
    };

    emit();
  };

  const subscribe = (listener: (snapshot: HealthSnapshot) => void) => {
    listeners.add(listener);
    listener(snapshot);

    return () => {
      listeners.delete(listener);
    };
  };

  const check = async () => {
    if (inFlight) return inFlight;

    setSnapshot({ status: "checking" });

    inFlight = ping()
      .then((ok) => {
        setSnapshot({
          status: ok ? "healthy" : "unhealthy",
          lastCheckedAt: Date.now(),
        });

        return ok;
      })
      .catch(() => {
        setSnapshot({
          status: "unhealthy",
          lastCheckedAt: Date.now(),
        });

        return false;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  const startAutoPing = (ms = AUTO_PING_MS) => {
    if (autoPingId !== null) return () => {};

    void check();

    autoPingId = window.setInterval(() => {
      if (snapshot.reconnecting) return;
      void check();
    }, ms);

    return () => {
      if (autoPingId !== null) {
        window.clearInterval(autoPingId);
        autoPingId = null;
      }
    };
  };

  const waitUntilHealthy = async (ms = RECONNECT_PING_MS) => {
    if (reconnectPromise) return reconnectPromise;

    reconnectPromise = (async () => {
      setSnapshot({ reconnecting: true });

      try {
        while (true) {
          const ok = await check();
          if (ok) return;

          await sleep(ms);
        }
      } finally {
        reconnectPromise = null;
        setSnapshot({ reconnecting: false });
      }
    })();

    return reconnectPromise;
  };

  return {
    check,
    startAutoPing,
    waitUntilHealthy,
    subscribe,
    getSnapshot: () => snapshot,
    getStatus: () => snapshot.status,
    isReconnecting: () => snapshot.reconnecting,
  };
}

export function useHealth() {
  const [snapshot, setSnapshot] = useState(health.getSnapshot());

  useEffect(() => {
    return health.subscribe(setSnapshot);
  }, []);

  return snapshot;
}

export const health = createHealthCheck();

export const ping = async () => {
  try {
    const res = await axios.get(
      "https://backend.apexhos.com/ping/baseUrl?rCode=extreme&agentType=portal",
    );
    return res.data.status;
  } catch {
    return false;
  }
};
