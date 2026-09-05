import type { ReactNode } from "react";
import { PublishKaButton } from "@/components/publish/publish-ka-button";

type FlowPublishKaProps = {
  dkgAvailable: boolean;
  dkgUnavailableReason?: string | null;
};

export function FlowPublishKa({
  dkgAvailable,
  dkgUnavailableReason,
}: FlowPublishKaProps) {
  return (
    <section
      id="publish-ka"
      className="relative scroll-mt-20 overflow-hidden border-b border-border py-16 sm:py-24"
    >
      <div
        aria-hidden
        className="absolute -left-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-surface/70 shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-between border-b border-border p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div>
              <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft text-xl text-accent shadow-[0_0_28px_rgba(56,189,248,0.1)]">
                ↥
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Flow 01
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                Publish a Knowledge Asset
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted">
                Transform a scientific PDF into structured, discoverable
                knowledge on the OriginTrail DKG—with its source preserved on
                IPFS.
              </p>
            </div>
            <div className="mt-10 flex flex-col gap-4">
              <p className="font-mono text-xs text-accent/80">
                PDF → IPFS → RDF → KA → UAL
              </p>
              <PublishKaButton
                label="Try it now →"
                variant="secondary"
                size="default"
                className="w-fit"
                disabled={!dkgAvailable}
                disabledReason={dkgUnavailableReason}
              />
            </div>
          </div>
          <div className="p-7 sm:p-10">
            <div className="mb-7 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">
                Publish Knowledge Asset Pipeline
              </p>
              <span className="rounded-full border border-border bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted text-nowrap">
                6 steps
              </span>
            </div>
            <ol className="flow-line flex list-none flex-col">
              <Step n={1} title="Connect on Base Sepolia">
                Wallet must be on chain id 84532 before sending a request.
              </Step>
              <Step n={2} title="Upload the scientific PDF">
                The file is pinned to IPFS, so the exact paper stays retrievable
                at a content hash that cannot silently change.
              </Step>
              <Step n={3} title="Extract structured knowledge">
                GROBID reads the document layout and Gemini turns it into clean
                publication metadata and semantic RDF.
              </Step>
              <Step n={4} title="Store the graph off-chain on the DKG">
                The rich, queryable RDF lives on OriginTrail nodes where anyone
                can search it with SPARQL — far too large and too detailed to sit
                on a blockchain.
              </Step>
              <Step n={5} title="Anchor it on-chain as a KA NFT">
                Base Sepolia holds only a cryptographic fingerprint of that graph
                and its owner. Why both? The chain proves authorship and
                integrity; the DKG keeps the knowledge usable.
              </Step>
              <Step n={6} title="Share the resulting UAL">
                One identifier resolves both halves, so any reader — or rating
                agent — can fetch the data and check it against the anchor.
              </Step>
            </ol>
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
      <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-[#102532] font-mono text-xs font-semibold text-accent shadow-[0_0_20px_rgba(56,189,248,0.08)] transition group-hover:border-accent/60 group-hover:bg-accent/15">
        {n}
      </span>
      <div className="pt-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1.5 text-sm leading-6 text-muted">{children}</p>
      </div>
    </li>
  );
}
