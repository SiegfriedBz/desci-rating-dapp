import { serve } from "inngest/next";
import {
  inngest,
  phase1RequestedFunction,
  phase1FulfilledLogFunction,
  requestCancelledLogFunction,
  oracleUpdatedLogFunction,
  publishPdfFunction,
} from "@desci/agents/inngest";

/**
 * A step's work runs inside one request to this route, so the cap has to clear
 * the slowest step. Below it Vercel kills the invocation after the side effect
 * has landed but before Inngest is told, and the retry redoes the work.
 * Requires a plan that allows it — Hobby caps at 60s.
 */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    phase1RequestedFunction,
    phase1FulfilledLogFunction,
    requestCancelledLogFunction,
    oracleUpdatedLogFunction,
    publishPdfFunction,
  ],
});
