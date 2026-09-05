const phases = [
  {
    n: "01",
    title: "Machine rating",
    status: "Live",
    live: true,
    body: "An oracle reads the KA graph and writes a Phase-1 score plus rationale. That mint creates the R-KA. The scoring model is a first cut and will be calibrated over time.",
  },
  {
    n: "02",
    title: "Human review",
    status: "Next",
    live: false,
    body: "requestPhase2 opens only after Phase 1 is complete. Reviewers add a Phase-2 score to the same R-KA.",
  },
  {
    n: "03",
    title: "Wet-lab",
    status: "Next",
    live: false,
    body: "requestPhase3 opens only after Phase 2, when a wet-lab check is recommended. A Phase-3 score is written last.",
  },
] as const;

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="relative scroll-mt-20 overflow-hidden border-t border-border py-16 sm:py-24"
    >
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Roadmap
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
          Ratings deepen in sequence
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Today you can only request a machine rating. Later phases unlock one
          after another on the same Knowledge Asset. Each phase writes its own
          score; a composite score — blending the current phase with every
          completed one — will be the global rating for that KA.
        </p>
        <ol className="mt-12 grid list-none gap-4 md:grid-cols-3">
          {phases.map((phase) => (
            <li
              key={phase.n}
              className="flex flex-col rounded-[1.5rem] border border-border bg-surface/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.16)] backdrop-blur"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted">{phase.n}</span>
                <span
                  className={
                    phase.live
                      ? "rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary"
                      : "rounded-full border border-border bg-background/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted"
                  }
                >
                  {phase.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                {phase.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{phase.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-sm leading-6 text-muted">
          Tokenomics are not in this version. <code className="font-mono text-[0.8rem] text-foreground/80">requestPhase1</code>{" "}
          — and later <code className="font-mono text-[0.8rem] text-foreground/80">requestPhase2</code> /{" "}
          <code className="font-mono text-[0.8rem] text-foreground/80">requestPhase3</code> — take no ETH or TRAC
          from the caller. The oracle wallet still sponsors publishing the R-KA.
          A paid request model may come later.
        </p>
        <p className="mt-4 font-mono text-xs text-muted">
          One R-KA per target · updated in place after Phase 1 · composite
          weights not yet set
        </p>
      </div>
    </section>
  );
}
