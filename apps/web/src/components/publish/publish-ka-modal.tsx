"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_PDF_MB,
  PublishErrorAction,
  PublishModalPhase,
} from "@/lib/publish-types";
import { PublishKaErrorNotice } from "./publish-ka-error-notice";
import { PublishKaFileForm } from "./publish-ka-file-form";
import { PublishKaFooter } from "./publish-ka-footer";
import { PublishKaProgress } from "./publish-ka-progress";
import { PublishKaSuccess } from "./publish-ka-success";
import { usePublishKa } from "./use-publish-ka";

type PublishKaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PublishKaModal({ open, onOpenChange }: PublishKaModalProps) {
  const {
    phase,
    file,
    error,
    eventId,
    startedAt,
    ual,
    copied,
    fileInputRef,
    isBusy,
    canSubmit,
    errorAction,
    clearJob,
    onFileChange,
    onSubmit,
    resumeChecking,
    copyUal,
  } = usePublishKa(open);

  const inError = phase === PublishModalPhase.Error;
  // The picker belongs to the states a publish can still start from.
  const showForm =
    phase === PublishModalPhase.Idle ||
    (inError && errorAction === PublishErrorAction.Retry);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Publish Knowledge Asset</DialogTitle>
          <DialogDescription>
            Upload a scientific PDF (max {MAX_PDF_MB} MB). It will be pinned to
            IPFS for permanent content-addressed storage, parsed by GROBID,
            structured by Gemini AI, and published as a Knowledge Asset on
            OriginTrail DKG — minting an ERC-721 NFT on Base Sepolia that
            anchors its provenance on-chain. No wallet signature required. This
            takes 5–10 minutes.
          </DialogDescription>
        </DialogHeader>

        {isBusy ? (
          <PublishKaProgress
            phase={
              phase === PublishModalPhase.Uploading
                ? PublishModalPhase.Uploading
                : PublishModalPhase.Processing
            }
            eventId={eventId}
            startedAt={startedAt}
          />
        ) : null}

        {phase === PublishModalPhase.Done ? (
          <PublishKaSuccess
            ual={ual}
            copied={copied}
            onCopy={() => void copyUal()}
          />
        ) : null}

        {inError && errorAction !== PublishErrorAction.Retry ? (
          <PublishKaErrorNotice
            action={errorAction}
            error={error}
            eventId={eventId}
          />
        ) : null}

        {showForm ? (
          <PublishKaFileForm
            file={file}
            error={error}
            fileInputRef={fileInputRef}
            onFileChange={onFileChange}
          />
        ) : null}

        <PublishKaFooter
          phase={phase}
          isBusy={isBusy}
          canSubmit={canSubmit}
          errorAction={errorAction}
          onClose={() => onOpenChange(false)}
          onReset={clearJob}
          onSubmit={() => void onSubmit()}
          onResume={resumeChecking}
        />
      </DialogContent>
    </Dialog>
  );
}
