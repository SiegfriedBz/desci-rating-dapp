export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--hero-glow)" }}
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Base Sepolia · OriginTrail DKG
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          VeriSci
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Attach Phase-1 ratings to scientific Knowledge Assets without changing
          them — independent Rating KAs on the DKG, anchored on Base Sepolia.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#publish-ka"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Publish KA
          </a>
          <a
            href="#rate-ka"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-accent/40 hover:bg-surface-elevated"
          >
            Rate KA
          </a>
        </div>
        <p className="text-sm text-muted">
          Testnet MVP — scoring heuristics are intentionally rough. Flows below
          are explained now; upload and on-chain request land in follow-up PRs.
        </p>
      </div>
    </section>
  );
}
