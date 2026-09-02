import { createDkgClient } from "./index.js";

const contextGraphId =
  process.env["DKG_CONTEXT_GRAPH_ID"]?.trim() || "desci-sample";
const kaName = "desci-sample-1";

async function main(): Promise<void> {
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
        subject: "urn:uuid:desci-sample-1",
        predicate: "http://schema.org/name",
        object: '"DeSci sample Knowledge Asset"',
      },
      {
        subject: "urn:uuid:desci-sample-1",
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

  await client.stop();
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
