"use client";

import { RefreshCwIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { PublishErrorAction, PublishModalPhase } from "@/lib/publish-types";

type PublishKaFooterProps = {
  phase: PublishModalPhase;
  isBusy: boolean;
  canSubmit: boolean;
  /** Read only while the phase is Error. */
  errorAction: PublishErrorAction;
  onClose: () => void;
  onReset: () => void;
  onSubmit: () => void;
  onResume: () => void;
};

export function PublishKaFooter({
  phase,
  isBusy,
  canSubmit,
  errorAction,
  onClose,
  onReset,
  onSubmit,
  onResume,
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

  const inError = phase === PublishModalPhase.Error;
  // Publishing is offered where nothing was sent: Idle, and the error that
  // never got as far as an event id. The other two errors already have a job
  // behind them, and a second publish would mint a second Target KA — one
  // offers the poll again, the failed run offers only Clear.
  const canPublish = !inError || errorAction === PublishErrorAction.Retry;

  return (
    <DialogFooter>
      {inError ? (
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
      {inError && errorAction === PublishErrorAction.Resume ? (
        <Button type="button" onClick={onResume} disabled={isBusy}>
          <RefreshCwIcon className="size-4" />
          Resume checking
        </Button>
      ) : null}
      {canPublish ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isBusy}
        >
          <UploadIcon className="size-4" />
          {inError ? "Retry publish" : "Publish"}
        </Button>
      ) : null}
    </DialogFooter>
  );
}
