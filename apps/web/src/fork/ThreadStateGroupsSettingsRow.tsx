import { SettingsRow } from "~/components/settings/settingsLayout";
import { searchableSetting } from "~/components/settings/settingsSearch";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  THREAD_STATE_GROUPS_MODES,
  THREAD_STATE_GROUPS_MODE_LABELS,
  useThreadStateGroupsStore,
  type ThreadStateGroupsMode,
} from "./threadStateGroups";

function isThreadStateGroupsMode(value: unknown): value is ThreadStateGroupsMode {
  return THREAD_STATE_GROUPS_MODES.includes(value as ThreadStateGroupsMode);
}

export function ThreadStateGroupsSettingsRow() {
  const mode = useThreadStateGroupsStore((s) => s.mode);
  const setMode = useThreadStateGroupsStore((s) => s.setMode);
  return (
    <SettingsRow
      {...searchableSetting("thread-state-groups")}
      description="Split threads into Needs you, Working, and Idle."
      control={
        <Select
          value={mode}
          onValueChange={(value) => {
            if (isThreadStateGroupsMode(value)) setMode(value);
          }}
        >
          <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="Status groups">
            <SelectValue>{THREAD_STATE_GROUPS_MODE_LABELS[mode]}</SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            {THREAD_STATE_GROUPS_MODES.map((value) => (
              <SelectItem hideIndicator key={value} value={value}>
                {THREAD_STATE_GROUPS_MODE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      }
    />
  );
}
