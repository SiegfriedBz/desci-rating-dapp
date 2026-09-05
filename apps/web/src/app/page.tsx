import { FlowPublishKa } from "@/components/flow-publish-ka";
import { FlowRateKa } from "@/components/flow-rate-ka";
import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <FlowPublishKa />
        <FlowRateKa />
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        VeriSci · Base Sepolia · OriginTrail DKG V10
      </footer>
    </>
  );
}
