"use client";

import { useCallback, useState } from "react";
import {
  getRatingControllerAddress,
  ratingControllerAbi,
} from "@desci/contracts";
import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Hex } from "viem";
import { BaseError, ContractFunctionRevertedError } from "viem";

const ratingController = getRatingControllerAddress(BASE_SEPOLIA_CHAIN_ID);

export type RequestPhase1Status =
  | "idle"
  | "simulating"
  | "awaiting_signature"
  | "confirming"
  | "success"
  | "error";

function friendlyRequestError(error: unknown): string {
  if (error instanceof BaseError) {
    const msg = `${error.shortMessage} ${error.message}`.toLowerCase();
    if (
      msg.includes("user rejected") ||
      msg.includes("user denied") ||
      msg.includes("rejected the request")
    ) {
      return "Transaction rejected in wallet";
    }

    const reverted = error.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "AlreadyPending") {
        return "A rating request is already in progress for this KA";
      }
      if (name === "InvalidPhase") {
        return "This KA is not eligible for a Phase 1 request";
      }
      if (name === "EmptyUal") {
        return "UAL cannot be empty";
      }
      if (name) {
        return `Contract rejected the request (${name})`;
      }
    }
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to request Phase 1 rating";
}

/**
 * Wallet-signed requestPhase1: simulateContract → writeContract → wait for receipt.
 * Must be signed by the user so msg.sender is the requester.
 */
export function useRequestPhase1() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<RequestPhase1Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [lastUal, setLastUal] = useState<string | null>(null);

  const {
    isLoading: isConfirming,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const effectiveStatus: RequestPhase1Status =
    status === "error"
      ? "error"
      : isReceiptError
        ? "error"
        : status === "awaiting_signature" && txHash
          ? isConfirming
            ? "confirming"
            : isReceiptSuccess
              ? "success"
              : "awaiting_signature"
          : status === "confirming" && isReceiptSuccess
            ? "success"
            : status;

  const effectiveError =
    error ??
    (isReceiptError
      ? friendlyRequestError(receiptError ?? new Error("Transaction failed on-chain"))
      : null);

  const request = useCallback(
    async (targetUal: string) => {
      const trimmed = targetUal.trim();
      setError(null);
      setTxHash(undefined);
      setLastUal(trimmed);

      if (!isConnected || !address) {
        setStatus("error");
        setError("Connect your wallet to request a rating");
        return;
      }
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        setStatus("error");
        setError("Switch to Base Sepolia before requesting a rating");
        return;
      }
      if (!publicClient || !walletClient) {
        setStatus("error");
        setError("Wallet client is not ready");
        return;
      }
      if (!trimmed) {
        setStatus("error");
        setError("UAL is required");
        return;
      }

      try {
        setStatus("simulating");
        const { request: simulated } = await publicClient.simulateContract({
          address: ratingController,
          abi: ratingControllerAbi,
          functionName: "requestPhase1",
          args: [trimmed],
          account: address,
        });

        setStatus("awaiting_signature");
        const hash = await walletClient.writeContract(simulated);
        setTxHash(hash);
        setStatus("confirming");
      } catch (err) {
        setStatus("error");
        setError(friendlyRequestError(err));
      }
    },
    [address, chainId, isConnected, publicClient, walletClient]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(undefined);
    setLastUal(null);
  }, []);

  return {
    request,
    reset,
    status: effectiveStatus,
    error: effectiveError,
    txHash,
    lastUal,
    isConnected,
    isBusy:
      effectiveStatus === "simulating" ||
      effectiveStatus === "awaiting_signature" ||
      effectiveStatus === "confirming",
  };
}
