import { createDkgClient } from "./index.js";

function requireUal(): string {
  const ual = process.argv[2] ?? process.env["DKG_UAL"];
  if (!ual) {
    throw new Error(
      "Missing UAL. Pass as argv or set DKG_UAL (e.g. from dkg:publish-sample output)."
    );
  }
  return ual;
}

function requireContextGraphId(): string {
  const contextGraphId =
    process.argv[3] ?? process.env["DKG_CONTEXT_GRAPH_ID"];
  if (!contextGraphId) {
    throw new Error(
      "Missing context graph id. Pass as second argv or set DKG_CONTEXT_GRAPH_ID."
    );
  }
  return contextGraphId;
}

async function main(): Promise<void> {
  const ual = requireUal();
  const contextGraphId = requireContextGraphId();
  const client = await createDkgClient();

  console.log(`API  : ${client.getApiBaseUrl()}`);
  console.log(`UAL  : ${ual}`);
  console.log(`Graph: ${contextGraphId}\n`);

  const sparql = `
    SELECT ?s ?p ?o
    WHERE {
      ?s ?p ?o .
    }
    LIMIT 20
  `;

  const { bindings } = await client.query(sparql, contextGraphId);

  console.log(`Query returned ${bindings.length} binding(s):\n`);
  console.log(JSON.stringify(bindings, null, 2));

  await client.stop();
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
