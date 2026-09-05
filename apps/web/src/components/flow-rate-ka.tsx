import type { ReactNode } from "react";

export function FlowRateKa() {
  return (
    <section id="rate-ka" className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:py-20">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Flow 2
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Rate KA
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-muted">
            Request a Phase-1 machine rating on any Target KA UAL. Your wallet
            calls <code className="font-mono text-sm">requestPhase1</code> on{" "}
            <code className="font-mono text-sm">RatingController</code>. The
            existing oracle scores the asset, mints a separate Rating KA (R-KA),
            and fulfills on-chain. You do not mint the R-KA yourself.
          </p>
          <button
            type="button"
            disabled
            title="Coming in a later PR"
            className="mt-2 w-fit cursor-not-allowed rounded-md border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-muted opacity-70"
          >
            Open rate page — coming next
          </button>
        </div>
        <ol className="flex list-none flex-col gap-4 rounded-lg border border-border bg-surface/50 p-6">
          <Step n={1} title="Connect on Base Sepolia">
            Wallet must be on chain id 84532 before sending a request.
          </Step>
          <Step n={2} title="requestPhase1(targetUal)">
            Emits <code className="font-mono text-sm">Phase1Requested</code> —
            Alchemy Notify → Inngest worker.
          </Step>
          <Step n={3} title="Oracle fulfills">
            Score + rationale → publish R-KA (
            <code className="font-mono text-sm">schema:about</code> the target)
            → <code className="font-mono text-sm">fulfillPhase1</code>.
          </Step>
          <p className="text-sm text-muted">
            The original Target KA is never modified. Later UI will poll{" "}
            <code className="font-mono text-sm">getRatingByUal</code> for status,
            score, and R-KA UAL.
          </p>
        </ol>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}
