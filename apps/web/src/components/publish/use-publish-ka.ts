"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPublishStatus, uploadAndPin } from "@/app/actions/publish";
import { KAS_QUERY_KEY } from "@/lib/queries/kas-types";
import {
  isBusyPhase,
  isPdfFile,
  MAX_PDF_BYTES,
  MAX_PDF_MB,
  PublishJobStatus,
  PublishModalPhase,
  PUBLISH_STATUS_POLL_MS,
} from "@/lib/publish-types";

export function usePublishKa(open: boolean) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState(PublishModalPhase.Idle);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [ual, setUal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setUal(null);
    setCopied(false);
    clearPoll();
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

      const tick = async () => {
        try {
          const result = await getPublishStatus(id);
          if (result.status === PublishJobStatus.Completed) {
            clearPoll();
            setUal(result.ual ?? null);
            setPhase(PublishModalPhase.Done);
            void queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEY });
            return;
          }
          if (result.status === PublishJobStatus.Failed) {
            clearPoll();
            setError(result.error || "Publish job failed");
            setPhase(PublishModalPhase.Error);
            return;
          }
          setPhase(PublishModalPhase.Processing);
        } catch (err) {
          clearPoll();
          setError(err instanceof Error ? err.message : String(err));
          setPhase(PublishModalPhase.Error);
        }
      };

      void tick();
      pollRef.current = setInterval(() => {
        void tick();
      }, PUBLISH_STATUS_POLL_MS);
    },
    [clearPoll, queryClient]
  );

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
    // Recover from Error so Publish is available again after picking a file.
    setPhase(PublishModalPhase.Idle);
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
      (phase === PublishModalPhase.Idle ||
        phase === PublishModalPhase.Error),
    reset,
    onFileChange,
    onSubmit,
    copyUal,
  };
}
