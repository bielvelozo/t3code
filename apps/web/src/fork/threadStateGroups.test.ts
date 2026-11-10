import { RunId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { groupThreadsByState, threadStateGroup } from "./threadStateGroups";

type Input = Parameters<typeof threadStateGroup>[0];
type Run = NonNullable<Input["latestRun"]>;

const NOW = Date.parse("2026-11-10T12:00:00.000Z");
const FINISHED = "2026-11-10T11:00:00.000Z";

function thread(overrides: Partial<Input> = {}): Input {
  return {
    hasActionableProposedPlan: false,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    pendingSubagentRequest: null,
    pendingGuestMessageCount: 0,
    interactionMode: "default",
    latestRun: null,
    runtime: null,
    blockedOnThreadWait: false,
    limitRecovery: null,
    ...overrides,
  };
}

function run(status: Run["status"], completedAt: string | null = FINISHED): Run {
  return {
    runId: RunId.make("run-1"),
    status,
    requestedAt: null,
    startedAt: null,
    completedAt,
    assistantMessageId: null,
  };
}

function runtime(status: string, lastErrorClass: string | null = null): Input["runtime"] {
  return { status, lastErrorClass, activeRunId: null } as unknown as Input["runtime"];
}

const visitedBefore = "2026-11-10T10:00:00.000Z";
const visitedAfter = "2026-11-10T11:30:00.000Z";

describe("threadStateGroup", () => {
  it.each([
    ["approval", thread({ hasPendingApprovals: true }), visitedAfter, null, "needs_you"],
    ["question", thread({ hasPendingUserInput: true }), visitedAfter, null, "needs_you"],
    ["guest message", thread({ pendingGuestMessageCount: 1 }), visitedAfter, null, "needs_you"],
    ["running", thread({ runtime: runtime("running") }), visitedAfter, null, "working"],
    [
      "waiting on background work",
      thread({ runtime: runtime("idle") }),
      visitedAfter,
      null,
      "working",
    ],
    ["unread finish", thread({ latestRun: run("completed") }), visitedBefore, null, "needs_you"],
    ["read finish", thread({ latestRun: run("completed") }), visitedAfter, null, "idle"],
    ["unread failure", thread({ latestRun: run("failed") }), visitedBefore, null, "needs_you"],
    ["read failure", thread({ latestRun: run("failed") }), visitedAfter, null, "idle"],
    [
      "unread interruption",
      thread({ latestRun: run("interrupted") }),
      visitedBefore,
      null,
      "needs_you",
    ],
    ["owner cancelled", thread({ latestRun: run("cancelled") }), visitedBefore, null, "idle"],
    ["never opened, recent", thread({ latestRun: run("completed") }), null, null, "needs_you"],
    [
      "never opened, old",
      thread({ latestRun: run("completed", "2026-10-01T00:00:00.000Z") }),
      null,
      null,
      "idle",
    ],
    [
      "plan ready",
      thread({
        interactionMode: "plan",
        hasActionableProposedPlan: true,
        latestRun: run("completed"),
      }),
      visitedAfter,
      null,
      "needs_you",
    ],
    [
      "woke from snooze",
      thread({ latestRun: run("completed") }),
      visitedAfter,
      "2026-11-10T11:45:00.000Z",
      "needs_you",
    ],
    [
      "limited, resumes by itself",
      thread({
        runtime: runtime("failed", "usage_limit"),
        limitRecovery: { runId: RunId.make("run-1"), resetAt: FINISHED, autoResume: true },
      }),
      visitedAfter,
      null,
      "working",
    ],
    [
      "limited, no resume",
      thread({ runtime: runtime("failed", "usage_limit") }),
      visitedAfter,
      null,
      "needs_you",
    ],
    ["no runs", thread(), undefined, null, "idle"],
  ] as const)("%s", (_name, input, lastVisitedAt, wokeAt, expected) => {
    expect(threadStateGroup(input, { lastVisitedAt, wokeAt, nowMs: NOW })).toBe(expected);
  });
});

describe("groupThreadsByState", () => {
  it("keeps group order and drops empty groups, preserving order inside a group", () => {
    const groups = groupThreadsByState(["a:idle", "b:needs_you", "c:idle"], (value) =>
      value.endsWith("idle") ? "idle" : "needs_you",
    );
    expect(groups).toEqual([
      { group: "needs_you", threads: ["b:needs_you"] },
      { group: "idle", threads: ["a:idle", "c:idle"] },
    ]);
  });
});
