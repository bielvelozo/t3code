import { describe, expect, it } from "vite-plus/test";

import { hostLoad } from "./hostLoad";

const GB = 1024 ** 3;

function snapshot(availableGb: number, cpuUtilization: number | null = 0.1) {
  return {
    sampledAt: 0,
    cpuUtilization,
    cpuCount: 8,
    availableMemoryBytes: availableGb * GB,
    totalMemoryBytes: 10 * GB,
  };
}

describe("hostLoad", () => {
  it.each([
    [4, "normal"],
    [3, "warning"],
    [2, "critical"],
  ] as const)("with %i GB of 10 free the level is %s", (availableGb, level) => {
    expect(hostLoad(snapshot(availableGb))?.level).toBe(level);
  });

  it("keeps an unknown CPU reading unknown", () => {
    expect(hostLoad(snapshot(5, null))?.cpuPercent).toBeNull();
  });

  it("returns nothing when the host reports no memory", () => {
    expect(hostLoad({ ...snapshot(0), totalMemoryBytes: 0 })).toBeNull();
  });
});
