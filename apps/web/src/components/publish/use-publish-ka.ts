"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadAndPin } from "@/lib/commands/dkg/publish-ka";
import { getPublishStatus } from "@/lib/queries/dkg/publish-status";
import { KAS_QUERY_KEY } from "@/lib/queries/kas-types";
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
  const [ual, setUal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Consecutive polls where Inngest reported no run for this event id. */
  const missesRef = useRef(0);
  /** Consecutive polls that threw — HTTP error or transport failure. */
  const failuresRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setPhase(PublishModalPhase.Idle);
    setFile(null);
    setError(null);
    setEventId(null);
    setWatchLost(false);
    setUal(null);
    setCopied(false);
    clearPoll();
    missesRef.current = 0;
    failuresRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearPoll]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => clearPoll, [clearPoll]);

  const startPolling = useCallback(
    (id: string) => {
      clearPoll();
      missesRef.current = 0;
      failuresRef.current = 0;
      setWatchLost(false);

      const tick = async () => {
        try {
          const result = await getPublishStatus(id);
          failuresRef.current = 0;
          if (result.status === PublishJobStatus.Completed) {
            clearPoll();
            setUal(result.ual ?? null);
            setPhase(PublishModalPhase.Done);
            void queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEY });
            return;
          }
          if (result.status === PublishJobStatus.Failed) {
            // A verdict, not a lost reading: there is nothing left to watch.
            clearPoll();
            setError(result.error || "Publish job failed");
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
          // A throw is a lost reading, not a lost job — keep the interval
          // alive and stay in Processing until the blackout runs long enough
          // to be worth reporting.
          failuresRef.current += 1;
          if (failuresRef.current > PUBLISH_STATUS_ERROR_GRACE_TICKS) {
            clearPoll();
            setWatchLost(true);
            setError(err instanceof Error ? err.message : String(err));
            setPhase(PublishModalPhase.Error);
            return;
          }
          setPhase(PublishModalPhase.Processing);
        }
      };

      void tick();
      pollRef.current = setInterval(() => {
        void tick();
      }, PUBLISH_STATUS_POLL_MS);
    },
    [clearPoll, queryClient]
  );

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
    reset,
    onFileChange,
    onSubmit,
    resumeChecking,
    copyUal,
  };
}
