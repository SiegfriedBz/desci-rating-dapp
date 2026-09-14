import { Suspense } from "react";
import { RateKaCatalog } from "@/components/rate-ka/rate-ka-catalog";
import { RateKaTableSkeleton } from "@/components/rate-ka/rate-ka-table-skeleton";
import { UalPasteField } from "@/components/rate-ka/ual-paste-field";

export const dynamic = "force-dynamic";

export default function RateKaPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="hero-grid pointer-events-none absolute inset-0"
          style={{ background: "var(--hero-glow)" }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-xl text-primary shadow-[0_0_28px_rgba(45,212,191,0.1)]">
            ◇
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_0_30px_rgba(45,212,191,0.08)]">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            Live on Base Sepolia
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Flow 02
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
            Rate existing{" "}
            <span className="bg-gradient-to-r from-primary via-cyan-300 to-accent bg-clip-text text-transparent">
              knowledge
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Request a Phase 1 rating for any Knowledge Asset. Your wallet calls{" "}
            <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[0.8rem] text-primary">
              requestPhase1
            </code>
            ; the oracle scores off-chain and fulfills on-chain.
          </p>
          <p className="mt-4 font-mono text-xs text-primary/80">
            UAL → SCORE → RATIONALE → R-KA
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          aria-hidden
          className="absolute -right-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-surface/70 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur sm:p-10">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Unrated on-chain
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
                Eligible Knowledge Assets
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Shows catalog KAs with on-chain phase Unrated and no pending
                request. In-flight oracle jobs are excluded so you do not
                double-request.
              </p>
            </div>

            <div className="space-y-8">
              <Suspense fallback={<RateKaTableSkeleton />}>
                <RateKaCatalog />
              </Suspense>
              <UalPasteField />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
