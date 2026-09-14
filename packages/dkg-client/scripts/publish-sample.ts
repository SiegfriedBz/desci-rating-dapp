import { createDkgClient } from "@desci/dkg-client";
import { env } from "@desci/env";
import {
  resolveSampleContextGraphId,
  resolveSampleKaName,
  sampleSubjectUri,
} from "./cli/sample.js";
import { runMain } from "./cli/run.js";

async function main(): Promise<void> {
  const contextGraphId = resolveSampleContextGraphId(env.DKG_CONTEXT_GRAPH_ID);
  const kaName = resolveSampleKaName({
    kaName: env.DKG_KA_NAME,
    subjectUri: env.DKG_SUBJECT_URI,
  })!;
  const subjectUri = env.DKG_SUBJECT_URI || sampleSubjectUri(kaName);

  const client = await createDkgClient();

  console.log(`API  : ${client.getApiBaseUrl()}`);
  console.log(`Hub  : ${client.getHubAddress()}`);
  console.log(`Graph: ${contextGraphId}`);
  console.log(`KA   : ${kaName}\n`);

  await client.ensureContextGraph(contextGraphId, "DeSci Sample");

  const { ual } = await client.publishAsset({
    contextGraphId,
    name: kaName,
    quads: [
      {
        subject: subjectUri,
        predicate: "http://schema.org/name",
        object: '"DeSci sample Knowledge Asset"',
      },
      {
        subject: subjectUri,
        predicate: "http://schema.org/description",
        object: '"Minted on Base Sepolia via @desci/dkg-client"',
      },
    ],
  });

  console.log("Knowledge Asset ready (created or reused).");
  console.log(`UAL: ${ual}`);
  console.log("\nIdentifiers (optional — fetch defaults to the same KA name):");
  console.log(`  DKG_KA_NAME=${kaName}`);
  console.log(`  DKG_UAL=${ual}`);
  console.log(`  DKG_SUBJECT_URI=${subjectUri}`);
  console.log(`  DKG_CONTEXT_GRAPH_ID=${contextGraphId}`);

  await client.stop();
}

runMain(main);
