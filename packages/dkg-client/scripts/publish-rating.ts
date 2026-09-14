import { createDkgClient } from "@desci/dkg-client";
import { requireEnv } from "./cli/env.js";
import { runMain } from "./cli/run.js";

/** Phase 1 dummy agent score (mock). */
const PHASE_ONE_SCORE = 85;
const PHASE_ONE_AUTHOR = "BioProtocol_Phase1_Agent";

async function main(): Promise<void> {
  const targetUal = requireEnv(
    "DKG_UAL",
    "Set it to the target publication UAL (e.g. from dkg:publish-sample)."
  );
  const contextGraphId = requireEnv(
    "DKG_CONTEXT_GRAPH_ID",
    "Set it to the same context graph as the target publication."
  );

  const client = await createDkgClient();

  console.log(`API  : ${client.getApiBaseUrl()}`);
  console.log(`Hub  : ${client.getHubAddress()}`);
  console.log(`Graph: ${contextGraphId}`);
  console.log(`About: ${targetUal}\n`);

  await client.ensureContextGraph(contextGraphId);

  const result = await client.publishRating({
    contextGraphId,
    targetUal,
    score: PHASE_ONE_SCORE,
    author: PHASE_ONE_AUTHOR,
    description:
      "Placeholder Phase-1 verdict from dkg:publish-rating (no LLM run).\n\nObserved:\n- (none)\n\nMissing:\n- (none)",
  });

  console.log("Rating Knowledge Asset (R-KA) published successfully.");
  console.log(`KA name : ${result.name}`);
  console.log(`Subject : ${result.ratingSubject}`);
  console.log(`R-KA UAL: ${result.ual}`);
  console.log(
    "\nNext: run `pnpm dkg:fetch-asset` to verify Action B discovers this rating."
  );

  await client.stop();
}

runMain(main);
