import { createDkgClient } from "@desci/dkg-client";

export interface EvaluationResult {
  ual: string;
  ready: boolean;
  chainId: number;
}

export async function evaluateTargetAsset(
  ual: string
): Promise<EvaluationResult> {
  const dkg = createDkgClient();

  return {
    ual,
    ready: true,
    chainId: dkg.getChainId(),
  };
}