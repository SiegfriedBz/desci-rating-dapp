import {
  createDkgClient,
  TargetAssetNotIndexedError,
  type TargetAssetBinding,
} from "@desci/dkg-client";
import { env, requireDkgContextGraphId } from "@desci/env";
import {
  formatKaScoreDescription,
  runKaScorerAgent,
} from "../../../agents/ka-scorer/index.js";
import { fulfillPhase1OnChain } from "../../evm/fulfill-phase1.js";
import { InngestEvent, inngest } from "../client.js";

const PHASE_ONE_AUTHOR = "BioProtocol_Phase1_Agent";

/**
 * When DEV_SKIP_DKG_MINT=true the oracle scores the KA normally but skips the
 * DKG publishAssertion write (which needs 3-peer write quorum).  Instead it
 * returns a synthetic R-KA UAL so fulfillPhase1 can still complete on-chain.
 * Never enable this in production.
 */
const DEV_SKIP_DKG_MINT = env.DEV_SKIP_DKG_MINT === "true";

export const phase1RequestedFunction = inngest.createFunction(
  {
    id: "phase1-requested",
    retries: 3,
    concurrency: [
      { limit: 5 },
      { key: "event.data.requestId", limit: 1 },
    ],
  },
  { event: InngestEvent.Phase1Requested },
  async ({ event, step }) => {
    const { targetUal, requestId, chainId } = event.data;
    const contextGraphId = requireDkgContextGraphId("Phase-1 DKG steps");

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

    const evaluation = await step.run("run-ka-scorer-agent", async () => {
      return runKaScorerAgent(bindings as TargetAssetBinding[]);
    });

    const minted = await step.run("mint-r-ka", async () => {
      if (DEV_SKIP_DKG_MINT) {
        // Bypass DKG write quorum for local development.
        // A real R-KA UAL is only produced when the DKG network has ≥3 healthy
        // core peers. Use this flag until the testnet stabilises.
        const syntheticUal = `did:dkg:base:84532/dev-skip-dkg/${requestId.slice(2, 14)}`;
        console.warn(
          `[phase1-requested] DEV_SKIP_DKG_MINT=true — skipping DKG publish. ` +
            `Synthetic R-KA UAL: ${syntheticUal}`
        );
        return { rKaUal: syntheticUal, ratingSubject: syntheticUal };
      }

      const client = await createDkgClient();
      try {
        const result = await client.publishRating({
          contextGraphId,
          targetUal,
          score: evaluation.score,
          author: PHASE_ONE_AUTHOR,
          description: formatKaScoreDescription(evaluation),
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
      rationale: evaluation.rationale,
      observed: evaluation.observed,
      missing: evaluation.missing,
      rKaUal: minted.rKaUal,
      fulfill,
    };
  }
);
