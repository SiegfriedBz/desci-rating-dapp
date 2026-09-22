import { env } from "@desci/env";
import {
  extractPublicationMetadata,
  extractTeiFromPdf,
  mintPublicationToDkg,
  storePublicationToDkg,
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

    // Stable across attempts of the store step, so a store that landed but lost
    // its response is recognised as already stored rather than duplicated. A
    // new submission is a new event, so a deliberate republish still mints.
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

    // Two steps rather than one, so each daemon call gets its own maxDuration
    // window and its own retries. A retry of the mint replays this step's saved
    // result instead of storing the quads a second time.
    const stored = await step.run("dkg-store-target-ka", () =>
      storePublicationToDkg({
        meta,
        pdfCid,
        contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
        name: kaName,
      })
    );

    const result = await step.run("dkg-mint-target-ka", () =>
      mintPublicationToDkg({
        contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
        name: stored.name,
        subjectUri: stored.subjectUri,
        pdfCid,
      })
    );

    return { ual: result.ual, pdfCid: result.pdfCid };
  }
);
