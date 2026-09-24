import { createDkgClient } from "@desci/dkg-client";
import { env } from "@desci/env";
import { DKG_MINT_TARGET_KA_STEP } from "@desci/shared";
import { InngestEvent, inngest } from "../client.js";
import {
  DKG_WRITE_FINISH_TIMEOUT,
  DKG_WRITE_RETRIES,
  withQuorumBackoff,
} from "../dkg-write-policy.js";
import { targetKaName } from "./publish-pdf.js";

/**
 * Mint a Target KA that `publish-pdf` stored and never anchored.
 *
 * A publish can end with the quads on the daemon and no NFT: the store step
 * succeeds and the mint exhausts its attempts, which is what a run of DKG
 * write-quorum failures produces. Before this function the only way out was
 * re-running the whole pipeline from the Inngest dashboard, and the only way a
 * *user* had was to upload the paper again — which derives a new name and
 * mints a second Knowledge Asset for a paper the graph already holds.
 *
 * There is no store step here on purpose. The asset exists; re-storing it is
 * the one thing that could duplicate it. `mintAsset` reads the asset's state
 * first and returns the existing UAL when the name turns out to be minted
 * already, so sending this twice converges rather than failing.
 */
export const publishPdfMintFunction = inngest.createFunction(
  {
    id: "publish-pdf-mint",
    // Same budget as the publish it is finishing: this runs the half that was
    // slow and flaky in the first place, with none of the cheap stages in
    // front of it to absorb any of the time.
    retries: DKG_WRITE_RETRIES,
    timeouts: { finish: DKG_WRITE_FINISH_TIMEOUT },
    // One mint at a time per asset, so a user pressing the button twice and an
    // operator retrying from the dashboard cannot drive `vm/publish` twice on
    // the same name — which is an error rather than a no-op.
    concurrency: [{ key: "event.data.publishEventId", limit: 1 }],
  },
  { event: InngestEvent.PdfMintRequested },
  async ({ event, step }) => {
    const { publishEventId } = event.data;
    const contextGraphId = env.DKG_CONTEXT_GRAPH_ID;
    const name = targetKaName(publishEventId);

    const minted = await step.run(DKG_MINT_TARGET_KA_STEP, async () => {
      const client = await createDkgClient();
      try {
        return await client.mintAsset({ contextGraphId, name });
      } catch (err) {
        throw withQuorumBackoff(err);
      } finally {
        await client.stop();
      }
    });

    // Shaped like `publish-pdf`'s own return so the modal's poll reads a UAL
    // out of either run without having to know which one it is watching.
    return { ual: minted.ual, publishEventId, name };
  }
);
