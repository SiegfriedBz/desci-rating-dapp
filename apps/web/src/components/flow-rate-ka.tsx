import type { ReactNode } from "react";

export function FlowRateKa() {
  return (
    <section
      id="rate-ka"
      className="relative scroll-mt-20 overflow-hidden py-16 sm:py-24"
    >
      <div
        aria-hidden
        className="absolute -right-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-surface/70 shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur lg:grid-cols-[1.2fr_0.8fr]">
          <div className="order-2 p-7 sm:p-10 lg:order-1">
            <div className="mb-7 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">
                Rate Existing KA Pipeline
              </p>
              <span className="rounded-full border border-border bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                5 steps
              </span>
            </div>
            <ol className="flow-line flex list-none flex-col">
              <Step n={1} title="Connect on Base Sepolia">
                Wallet must be on chain id 84532 before sending a request.
              </Step>
              <Step n={2} title="Request a rating for a target UAL">
                <Code>requestPhase1(targetUal)</Code> records on-chain who asked
                for a review and which asset it concerns.
              </Step>
              <Step n={3} title="An oracle scores the asset off-chain">
                It reads the target&apos;s graph from the DKG and produces a
                score with a written rationale. The asset you point at is left
                untouched.
              </Step>
              <Step n={4} title="The verdict becomes its own Rating KA">
                A second Knowledge Asset — RDF on the DKG plus its own NFT —
                links back to the target with <Code>schema:about</Code>. Ratings
                attach by reference, so the paper keeps one canonical version
                while opinions accumulate around it.
              </Step>
              <Step n={5} title="fulfillPhase1 closes the loop">
                The contract stores the score and the R-KA UAL against your
                request, giving readers a single on-chain place to see the
                verdict and follow it to the full reasoning.
              </Step>
            </ol>
          </div>
          <div className="order-1 flex flex-col justify-between border-b border-border p-7 sm:p-10 lg:order-2 lg:border-b-0 lg:border-l">
            <div>
              <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-xl text-primary shadow-[0_0_28px_rgba(45,212,191,0.1)]">
                ◇
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Flow 02
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                Rate existing knowledge
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted">
                Request a transparent machine rating for any Knowledge Asset.
                The result is independently published and linked back to the
                original.
              </p>
            </div>
            <p className="mt-10 font-mono text-xs text-primary/80">
              UAL → SCORE → RATIONALE → R-KA
            </p>
          </div>
        </div>
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
    <li className="group relative flex gap-4 pb-7 last:pb-0">
      <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-[#102923] font-mono text-xs font-semibold text-primary shadow-[0_0_20px_rgba(45,212,191,0.08)] transition group-hover:border-primary/60 group-hover:bg-primary/15">
        {n}
      </span>
      <div className="pt-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1.5 text-sm leading-6 text-muted">{children}</p>
      </div>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.8rem] text-primary">
      {children}
    </code>
  );
}
