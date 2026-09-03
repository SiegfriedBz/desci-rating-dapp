import {
  createDkgClient,
  TargetAssetNotIndexedError,
} from "@desci/dkg-client";
import { argOrEnv } from "./cli/env.js";
import { runMain } from "./cli/run.js";
import {
  resolveSampleContextGraphId,
  resolveSampleKaName,
} from "./cli/sample.js";

async function main(): Promise<void> {
  const contextGraphId = resolveSampleContextGraphId(
    argOrEnv(3, "DKG_CONTEXT_GRAPH_ID")
  );
  const envUal = argOrEnv(2, "DKG_UAL");
  const kaName = resolveSampleKaName({
    kaName: process.env["DKG_KA_NAME"],
    ual: envUal,
  });

  const client = await createDkgClient();

  let ual = envUal;
  let ualSource: "DKG_UAL" | "daemon" = "DKG_UAL";

  if (kaName) {
    const resolved = await client.getAssetUal(kaName, contextGraphId);
    if (resolved) {
      if (envUal && envUal !== resolved) {
        console.warn(
          `Warning: DKG_UAL in env/argv (${envUal}) differs from daemon UAL for KA "${kaName}". Using daemon UAL.`
        );
      }
      ual = resolved;
      ualSource = "daemon";
    } else if (!envUal) {
      throw new Error(
        `No UAL found for Knowledge Asset "${kaName}" in graph "${contextGraphId}". Run pnpm dkg:publish-sample first, or set DKG_UAL.`
      );
    } else {
      console.warn(
        `Warning: KA "${kaName}" has no UAL in daemon; falling back to DKG_UAL.`
      );
    }
  }

  if (!ual) {
    throw new Error(
      "Missing UAL. Set DKG_UAL, or DKG_KA_NAME, or run pnpm dkg:publish-sample (defaults to the shared sample KA)."
    );
  }

  console.log(`API  : ${client.getApiBaseUrl()}`);
  console.log(`Graph: ${contextGraphId}`);
  if (kaName) {
    console.log(`KA   : ${kaName}`);
  }
  console.log(
    `UAL  : ${ual}${ualSource === "daemon" ? " (from daemon)" : ""}\n`
  );

  console.log("--- Action A: getAssetQuadsByUal ---");
  try {
    const { bindings: assetBindings } = await client.getAssetQuadsByUal(
      ual,
      contextGraphId
    );

    console.log(`Found ${assetBindings.length} property binding(s):\n`);
    for (const { subject, predicate, object } of assetBindings) {
      console.log(`  ${subject}`);
      console.log(`    ${predicate}`);
      console.log(`      → ${object}`);
    }
    console.log();
  } catch (err) {
    if (err instanceof TargetAssetNotIndexedError) {
      console.log("No triples found for this UAL (not indexed locally).\n");
    } else {
      throw err;
    }
  }

  console.log("--- Action B: fetchRatingsForAsset ---");
  const { bindings: ratingBindings } = await client.fetchRatingsForAsset(
    ual,
    contextGraphId
  );

  if (ratingBindings.length === 0) {
    console.log(
      "No ratings found for this UAL (expected until rating Knowledge Assets are published).\n"
    );
  } else {
    console.log(`Found ${ratingBindings.length} rating(s):\n`);
    for (const rating of ratingBindings) {
      console.log(`  subject : ${rating.ratingSubject}`);
      console.log(`  value   : ${rating.ratingValue}`);
      console.log(`  author  : ${rating.author}`);
      console.log();
    }
  }

  await client.stop();
}

runMain(main);
