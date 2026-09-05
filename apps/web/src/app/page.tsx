import { getRatingControllerAddress } from "@desci/contracts";
import { env } from "@desci/env";
import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";
import { FlowPublishKa } from "@/components/flow-publish-ka";
import { FlowRateKa } from "@/components/flow-rate-ka";
import { Hero } from "@/components/hero";
import { Roadmap } from "@/components/roadmap";
import { SiteHeader } from "@/components/site-header";

const ratingController = getRatingControllerAddress(BASE_SEPOLIA_CHAIN_ID);

export default function Home() {
  const portfolioUrl = env.NEXT_PUBLIC_CONTACT_PORTFOLIO_URL;
  const linkedInUrl = env.NEXT_PUBLIC_CONTACT_LINKEDIN_URL;
  const showContact = Boolean(portfolioUrl || linkedInUrl);
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <FlowPublishKa />
        <FlowRateKa />
        <Roadmap />
      </main>
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 sm:px-6">
          <a
            href={`https://sepolia.basescan.org/address/${ratingController}#code`}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2 transition hover:border-primary/40 hover:bg-surface-elevated"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
            />
            <span className="text-xs font-medium text-muted transition group-hover:text-foreground">
              RatingController
            </span>
            <span className="font-mono text-xs text-foreground/80">
              {`${ratingController.slice(0, 6)}…${ratingController.slice(-4)}`}
            </span>
            <span aria-hidden className="text-xs text-muted">
              ↗
            </span>
          </a>
          {showContact ? (
            <nav
              aria-label="Contact"
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Contact
              </span>
              {portfolioUrl ? (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted transition hover:text-foreground"
                >
                  Portfolio
                </a>
              ) : null}
              {linkedInUrl ? (
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted transition hover:text-foreground"
                >
                  LinkedIn
                </a>
              ) : null}
            </nav>
          ) : null}
          <p className="text-center font-mono text-xs uppercase tracking-[0.18em] text-muted">
            VeriSci · Base Sepolia · OriginTrail DKG V10
          </p>
        </div>
      </footer>
    </>
  );
}
