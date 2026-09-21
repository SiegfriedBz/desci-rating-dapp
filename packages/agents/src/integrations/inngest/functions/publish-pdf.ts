import { env } from "@desci/env";
import {
  extractPublicationMetadata,
  extractTeiFromPdf,
  publishPublicationToDkg,
} from "../../../agents/pdf-to-ka/index.js";
import { fetchPdfByCid } from "../../../ipfs/index.js";
import { InngestEvent, inngest } from "../client.js";

export const publishPdfFunction = inngest.createFunction(
  {
    id: "publish-pdf",
    retries: 2,
    // Room for a retry of the slowest stage; each stage is memoized, so a
    // retry resumes rather than restarting the pipeline.
    timeouts: { finish: "20m" },
  },
  { event: InngestEvent.PdfSubmitted },
  async ({ event, runId, step }) => {
    const { pdfCid, filename } = event.data;

    // Stable across attempts of the publish step. An already-minted name
    // returns its UAL instead of minting again, so a retry that follows
    // a lost response reuses the first asset rather than duplicating it. A new
    // submission is a new event, so a deliberate republish still mints.
    const kaName = `desci-pub-${event.id ?? runId}`;

    // The PDF is fetched here rather than in its own step: step output is
    // persisted and replayed on every later request, and base64 bytes are far
    // more expensive to carry than the TEI slices this returns.
    const tei = await step.run("grobid-extract", async () => {
      const pdf = await fetchPdfByCid(pdfCid);
      return extractTeiFromPdf({ pdf, filename });
    });

    const meta = await step.run("gemini-structure", () =>
      extractPublicationMetadata(tei)
    );

    const result = await step.run("dkg-publish", () =>
      publishPublicationToDkg({
        meta,
        pdfCid,
        contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
        name: kaName,
      })
    );

    return { ual: result.ual, pdfCid: result.pdfCid };
  }
);
