import { describe, expect, it } from "vite-plus/test";

import { parseCollectorMetrics } from "./hostCollector";

describe("parseCollectorMetrics", () => {
  it("reads temperature, Claude processes, and battery", () => {
    expect(
      parseCollectorMetrics({
        cpu: { pct: 3, tempC: 55.1 },
        claude: { processes: 3, ramGb: 0.58 },
        battery: { onAc: true, pct: 97 },
      }),
    ).toEqual({
      temperatureC: 55.1,
      claudeProcesses: 3,
      claudeMemoryGb: 0.58,
      battery: { percent: 97, onAc: true },
    });
  });

  it("leaves missing readings empty", () => {
    expect(parseCollectorMetrics({ cpu: { tempC: null }, battery: null })).toEqual({
      temperatureC: null,
      claudeProcesses: null,
      claudeMemoryGb: null,
      battery: null,
    });
  });

  it("rejects a body that is not an object", () => {
    expect(parseCollectorMetrics("offline")).toBeNull();
  });
});
