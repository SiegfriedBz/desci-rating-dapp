
import Link from "next/link";
import { WalletControls } from "./wallet-controls";

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
