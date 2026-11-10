import { RegistryContext } from "@effect/atom-react";
import type { EnvironmentId } from "@t3tools/contracts";
import { useContext, useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { formatBytes } from "~/lib/formatBytes";
import { cn } from "~/lib/utils";
import {
  useConnectedEnvironmentIds,
  useEnvironments,
  usePrimaryEnvironmentId,
} from "~/state/environments";
import { useEnvironmentQuery } from "~/state/query";
import { serverEnvironment } from "~/state/server";

import { type CollectorMetrics, useCollectorMetrics, useCollectorUrlStore } from "./hostCollector";
import { type HostLoad, type HostLoadLevel, hostLoad } from "./hostLoad";

const REFRESH_MS = 10_000;

const LEVEL_CLASS: Record<HostLoadLevel, string> = {
  normal: "text-sidebar-muted-foreground",
  warning: "text-warning",
  critical: "text-destructive",
};

export function RemoteHostLoad() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const connectedEnvironmentIds = useConnectedEnvironmentIds();
  const { presentationById } = useEnvironments();
  const remoteEnvironmentIds = connectedEnvironmentIds.filter(
    (environmentId) => environmentId !== primaryEnvironmentId,
  );
  if (remoteEnvironmentIds.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 px-2 pb-1">
      {remoteEnvironmentIds.map((environmentId) => (
        <RemoteHostLoadRow
          key={environmentId}
          environmentId={environmentId}
          label={presentationById.get(environmentId)?.entry.target.label ?? environmentId}
        />
      ))}
    </div>
  );
}

function summary(load: HostLoad | null, collector: CollectorMetrics | null): string {
  if (!load) return "…";
  const parts = [`RAM ${Math.round(load.memoryPercent)}%`];
  if (load.cpuPercent !== null) parts.push(`CPU ${Math.round(load.cpuPercent)}%`);
  if (collector?.temperatureC != null) parts.push(`${Math.round(collector.temperatureC)}°C`);
  if (collector?.claudeProcesses != null) parts.push(`${collector.claudeProcesses} claude`);
  if (collector?.battery && !collector.battery.onAc) {
    parts.push(`battery ${collector.battery.percent}%`);
  }
  return parts.join(" · ");
}

function details(load: HostLoad | null, collector: CollectorMetrics | null): string[] {
  if (!load) return ["Waiting for the first reading"];
  const lines = [
    `${formatBytes(load.usedMemoryBytes)} of ${formatBytes(load.totalMemoryBytes)} in use`,
  ];
  if (collector?.temperatureC != null) {
    lines.push(`CPU temperature ${collector.temperatureC.toFixed(1)} °C`);
  }
  if (collector?.claudeProcesses != null) {
    const memory =
      collector.claudeMemoryGb != null ? ` using ${collector.claudeMemoryGb.toFixed(2)} GB` : "";
    lines.push(`${collector.claudeProcesses} Claude processes${memory}`);
  }
  if (collector?.battery) {
    lines.push(
      `Battery ${collector.battery.percent}% · ${collector.battery.onAc ? "plugged in" : "discharging"}`,
    );
  }
  return lines;
}

function RemoteHostLoadRow(props: { environmentId: EnvironmentId; label: string }) {
  const registry = useContext(RegistryContext);
  const query = serverEnvironment.hostResources({
    environmentId: props.environmentId,
    input: {},
  });
  const { data } = useEnvironmentQuery(query);
  const collectorUrl = useCollectorUrlStore((state) => state.urls[props.environmentId]);
  const setCollectorUrl = useCollectorUrlStore((state) => state.setUrl);
  const collector = useCollectorMetrics(collectorUrl);
  const [draftUrl, setDraftUrl] = useState(collectorUrl ?? "");

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- polls the remote host while its row is on screen
  useEffect(() => {
    const timer = setInterval(() => registry.refresh(query), REFRESH_MS);
    return () => clearInterval(timer);
  }, [registry, query]);

  const load = data ? hostLoad(data) : null;
  return (
    <Popover onOpenChange={(open) => open && setDraftUrl(collectorUrl ?? "")}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 text-2xs tabular-nums hover:bg-sidebar-row-hover",
              LEVEL_CLASS[load?.level ?? "normal"],
            )}
          />
        }
      >
        <span className="min-w-0 truncate">{props.label}</span>
        <span className="ml-auto shrink-0">{summary(load, collector)}</span>
      </PopoverTrigger>
      <PopoverPopup side="top" align="start" className="w-72">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{props.label}</span>
            {details(load, collector).map((line) => (
              <span key={line} className="text-muted-foreground">
                {line}
              </span>
            ))}
          </div>
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              setCollectorUrl(props.environmentId, draftUrl);
            }}
          >
            <label className="text-muted-foreground" htmlFor={`collector-${props.environmentId}`}>
              Metrics collector URL
            </label>
            <div className="flex gap-1.5">
              <Input
                id={`collector-${props.environmentId}`}
                size="compact"
                placeholder="http://host:port/"
                value={draftUrl}
                onChange={(event) => setDraftUrl(event.target.value)}
              />
              <Button type="submit" size="sm" variant="secondary">
                Save
              </Button>
            </div>
            {collectorUrl && !collector ? (
              <span className="text-warning">The collector is not answering.</span>
            ) : null}
          </form>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
