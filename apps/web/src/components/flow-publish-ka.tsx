import type { ReactNode } from "react";

export function FlowPublishKa() {
  return (
    <section
      id="publish-ka"
      className="scroll-mt-20 border-b border-border bg-surface/40"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:py-20">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
            Flow 1
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Publish KA
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-muted">
            Turn a scientific PDF into a Target Knowledge Asset on OriginTrail
            DKG V10. The original paper is pinned to IPFS; metadata and structure
            are extracted, then published as RDF plus an on-chain NFT pointer.
          </p>
          <button
            type="button"
            disabled
            title="Coming in a later PR"
            className="mt-2 w-fit cursor-not-allowed rounded-md border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-muted opacity-70"
          >
            Upload PDF — coming next
          </button>
        </div>
        <ol className="flex list-none flex-col gap-4 rounded-lg border border-border bg-background/60 p-6">
          <Step n={1} title="Pin PDF">
            Content-addressed <code className="font-mono text-sm">ipfs://</code>{" "}
            CID via Pinata.
          </Step>
          <Step n={2} title="Extract">
            GROBID → TEI-XML, then Gemini structured publication metadata.
          </Step>
          <Step n={3} title="Mint Target KA">
            DKG daemon stores RDF off-chain and mints the KA NFT — returns a UAL.
          </Step>
          <p className="text-sm text-muted">
            Today this runs as a CLI job. The web app will enqueue an Inngest
            worker so GROBID + Gemini + DKG can exceed a single HTTP timeout.
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
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
        {n}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}
