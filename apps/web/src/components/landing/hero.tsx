import { PublishKaButton } from "@/components/publish/publish-ka-button";
import { Button } from "@/components/ui/button";
import { DKG_UNAVAILABLE_USER_MESSAGE } from "@/lib/dkg-availability";

type HeroProps = {
  dkgAvailable: boolean;
  dkgUnavailableReason?: string | null;
};

export function Hero({ dkgAvailable, dkgUnavailableReason }: HeroProps) {
  const disabledReason =
    dkgUnavailableReason?.trim() || DKG_UNAVAILABLE_USER_MESSAGE;

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="hero-grid pointer-events-none absolute inset-0"
        style={{ background: "var(--hero-glow)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 -z-10 size-[34rem] -translate-x-1/2 rounded-full border border-primary/10"
      />
      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_0_30px_rgba(45,212,191,0.08)] sm:mb-7">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          Live on Base Sepolia
        </div>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-foreground sm:text-6xl sm:leading-[0.98] lg:text-7xl">
          Scientific knowledge,
          <span className="block bg-gradient-to-r from-primary via-cyan-300 to-accent bg-clip-text text-transparent">
            rated with proof.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted sm:mt-7 sm:text-lg sm:leading-7">
          Knowledge Assets on the DKG are provable and queryable, yet carry no
          quality signal — nothing tells a reader, or an agent traversing the
          graph, how much a source can be trusted.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/90 sm:mt-4 sm:text-lg sm:leading-7">
          VeriSci attaches independent ratings to any asset, without ever
          changing the original work.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 sm:mt-9">
          <PublishKaButton
            label="Publish KA"
            disabled={!dkgAvailable}
            disabledReason={disabledReason}
          />
          {dkgAvailable ? (
            <a
              href="#rate-ka"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface/70 px-6 text-sm font-semibold text-foreground backdrop-blur transition hover:border-accent/50 hover:bg-surface-elevated"
            >
              Rate existing KA
            </a>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled
              title={disabledReason}
              aria-disabled
              className="rounded-full"
            >
              Rate existing KA
            </Button>
          )}
        </div>
        <p className="mt-8 max-w-md font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-muted/80 sm:mt-10 sm:max-w-none sm:text-xs sm:tracking-[0.18em]">
          OriginTrail DKG V10{" "}
          <span className="mx-1.5 text-primary/50 sm:mx-2">◆</span> Verifiable
          provenance <span className="mx-1.5 text-primary/50 sm:mx-2">◆</span>{" "}
          Permissionless requests
        </p>
      </div>
    </section>
  );
}
