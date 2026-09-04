import { inngest } from "../client.js";

/** Log-only handler for Phase1Fulfilled (on-chain confirmation of our own fulfill). */
export const phase1FulfilledLogFunction = inngest.createFunction(
  { id: "phase1-fulfilled-log", retries: 2 },
  { event: "RatingController/phase1.fulfilled" },
  async ({ event, step }) => {
    await step.run("log-phase1-fulfilled", async () => {
      console.log("[RatingController/phase1.fulfilled]", {
        requestId: event.data.requestId,
        targetUal: event.data.targetUal,
        score: event.data.score,
        rKaUal: event.data.rKaUal,
        transactionHash: event.data.transactionHash,
      });
      return { logged: true as const };
    });
  }
);

/** Log-only handler for RequestCancelled. */
export const requestCancelledLogFunction = inngest.createFunction(
  { id: "request-cancelled-log", retries: 2 },
  { event: "RatingController/request.cancelled" },
  async ({ event, step }) => {
    await step.run("log-request-cancelled", async () => {
      console.log("[RatingController/request.cancelled]", {
        requestId: event.data.requestId,
        targetUal: event.data.targetUal,
        transactionHash: event.data.transactionHash,
      });
      return { logged: true as const };
    });
  }
);

/** Log-only handler for OracleAgentUpdated. */
export const oracleUpdatedLogFunction = inngest.createFunction(
  { id: "oracle-updated-log", retries: 2 },
  { event: "RatingController/oracle.updated" },
  async ({ event, step }) => {
    await step.run("log-oracle-updated", async () => {
      console.log("[RatingController/oracle.updated]", {
        newAgent: event.data.newAgent,
        transactionHash: event.data.transactionHash,
      });
      return { logged: true as const };
    });
  }
);
