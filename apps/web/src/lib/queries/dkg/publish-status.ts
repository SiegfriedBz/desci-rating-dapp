"use server";

import { env, inngestApiBaseUrl, inngestEnvName } from "@desci/env";
import {
  PublishJobStatus,
  type PublishStatusRead,
} from "@/lib/publish-types";

type InngestRun = {
  status?: string;
  run_started_at?: string;
  output?: { ual?: string; error?: string } | string;
  error?: string | { message?: string };
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

  let ual: string | undefined;
  let error: string | undefined;

  if (run.output && typeof run.output === "object") {
    ual = run.output.ual;
    error = run.output.error;
  }
  if (!error && typeof run.error === "string") {
    error = run.error;
  } else if (!error && run.error && typeof run.error === "object") {
    error = run.error.message;
  }

  return {
    ok: true,
    data: {
      status: mapInngestStatus(run.status),
      ual,
      error,
      startedAt: parseStartedAt(run.run_started_at),
    },
  };
}
