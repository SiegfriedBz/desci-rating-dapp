"use client";

import { expectedChainId, projectId } from "@/lib/wagmi";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from "@reown/appkit/react";
import { baseSepolia } from "@reown/appkit/networks";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]"
          />
          <span className="font-display text-lg font-medium tracking-[-0.02em] text-foreground">
            VeriSci
          </span>
        </Link>
        <WalletControls />
      </div>
    </header>
  );
}

function WalletControls() {
  if (!projectId) {
    return (
      <p className="max-w-[14rem] text-right text-xs text-muted sm:max-w-none sm:text-sm">
        Wallet not configured — set{" "}
        <code className="font-mono text-[0.8em] text-foreground/80">
          NEXT_PUBLIC_REOWN_PROJECT_ID
        </code>
      </p>
    );
  }

  return <ConnectedWalletControls />;
}

function ConnectedWalletControls() {
  const { open } = useAppKit();
  const { isConnected, address } = useAppKitAccount();
  const { chainId, switchNetwork } = useAppKitNetwork();

  const onWrongNetwork =
    isConnected && chainId !== undefined && Number(chainId) !== expectedChainId;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {onWrongNetwork ? (
        <button
          type="button"
          onClick={() => {
            void switchNetwork(baseSepolia);
          }}
          className="rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-warning-foreground transition hover:brightness-110 sm:text-sm"
        >
          Switch to Base Sepolia
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => open()}
        className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-surface sm:text-sm"
      >
        {isConnected && address
          ? `${address.slice(0, 6)}…${address.slice(-4)}`
          : "Connect wallet"}
      </button>
    </div>
  );
}
