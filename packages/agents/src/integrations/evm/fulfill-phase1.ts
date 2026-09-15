import {
  getRatingControllerAddress,
  ratingControllerAbi,
} from "@desci/contracts";
import { env } from "@desci/env";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

/** Solidity enum Phase { Unrated=0, Phase1Completed=1, ... } */
export const PHASE_UNRATED = 0;
export const PHASE_PHASE1_COMPLETED = 1;

export type FulfillPhase1Result =
  | { status: "already_fulfilled"; txHash: null }
  | { status: "fulfilled"; txHash: Hex };

/**
 * Submit RatingController.fulfillPhase1 with idempotency guard via getRatingByUal.
 */
export async function fulfillPhase1OnChain(input: {
  targetUal: string;
  score: number;
  rKaUal: string;
  chainId?: number;
}): Promise<FulfillPhase1Result> {
  const chainId = input.chainId ?? baseSepolia.id;
  const address = getRatingControllerAddress(chainId);
  const account = privateKeyToAccount(env.ORACLE_AGENT_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(env.BASE_SEPOLIA_RPC_URL),
  });

  const record = await publicClient.readContract({
    address,
    abi: ratingControllerAbi,
    functionName: "getRatingByUal",
    args: [input.targetUal],
  });

  const phase = Number(record.phase);
  const isPending = Boolean(record.isPending);

  if (phase === PHASE_PHASE1_COMPLETED) {
    console.warn(
      `[fulfillPhase1] Already Phase1Completed for ${input.targetUal}; skipping`
    );
    return { status: "already_fulfilled", txHash: null };
  }

  if (!isPending && phase === PHASE_UNRATED) {
    throw new Error(
      `No pending Phase-1 request for ${input.targetUal} (cancelled or never requested)`
    );
  }

  if (!isPending) {
    throw new Error(
      `Unexpected rating state for ${input.targetUal}: phase=${phase}, isPending=${isPending}`
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(input.score)));

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(env.BASE_SEPOLIA_RPC_URL),
  });

  const hash = await walletClient.writeContract({
    address,
    abi: ratingControllerAbi,
    functionName: "fulfillPhase1",
    args: [input.targetUal, score, input.rKaUal],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return { status: "fulfilled", txHash: hash };
}
