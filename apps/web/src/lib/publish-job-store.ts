"use client";

import { PUBLISH_JOB_TTL_MS } from "@/lib/publish-types";

const STORAGE_KEY = "desci.publish-job";

type StoredPublishJob = {
  eventId: string;
  savedAt: number;
};

/**
 * The in-flight publish, remembered outside React state.
 *
 * Until now the event id lived only in the modal's state, so closing the modal
 * or reloading the page abandoned a running job with no way back to it. Over a
 * wait of five to ten minutes that is not an edge case.
 *
 * `localStorage` and not `sessionStorage`, because `sessionStorage` dies with
 * the tab and the tab is exactly what a person closes during a six-minute
 * wait. The asymmetry decides it: losing the id is the dangerous direction,
 * since `canSubmit` reads an absent id as "nothing was sent" and offers
 * Publish again, minting a second Target KA for the same paper. Restoring one
 * only ever costs a poll. Every read is expiry-checked so the id can go stale
 * without ever going wrong.
 *
 * Reads and writes are defensive because `localStorage` is not always there to
 * be used: server rendering has no `window`, and a browser told to block site
 * data throws on access rather than returning null. Losing the id is bad but
 * survivable; taking the modal down with it is not.
 */

export function readPublishJob(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearPublishJob();
    return null;
  }

  const job = parsed as Partial<StoredPublishJob> | null;
  if (
    !job ||
    typeof job.eventId !== "string" ||
    !job.eventId ||
    typeof job.savedAt !== "number"
  ) {
    clearPublishJob();
    return null;
  }

  if (Date.now() - job.savedAt > PUBLISH_JOB_TTL_MS) {
    clearPublishJob();
    return null;
  }

  return job.eventId;
}

export function savePublishJob(eventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const job: StoredPublishJob = { eventId, savedAt: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch {
    // Out of quota, or site data blocked. The publish itself is unaffected.
  }
}

export function clearPublishJob(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the expiry will retire the entry regardless.
  }
}
