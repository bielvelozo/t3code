import type { HostResourcesSnapshot } from "@t3tools/contracts";

const HOST_LOAD_WARNING_PERCENT = 70;
const HOST_LOAD_CRITICAL_PERCENT = 80;

export type HostLoadLevel = "normal" | "warning" | "critical";

export interface HostLoad {
  readonly memoryPercent: number;
  readonly usedMemoryBytes: number;
  readonly totalMemoryBytes: number;
  readonly cpuPercent: number | null;
  readonly level: HostLoadLevel;
}

export function hostLoad(snapshot: HostResourcesSnapshot): HostLoad | null {
  if (snapshot.totalMemoryBytes <= 0) return null;
  const usedMemoryBytes = Math.max(0, snapshot.totalMemoryBytes - snapshot.availableMemoryBytes);
  const memoryPercent = (usedMemoryBytes / snapshot.totalMemoryBytes) * 100;
  return {
    memoryPercent,
    usedMemoryBytes,
    totalMemoryBytes: snapshot.totalMemoryBytes,
    cpuPercent: snapshot.cpuUtilization === null ? null : snapshot.cpuUtilization * 100,
    level:
      memoryPercent >= HOST_LOAD_CRITICAL_PERCENT
        ? "critical"
        : memoryPercent >= HOST_LOAD_WARNING_PERCENT
          ? "warning"
          : "normal",
  };
}
