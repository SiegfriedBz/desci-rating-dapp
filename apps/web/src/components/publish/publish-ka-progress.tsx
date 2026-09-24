"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  formatElapsed,
  progressForPhase,
  PublishModalPhase,
} from "@/lib/publish-types";

type PublishKaProgressProps = {
  phase: PublishModalPhase.Uploading | PublishModalPhase.Processing;
  eventId: string | null;
  /** When Inngest started the run, or null before it reports one. */
  startedAt: number | null;
};

/**
 * Milliseconds since `startedAt`, re-read once a second.
 *
 * The poll runs every three seconds but only writes state when something
 * changes, and for almost all of a six-minute publish nothing does. Without a
 * clock of its own the bar would sit still for minutes at a time, which is the
 * thing it exists to stop looking like.
 */
function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  // Unconditional, so `now` is never more than a second stale when `startedAt`
  // finally arrives. The panel is only mounted while a publish is busy, and a
  // render a second for that stretch is cheaper than a first reading that lags
  // however long the upload took.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return startedAt == null ? 0 : Math.max(0, now - startedAt);
}

export function PublishKaProgress({
  phase,
  eventId,
  startedAt,
}: PublishKaProgressProps) {
  const uploading = phase === PublishModalPhase.Uploading;
  const elapsedMs = useElapsed(startedAt);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {uploading
            ? "Pinning to IPFS…"
            : "Running GROBID → Gemini → DKG…"}
        </p>
        <Badge variant="accent">
          <Loader2Icon className="mr-1 size-3 animate-spin" />
          {uploading ? "Upload" : "Processing"}
        </Badge>
      </div>
      <Progress value={progressForPhase(phase, elapsedMs)} />
      {eventId || startedAt != null ? (
        <div className="flex items-start justify-between gap-3 text-[11px] text-muted">
          {eventId ? (
            <p className="font-mono break-all">Job: {eventId}</p>
          ) : (
            <span />
          )}
          {startedAt != null ? (
            <p className="shrink-0 tabular-nums">
              Running for {formatElapsed(elapsedMs)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
