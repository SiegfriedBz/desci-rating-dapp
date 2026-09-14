"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRequestPhase1 } from "./use-request-phase1";

type RequestPhase1ButtonProps = {
  targetUal: string;
  onSuccess?: (ual: string) => void;
  className?: string;
};

export function RequestPhase1Button({
  targetUal,
  onSuccess,
  className,
}: RequestPhase1ButtonProps) {
  const { request, status, error, isBusy, isConnected, lastUal } =
    useRequestPhase1();

  const isThisRow = lastUal === targetUal.trim();
  const showBusy = isThisRow && isBusy;
  const showError = isThisRow && status === "error" && error;
  const showSuccess = isThisRow && status === "success";

  useEffect(() => {
    if (showSuccess && lastUal) {
      onSuccess?.(lastUal);
    }
  }, [showSuccess, lastUal, onSuccess]);

  const title = !isConnected
    ? "Connect your wallet to request a rating"
    : showError
      ? error
      : undefined;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        size="sm"
        disabled={!isConnected || isBusy}
        title={title}
        aria-disabled={!isConnected || isBusy}
        className={cn(
          "rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary shadow-none hover:border-primary/70 hover:bg-primary/20 hover:text-primary",
          (!isConnected || isBusy) && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={() => {
          void request(targetUal);
        }}
      >
        {showBusy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {status === "simulating"
              ? "Simulating…"
              : status === "awaiting_signature"
                ? "Sign in wallet…"
                : "Confirming…"}
          </>
        ) : showSuccess ? (
          "Submitted"
        ) : (
          "Request Phase 1"
        )}
      </Button>
      {showError ? (
        <p className="max-w-[16rem] text-xs leading-5 text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {showSuccess ? (
        <p className="max-w-[16rem] text-xs leading-5 text-primary" role="status">
          On-chain request confirmed. Waiting for oracle…
        </p>
      ) : null}
    </div>
  );
}
