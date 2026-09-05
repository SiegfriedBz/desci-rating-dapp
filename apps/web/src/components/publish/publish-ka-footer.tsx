"use client";

import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { PublishModalPhase } from "@/lib/publish-types";

type PublishKaFooterProps = {
  phase: PublishModalPhase;
  isBusy: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onReset: () => void;
  onSubmit: () => void;
};

export function PublishKaFooter({
  phase,
  isBusy,
  canSubmit,
  onClose,
  onReset,
  onSubmit,
}: PublishKaFooterProps) {
  if (phase === PublishModalPhase.Done) {
    return (
      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    );
  }

  // Idle + Error share Cancel / Publish so a failed job can be retried
  // without wiping the selected PDF via "Try again".
  return (
    <DialogFooter>
      {phase === PublishModalPhase.Error ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onReset}
          disabled={isBusy}
        >
          Clear
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isBusy}
        >
          Cancel
        </Button>
      )}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
      >
        <UploadIcon className="size-4" />
        {phase === PublishModalPhase.Error ? "Retry publish" : "Publish"}
      </Button>
    </DialogFooter>
  );
}
