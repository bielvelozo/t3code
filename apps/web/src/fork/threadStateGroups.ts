import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { isThreadWorking } from "@t3tools/client-runtime/state/thread-inbox";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "~/lib/storage";

const THREAD_STATE_GROUPS = ["needs_you", "working", "idle"] as const;
export type ThreadStateGroup = (typeof THREAD_STATE_GROUPS)[number];

export const THREAD_STATE_GROUP_LABELS: Record<ThreadStateGroup, string> = {
  needs_you: "Needs you",
  working: "Working",
  idle: "Idle",
};

export const THREAD_STATE_GROUPS_MODES = ["off", "folders", "list", "both"] as const;
export type ThreadStateGroupsMode = (typeof THREAD_STATE_GROUPS_MODES)[number];

export const THREAD_STATE_GROUPS_MODE_LABELS: Record<ThreadStateGroupsMode, string> = {
  off: "Off",
  folders: "Project folders",
  list: "Plain list",
  both: "Both",
};

const NEVER_OPENED_UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1_000;

type ThreadStateInput = Pick<
  EnvironmentThreadShell,
  | "hasActionableProposedPlan"
  | "hasPendingApprovals"
  | "hasPendingUserInput"
  | "pendingSubagentRequest"
  | "pendingGuestMessageCount"
  | "interactionMode"
  | "latestRun"
  | "runtime"
  | "blockedOnThreadWait"
  | "limitRecovery"
>;

export function threadStateGroup(
  thread: ThreadStateInput,
  context: {
    readonly lastVisitedAt: string | null | undefined;
    readonly wokeAt: string | null;
    readonly nowMs: number;
  },
): ThreadStateGroup {
  if (
    thread.hasPendingApprovals ||
    thread.hasPendingUserInput ||
    thread.pendingSubagentRequest != null ||
    (thread.pendingGuestMessageCount ?? 0) > 0
  ) {
    return "needs_you";
  }
  if (thread.runtime?.status === "failed" && thread.runtime.lastErrorClass === "usage_limit") {
    return thread.limitRecovery?.autoResume === true ? "working" : "needs_you";
  }
  if (isThreadWorking(thread) || thread.blockedOnThreadWait === true) return "working";
  const visitedMs = parseMs(context.lastVisitedAt);
  const wokeMs = parseMs(context.wokeAt);
  if (wokeMs !== null && (visitedMs === null || visitedMs < wokeMs)) return "needs_you";
  if (thread.interactionMode === "plan" && thread.hasActionableProposedPlan) return "needs_you";
  const run = thread.latestRun;
  const finishedMs = parseMs(run?.completedAt);
  if (run === null || run.status === "cancelled" || finishedMs === null) return "idle";
  if (visitedMs !== null) return finishedMs > visitedMs ? "needs_you" : "idle";
  return context.nowMs - finishedMs <= NEVER_OPENED_UNREAD_WINDOW_MS ? "needs_you" : "idle";
}

export function groupThreadsByState<T>(
  threads: readonly T[],
  groupOf: (thread: T) => ThreadStateGroup,
): ReadonlyArray<{ readonly group: ThreadStateGroup; readonly threads: readonly T[] }> {
  const buckets = new Map<ThreadStateGroup, T[]>(THREAD_STATE_GROUPS.map((group) => [group, []]));
  for (const thread of threads) buckets.get(groupOf(thread))!.push(thread);
  return THREAD_STATE_GROUPS.map((group) => ({ group, threads: buckets.get(group)! })).filter(
    (entry) => entry.threads.length > 0,
  );
}

function parseMs(value: string | null | undefined): number | null {
  if (value == null) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

interface ThreadStateGroupsState {
  mode: ThreadStateGroupsMode;
  expanded: Record<string, boolean>;
  setMode: (mode: ThreadStateGroupsMode) => void;
  toggle: (scopeKey: string, group: ThreadStateGroup) => void;
}

export const useThreadStateGroupsStore = create<ThreadStateGroupsState>()(
  persist(
    (set) => ({
      mode: "off",
      expanded: {},
      setMode: (mode) => set({ mode }),
      toggle: (scopeKey, group) =>
        set((state) => ({
          expanded: {
            ...state.expanded,
            [`${scopeKey}:${group}`]: !isThreadStateGroupExpanded(state.expanded, scopeKey, group),
          },
        })),
    }),
    {
      name: "t3code:fork:thread-state-groups:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: ({ mode, expanded }) => ({ mode, expanded }),
    },
  ),
);

export function threadStateGroupsApply(
  mode: ThreadStateGroupsMode,
  surface: "folders" | "list",
): boolean {
  return mode === "both" || mode === surface;
}

function isThreadStateGroupExpanded(
  expanded: Readonly<Record<string, boolean>>,
  scopeKey: string,
  group: ThreadStateGroup,
): boolean {
  return expanded[`${scopeKey}:${group}`] ?? group !== "idle";
}

export interface ThreadStateGroupView<T> {
  readonly group: ThreadStateGroup;
  readonly count: number;
  readonly expanded: boolean;
  readonly threads: readonly T[];
}

export function applyThreadStateGroups<T>(input: {
  readonly threads: readonly T[];
  readonly scopeKey: string;
  readonly groupOf: (thread: T) => ThreadStateGroup;
  readonly expanded: Readonly<Record<string, boolean>>;
  readonly keyOf: (thread: T) => string;
  readonly keepKey: string | null;
}): { readonly groups: readonly ThreadStateGroupView<T>[]; readonly visible: readonly T[] } {
  const groups = groupThreadsByState(input.threads, input.groupOf).map((entry) => {
    const expanded = isThreadStateGroupExpanded(input.expanded, input.scopeKey, entry.group);
    return {
      group: entry.group,
      count: entry.threads.length,
      expanded,
      threads: expanded
        ? entry.threads
        : entry.threads.filter((thread) => input.keyOf(thread) === input.keepKey),
    };
  });
  return { groups, visible: groups.flatMap((entry) => entry.threads) };
}
