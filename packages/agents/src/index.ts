import { createDkgClient } from "@desci/dkg-client";
import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";

export interface EvaluationResult {
  ual: string;
  ready: boolean;
  chainId: number;
  bindingCount: number;
}

function requireContextGraphId(): string {
  const contextGraphId =
    process.env["DKG_CONTEXT_GRAPH_ID"] ?? process.env["DKG_UAL"];
  if (!contextGraphId) {
    throw new Error(
      "Missing DKG_CONTEXT_GRAPH_ID (or DKG_UAL) for SPARQL query scope."
    );
  }
  return contextGraphId;
}

export async function evaluateTargetAsset(
  ual: string,
  contextGraphId?: string
): Promise<EvaluationResult> {
  const graphId = contextGraphId ?? requireContextGraphId();
  const client = await createDkgClient();

  try {
    const { bindings } = await client.query(
      `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
        }
        LIMIT 1
      `,
      graphId
    );

    return {
      ual,
      ready: bindings.length > 0,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      bindingCount: bindings.length,
    };
  } finally {
    await client.stop();
  }
}
