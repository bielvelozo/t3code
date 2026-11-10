import { CollapsibleSectionHeader } from "~/components/ui/collapsible-section-header";
import { cn } from "~/lib/utils";

import { THREAD_STATE_GROUP_LABELS, type ThreadStateGroup } from "./threadStateGroups";

export function ThreadStateGroupHeader(props: {
  group: ThreadStateGroup;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  inFolder: boolean;
}) {
  return (
    <li
      className={cn("mx-0.5 list-none", props.inFolder && "ps-4")}
      data-testid={`sidebar-state-group-${props.group}`}
    >
      <CollapsibleSectionHeader
        expanded={props.expanded}
        onClick={props.onToggle}
        accessory={<span className="font-normal tabular-nums">{props.count}</span>}
      >
        {THREAD_STATE_GROUP_LABELS[props.group]}
      </CollapsibleSectionHeader>
    </li>
  );
}
