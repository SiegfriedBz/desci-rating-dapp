"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DKG_MINT_TARGET_KA_STEP } from "@desci/shared";
import { retryPublishMint, uploadAndPin } from "@/lib/commands/dkg/publish-ka";
import {
  clearPublishJob,
  readPublishJob,
  savePublishJob,
} from "@/lib/publish-job-store";
import { getPublishStatus } from "@/lib/queries/dkg/publish-status";
import { queryKeys } from "@/lib/queries/query-keys";
import {
  isBusyPhase,
  isPdfFile,
  MAX_PDF_BYTES,
  MAX_PDF_MB,
  PublishErrorAction,
  PublishJobStatus,
  PublishModalPhase,
  PUBLISH_STATUS_ERROR_GRACE_TICKS,
  PUBLISH_STATUS_GRACE_TICKS,
  PUBLISH_STATUS_POLL_MS,
} from "@/lib/publish-types";

export function usePublishKa(open: boolean) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState(PublishModalPhase.Idle);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  /** The poll stopped without a verdict, so the job's fate is unknown. */
  const [watchLost, setWatchLost] = useState(false);
  /** When Inngest started the run, for the elapsed clock. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  /** Step a failed run stopped on, when Inngest named one. */
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const [ual, setUal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Consecutive polls where Inngest reported no run for this event id. */
  const missesRef = useRef(0);
  /** Consecutive polls that came back without a reading — returned or thrown. */
  const failuresRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * Empty the modal without touching the stored job. Closing the modal is not
   * a decision to abandon a running publish, so the id has to outlive this.
   */
  const reset = useCallback(() => {
    setPhase(PublishModalPhase.Idle);
    setFile(null);
    setError(null);
    setEventId(null);
    setWatchLost(false);
    setStartedAt(null);
    setFailedStep(null);
    setUal(null);
    setCopied(false);
    clearPoll();
    missesRef.current = 0;
    failuresRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearPoll]);

  /** Clear, the button: abandoning the job on purpose, so the id goes too. */
  const clearJob = useCallback(() => {
    clearPublishJob();
    reset();
  }, [reset]);

  useEffect(() => clearPoll, [clearPoll]);

  const startPolling = useCallback(
    (id: string) => {
      clearPoll();
      missesRef.current = 0;
      failuresRef.current = 0;
      setWatchLost(false);

      /**
       * A reading we did not get. The job is untouched by it — only our view
       * of the job is — so keep the interval alive and stay in `Processing`
       * until the blackout has run long enough to be worth reporting.
       *
       * Two paths arrive here and they are not the same failure. A returned
       * `ok: false` means the action ran and Inngest is what refused, so the
       * message is ours and says which hop broke. A throw means the call
       * itself never completed — no network, or a request cut off mid-flight
       * while the deployment behind it was replaced. Both leave the job's
       * fate unknown, which is all the grace window cares about.
       */
      const noteLostReading = (message: string) => {
        failuresRef.current += 1;
        if (failuresRef.current > PUBLISH_STATUS_ERROR_GRACE_TICKS) {
          clearPoll();
          setWatchLost(true);
          setError(message);
          setPhase(PublishModalPhase.Error);
          return;
        }
        setPhase(PublishModalPhase.Processing);
      };

      const tick = async () => {
        try {
          const read = await getPublishStatus(id);
          if (!read.ok) {
            noteLostReading(read.error);
            return;
          }
          const result = read.data;
          failuresRef.current = 0;
          if (result.startedAt != null) {
            setStartedAt(result.startedAt);
          }
          if (result.status === PublishJobStatus.Completed) {
            clearPoll();
            clearPublishJob();
            setUal(result.ual ?? null);
            setPhase(PublishModalPhase.Done);
            void queryClient.invalidateQueries({ queryKey: queryKeys.kas() });
            return;
          }
          if (result.status === PublishJobStatus.Failed) {
            // A verdict, not a lost reading: there is nothing left to watch.
            // Both verdicts drop the stored id — only an unresolved job is
            // worth restoring, and neither of these can be resumed.
            clearPoll();
            clearPublishJob();
            setError(result.error || "Publish job failed");
            setFailedStep(result.failedStep ?? null);
            setPhase(PublishModalPhase.Error);
            return;
          }
          if (result.status === PublishJobStatus.NotFound) {
            missesRef.current += 1;
            if (missesRef.current > PUBLISH_STATUS_GRACE_TICKS) {
              clearPoll();
              setWatchLost(true);
              setError(
                "Inngest has no record of this job. The status poll is probably reading a different Inngest environment than the one the job was sent to."
              );
              setPhase(PublishModalPhase.Error);
              return;
            }
            setPhase(PublishModalPhase.Processing);
            return;
          }
          missesRef.current = 0;
          setPhase(PublishModalPhase.Processing);
        } catch (err) {
          noteLostReading(err instanceof Error ? err.message : String(err));
        }
      };

      void tick();
      pollRef.current = setInterval(() => {
        void tick();
      }, PUBLISH_STATUS_POLL_MS);
    },
    [clearPoll, queryClient]
  );

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    // Opening finds the modal empty whether it was never used, reopened, or
    // rebuilt by a reload — and in the last two a job may still be running.
    // The poll starts here rather than behind a button because until it does,
    // `errorAction` would read `None` for a restored id and offer only Clear.
    // `startPolling` zeroes both grace counters, so a rejoined poll gets the
    // full two-minute blackout allowance from now and inherits nothing from
    // the blackout that may have ended the last one.
    const stored = readPublishJob();
    if (!stored) {
      return;
    }
    setEventId(stored);
    setPhase(PublishModalPhase.Processing);
    startPolling(stored);
  }, [open, reset, startPolling]);

  /**
   * The job outlived the poll, so the recovery is to watch again — never to
   * publish again, which would mint a second Target KA under a second
   * generated name.
   */
  const resumeChecking = () => {
    if (!eventId) {
      return;
    }
    setError(null);
    setPhase(PublishModalPhase.Processing);
    startPolling(eventId);
  };

  /**
   * Finish a run that stored the KA and never minted it. Deliberately not
   * "publish again": the asset is on the daemon under a name derived from the
   * *first* event id, so this sends that id back and mints what is already
   * there. From here the modal watches the mint run instead of the publish
   * run, which has already reached its verdict.
   */
  const retryMint = async () => {
    if (!eventId) {
      return;
    }
    setError(null);
    setPhase(PublishModalPhase.Processing);
    try {
      const { eventId: mintEventId } = await retryPublishMint(eventId);
      savePublishJob(mintEventId);
      setEventId(mintEventId);
      setFailedStep(null);
      setStartedAt(null);
      startPolling(mintEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(PublishModalPhase.Error);
    }
  };

  const onFileChange = (next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!isPdfFile(next)) {
      setFile(null);
      setError("Only PDF files are accepted");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    if (next.size > MAX_PDF_BYTES) {
      setFile(null);
      setError(`PDF exceeds the ${MAX_PDF_MB} MB limit`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setFile(next);
    // Recover from Error so Publish is available again after picking a file —
    // only when nothing was sent. With an event id in hand a job is in flight,
    // and a new file must not re-arm Publish behind it.
    if (eventId == null) {
      setPhase(PublishModalPhase.Idle);
    }
  };

  const onSubmit = async () => {
    if (!file) {
      setError("Choose a PDF file first");
      return;
    }
    setError(null);
    setPhase(PublishModalPhase.Uploading);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { eventId: id } = await uploadAndPin(formData);
      // Stored before the poll starts: from here on the job exists, and an id
      // only React knows about is one a reload would lose.
      savePublishJob(id);
      setEventId(id);
      setPhase(PublishModalPhase.Processing);
      startPolling(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(PublishModalPhase.Error);
    }
  };

  const copyUal = async () => {
    if (!ual) {
      return;
    }
    try {
      await navigator.clipboard.writeText(ual);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy UAL to clipboard");
    }
  };

  return {
    phase,
    file,
    error,
    eventId,
    startedAt,
    failedStep,
    ual,
    copied,
    fileInputRef,
    isBusy: isBusyPhase(phase),
    canSubmit:
      file != null &&
      eventId == null &&
      (phase === PublishModalPhase.Idle ||
        phase === PublishModalPhase.Error),
    // Derived rather than stored, so no stale flag can offer Resume once the
    // event id is gone. Only meaningful while the phase is Error.
    errorAction:
      eventId == null
        ? PublishErrorAction.Retry
        : watchLost
          ? PublishErrorAction.Resume
          : PublishErrorAction.None,
    // A failure *on the mint step* is the one verdict that leaves something
    // worth finishing: every stage before it is memoized and the KA is on the
    // daemon, so the run is one `vm/publish` short of a UAL.
    canRetryMint:
      phase === PublishModalPhase.Error &&
      eventId != null &&
      failedStep === DKG_MINT_TARGET_KA_STEP,
    clearJob,
    onFileChange,
    onSubmit,
    resumeChecking,
    retryMint,
    copyUal,
  };
}
