import { env } from "@desci/env";
import { runPdfToKaAgent } from "../../../agents/pdf-to-ka/index.js";
import { fetchPdfByCid } from "../../../ipfs/index.js";
import { InngestEvent, inngest } from "../client.js";

export const publishPdfFunction = inngest.createFunction(
  {
    id: "publish-pdf",
    retries: 2,
    timeouts: { finish: "10m" },
  },
  { event: InngestEvent.PdfSubmitted },
  async ({ event, step }) => {
    const { pdfCid, filename } = event.data;

    const pdf = await step.run("fetch-pdf", async () => {
      const bytes = await fetchPdfByCid(pdfCid);
      // Inngest step outputs must be JSON-serializable; base64 round-trip.
      return Buffer.from(bytes).toString("base64");
    });

    const result = await step.run("run-pdf-to-ka-agent", async () => {
      const pdfBytes = new Uint8Array(Buffer.from(pdf, "base64"));
      return runPdfToKaAgent({
        pdf: pdfBytes,
        pdfCid,
        contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
        filename,
      });
    });

    return { ual: result.ual, pdfCid: result.pdfCid };
  }
);
