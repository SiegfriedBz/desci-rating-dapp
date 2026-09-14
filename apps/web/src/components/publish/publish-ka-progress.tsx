"use client";

import { Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  progressForPhase,
  PublishModalPhase,
} from "@/lib/publish-types";

type PublishKaProgressProps = {
  phase: PublishModalPhase.Uploading | PublishModalPhase.Processing;
  eventId: string | null;
};

export function PublishKaProgress({ phase, eventId }: PublishKaProgressProps) {
  const uploading = phase === PublishModalPhase.Uploading;

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
      <Progress value={progressForPhase(phase)} />
      {eventId ? (
        <p className="font-mono text-[11px] break-all text-muted">
          Job: {eventId}
        </p>
      ) : null}
    </div>
  );
}
