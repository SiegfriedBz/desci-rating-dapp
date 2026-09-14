import { serve } from "inngest/next";
import {
  inngest,
  phase1RequestedFunction,
  phase1FulfilledLogFunction,
  requestCancelledLogFunction,
  oracleUpdatedLogFunction,
  publishPdfFunction,
} from "@desci/agents/inngest";

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
