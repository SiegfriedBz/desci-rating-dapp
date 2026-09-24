"use server";

import { env, inngestApiBaseUrl, inngestEnvName } from "@desci/env";
import {
  PublishJobStatus,
  type PublishStatusRead,
} from "@/lib/publish-types";

/**
 * Only the two scalars are declared. `output` is whatever the function
 * returned, or — on a failure — whatever the SDK serialised, so it is read
 * field by field rather than described by a type we do not control. The
 * previous shape here claimed `{ ual?: string; error?: string }` and that
 * claim is exactly what hid a production failure: see {@link toErrorText}.
 */
type InngestRun = {
  status?: string;
  run_started_at?: string;
  output?: unknown;
  error?: unknown;
};

type InngestRunsResponse = {
  data?: InngestRun[];
};

function mapInngestStatus(raw: string | undefined): PublishJobStatus {
  switch (raw) {
    case "Completed":
      return PublishJobStatus.Completed;
    case "Failed":
    case "Cancelled":
      return PublishJobStatus.Failed;
    case "Running":
      return PublishJobStatus.Running;
    case "Queued":
    case "Scheduled":
    default:
      return PublishJobStatus.Queued;
  }
}

/**
 * `fetch` rejects with a bare "fetch failed" and puts the useful half —
 * `connect ECONNREFUSED 127.0.0.1:8288`, and the like — on `cause`.
 */
function describeCause(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const cause = err.cause;
  return cause instanceof Error && cause.message
    ? `${err.message} (${cause.message})`
    : err.message;
}

/** A trimmed string property, or nothing. Never assumes the key is a string. */
function readString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined;
}

/**
 * Turn whatever Inngest recorded for a failed run into text a person can read.
 *
 * The SDK serialises a step failure through its `jsonErrorSchema`, which emits
 * `{ name, message, stack }` and folds any `error` field it was handed *into*
 * `message`. `message` is therefore the field that carries the cause, and
 * `error` is one the schema never writes. Reading only `error` is why a real
 * `storage_ack_insufficient` quorum failure reached the modal as the generic
 * "Publish job failed" with the actual reason sitting unread in the payload.
 */
function toErrorText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  return readString(value, "message") ?? readString(value, "error");
}

function parseStartedAt(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Poll Inngest for the status of a `pdf.submitted` run. Called every few
 * seconds from the Publish KA modal, for as long as the job takes.
 *
 * Nothing here throws on a failed read. Every failure is returned as
 * `{ ok: false, error }`, because a thrown server-action error is redacted to
 * a generic string before it reaches the browser in production — see
 * {@link PublishStatusRead}. Throwing would leave the modal unable to say
 * which hop broke, which is the one thing a six-minute poll must be able to
 * do. The caller decides what a lost reading means; this only reports it.
 */
export async function getPublishStatus(
  eventId: string
): Promise<PublishStatusRead> {
  const trimmed = eventId.trim();
  if (!trimmed) {
    return { ok: false, error: "eventId is required" };
  }

  const headers = new Headers();
  if (env.INNGEST_SIGNING_KEY) {
    headers.set("Authorization", `Bearer ${env.INNGEST_SIGNING_KEY}`);
  }
  // Branch environments share one signing key, so the key alone does not say
  // which one to read. The SDK adds this on send; a raw fetch must add it too.
  if (inngestEnvName) {
    headers.set("x-inngest-env", inngestEnvName);
  }

  let res: Response;
  try {
    res = await fetch(
      `${inngestApiBaseUrl}/v1/events/${encodeURIComponent(trimmed)}/runs`,
      {
        headers,
        cache: "no-store",
      }
    );
  } catch (err) {
    console.error("[publish-status] Inngest unreachable:", err);
    return {
      ok: false,
      error: `Inngest status poll never reached Inngest: ${describeCause(err)}`,
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `Inngest status poll failed (HTTP ${res.status}): ${body.slice(0, 200)}`,
    };
  }

  let json: InngestRunsResponse;
  try {
    json = (await res.json()) as InngestRunsResponse;
  } catch (err) {
    console.error("[publish-status] Inngest sent a non-JSON body:", err);
    return {
      ok: false,
      error: "Inngest status poll got a 200 that was not JSON",
    };
  }

  const run = json.data?.[0];
  if (!run) {
    return { ok: true, data: { status: PublishJobStatus.NotFound } };
  }

  const status = mapInngestStatus(run.status);
  // The error is read only for a verdict of Failed. A run that succeeded puts
  // its own return value in `output`, and nothing there should be mistaken for
  // a diagnosis just because it happens to carry a `message`.
  const failed = status === PublishJobStatus.Failed;

  return {
    ok: true,
    data: {
      status,
      ual: readString(run.output, "ual"),
      error: failed
        ? (toErrorText(run.output) ?? toErrorText(run.error))
        : undefined,
      // `jsonErrorSchema` passes unknown keys through, so the `stepId` the SDK
      // attaches to a `StepError` survives into the run's output.
      failedStep: failed ? readString(run.output, "stepId") : undefined,
      startedAt: parseStartedAt(run.run_started_at),
    },
  };
}
