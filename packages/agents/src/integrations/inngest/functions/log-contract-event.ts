import { InngestEvent, inngest } from "../client.js";

/** Log-only handler for Phase1Fulfilled (on-chain confirmation of our own fulfill). */
export const phase1FulfilledLogFunction = inngest.createFunction(
  { id: "phase1-fulfilled-log", retries: 2 },
  { event: InngestEvent.Phase1Fulfilled },
  async ({ event, step }) => {
    await step.run("log-phase1-fulfilled", async () => {
      console.log(`[${InngestEvent.Phase1Fulfilled}]`, {
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
  { event: InngestEvent.RequestCancelled },
  async ({ event, step }) => {
    await step.run("log-request-cancelled", async () => {
      console.log(`[${InngestEvent.RequestCancelled}]`, {
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
  { event: InngestEvent.OracleUpdated },
  async ({ event, step }) => {
    await step.run("log-oracle-updated", async () => {
      console.log(`[${InngestEvent.OracleUpdated}]`, {
        newAgent: event.data.newAgent,
        transactionHash: event.data.transactionHash,
      });
      return { logged: true as const };
    });
  }
);
