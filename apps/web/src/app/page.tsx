import { Suspense } from "react";
import { FlowPublishKa } from "@/components/landing/flow-publish-ka";
import { FlowRateKa } from "@/components/landing/flow-rate-ka";
import { Hero } from "@/components/landing/hero";
import { KaCatalog } from "@/components/ka-catalog/ka-catalog";
import { KaTableSkeleton } from "@/components/ka-catalog/ka-table-skeleton";
import { Roadmap } from "@/components/landing/roadmap";
import { SiteHeader } from "@/components/header/site-header";
import Footer from "@/components/footer/footer";
import { getDkgAvailability } from "@/lib/dkg-availability";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dkg = await getDkgAvailability();

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero
          dkgAvailable={dkg.available}
          dkgUnavailableReason={dkg.reason}
        />
        <section
          id="catalog"
          className="relative scroll-mt-20 border-t border-border py-16 sm:py-24"
        >
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Catalog
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
              Knowledge Assets on the DKG
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Publication KAs in the system context graph, with scores
              and R-KA identifiers when they exist on-chain in the DKG.
            </p>
            <div className="mt-10">
              <Suspense fallback={<KaTableSkeleton />}>
                <KaCatalog
                  dkgAvailable={dkg.available}
                  dkgUnavailableReason={dkg.reason}
                />
              </Suspense>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="relative scroll-mt-20 border-t border-border pt-16 sm:pt-24"
        >
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
              Two paths on VeriSci
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Publish a new Knowledge Asset from a paper, or request a
              rating on one that already lives on the DKG.
            </p>
          </div>
        </section>
        <FlowPublishKa
          dkgAvailable={dkg.available}
          dkgUnavailableReason={dkg.reason}
        />
        <FlowRateKa />
        <Roadmap />
      </main>
      <Footer />
    </>
  );
}
