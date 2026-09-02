import { createDkgClient } from "@desci/dkg-client";
import { runMain } from "./cli/run.js";

const SAMPLE_SUBJECT = "urn:uuid:desci-sample-1";
const SAMPLE_KA_NAME = "desci-sample-1";

async function main(): Promise<void> {
  const contextGraphId =
    process.env["DKG_CONTEXT_GRAPH_ID"]?.trim() || "desci-sample";
  const client = await createDkgClient();

  console.log(`API  : ${client.getApiBaseUrl()}`);
  console.log(`Hub  : ${client.getHubAddress()}`);
  console.log(`Graph: ${contextGraphId}`);
  console.log(`KA   : ${SAMPLE_KA_NAME}\n`);

  await client.ensureContextGraph(contextGraphId, "DeSci Sample");

  const { ual } = await client.publishAsset({
    contextGraphId,
    name: SAMPLE_KA_NAME,
    quads: [
      {
        subject: SAMPLE_SUBJECT,
        predicate: "http://schema.org/name",
        object: '"DeSci sample Knowledge Asset"',
      },
      {
        subject: SAMPLE_SUBJECT,
        predicate: "http://schema.org/description",
        object: '"Minted on Base Sepolia via @desci/dkg-client"',
      },
    ],
  });

  console.log("Knowledge Asset published successfully.");
  console.log(`UAL: ${ual}`);
  console.log("\nExport for fetch script:");
  console.log(`export DKG_UAL="${ual}"`);
  console.log(`export DKG_CONTEXT_GRAPH_ID="${contextGraphId}"`);
  console.log(`export DKG_SUBJECT_URI="${SAMPLE_SUBJECT}"`);

  await client.stop();
}

runMain(main);
