import {
  createDkgClient,
  TargetAssetNotIndexedError,
  type TargetAssetBinding,
} from "@desci/dkg-client";
import { fulfillPhase1OnChain } from "../evm/fulfill-phase1.js";
import { runSciScoreAgent } from "../sciscore/graph.js";
import { inngest } from "./client.js";

const PHASE_ONE_AUTHOR = "BioProtocol_Phase1_Agent";

function requireContextGraphId(): string {
  const id = process.env["DKG_CONTEXT_GRAPH_ID"];
  if (!id?.trim()) {
    throw new Error("DKG_CONTEXT_GRAPH_ID is required for Phase-1 DKG steps");
  }
  return id.trim();
}

export const phase1RequestedFunction = inngest.createFunction(
  {
    id: "phase1-requested",
    retries: 3,
    concurrency: [
      { limit: 5 },
      { key: "event.data.requestId", limit: 1 },
    ],
  },
  { event: "RatingController/phase1.requested" },
  async ({ event, step }) => {
    const { targetUal, requestId, chainId } = event.data;
    const contextGraphId = requireContextGraphId();

    const bindings = await step.run("fetch-target-ka", async () => {
      const client = await createDkgClient();
      try {
        const result = await client.getAssetQuadsByUal(targetUal, contextGraphId);
        return result.bindings;
      } catch (err) {
        if (err instanceof TargetAssetNotIndexedError) {
          // Rethrow so Inngest retries with backoff (indexing lag).
          throw err;
        }
        throw err;
      } finally {
        await client.stop();
      }
    });

    const evaluation = await step.run("run-sciscore-agent", async () => {
      return runSciScoreAgent(bindings as TargetAssetBinding[]);
    });

    const minted = await step.run("mint-r-ka", async () => {
      const client = await createDkgClient();
      try {
        const result = await client.publishRating({
          contextGraphId,
          targetUal,
          score: evaluation.score,
          author: PHASE_ONE_AUTHOR,
        });
        return { rKaUal: result.ual, ratingSubject: result.ratingSubject };
      } finally {
        await client.stop();
      }
    });

    const fulfill = await step.run("fulfill-on-chain", async () => {
      return fulfillPhase1OnChain({
        targetUal,
        score: evaluation.score,
        rKaUal: minted.rKaUal,
        chainId,
      });
    });

    return {
      requestId,
      targetUal,
      score: evaluation.score,
      rigor: evaluation.rigor,
      rKaUal: minted.rKaUal,
      fulfill,
    };
  }
);
