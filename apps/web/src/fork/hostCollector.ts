import type { EnvironmentId } from "@t3tools/contracts";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "~/lib/storage";

const POLL_MS = 10_000;

export interface CollectorMetrics {
  readonly temperatureC: number | null;
  readonly claudeProcesses: number | null;
  readonly claudeMemoryGb: number | null;
  readonly battery: { readonly percent: number; readonly onAc: boolean } | null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function field(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function parseCollectorMetrics(json: unknown): CollectorMetrics | null {
  if (json === null || typeof json !== "object") return null;
  const battery = field(json, "battery");
  const batteryPercent = finiteOrNull(field(battery, "pct"));
  const onAc = field(battery, "onAc");
  return {
    temperatureC: finiteOrNull(field(field(json, "cpu"), "tempC")),
    claudeProcesses: finiteOrNull(field(field(json, "claude"), "processes")),
    claudeMemoryGb: finiteOrNull(field(field(json, "claude"), "ramGb")),
    battery:
      batteryPercent !== null && typeof onAc === "boolean"
        ? { percent: batteryPercent, onAc }
        : null,
  };
}

interface CollectorUrlState {
  urls: Partial<Record<EnvironmentId, string>>;
  setUrl: (environmentId: EnvironmentId, url: string) => void;
}

export const useCollectorUrlStore = create<CollectorUrlState>()(
  persist(
    (set) => ({
      urls: {},
      setUrl: (environmentId, url) =>
        set((state) => ({ urls: { ...state.urls, [environmentId]: url.trim() } })),
    }),
    {
      name: "t3code:fork:host-collector-urls:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: ({ urls }) => ({ urls }),
    },
  ),
);

export function useCollectorMetrics(url: string | undefined): CollectorMetrics | null {
  const [metrics, setMetrics] = useState<{ url: string; value: CollectorMetrics | null } | null>(
    null,
  );

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- polls the host's own metrics collector over HTTP
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const read = async () => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const value = response.ok ? parseCollectorMetrics(await response.json()) : null;
        if (!cancelled) setMetrics({ url, value });
      } catch {
        if (!cancelled) setMetrics({ url, value: null });
      }
    };
    void read();
    const timer = setInterval(() => void read(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url]);

  return url && metrics?.url === url ? metrics.value : null;
}
