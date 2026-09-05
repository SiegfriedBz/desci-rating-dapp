import { access, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { dkgContextGraphIdOrDefault, env } from "@desci/env";
import { runPdfToKaAgent } from "../src/agents/pdf-to-ka/index.js";
import { pinPdfToIpfs } from "../src/ipfs/index.js";

function runMain(main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    console.error("Fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

function argOrEnv(
  argvIndex: number,
  envValue: string | undefined
): string | undefined {
  const fromArg = process.argv[argvIndex]?.trim();
  if (fromArg) {
    return fromArg;
  }
  return envValue || undefined;
}

async function main(): Promise<void> {
  const pdfPath = argOrEnv(2, env.DKG_PDF_PATH);
  if (!pdfPath) {
    throw new Error(
      "Missing PDF path. Usage: pnpm dkg:publish-pdf ./paper.pdf  (or set DKG_PDF_PATH)"
    );
  }

  const absolutePath = resolve(pdfPath);
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`PDF not found: ${absolutePath}`);
  }

  const contextGraphId = dkgContextGraphIdOrDefault;
  const kaName = env.DKG_KA_NAME || undefined;
  const filename = basename(absolutePath) || "paper.pdf";

  console.log(`PDF  : ${absolutePath}`);
  console.log(`Graph: ${contextGraphId}`);
  if (kaName) {
    console.log(`KA   : ${kaName}`);
  }
  console.log("");

  const pdf = new Uint8Array(await readFile(absolutePath));
  const pinned = await pinPdfToIpfs(pdf, filename);
  console.log(`Pinned: ${pinned.ipfsUri}`);

  const result = await runPdfToKaAgent({
    pdf,
    pdfCid: pinned.cid,
    contextGraphId,
    name: kaName,
    filename,
  });

  console.log("Publication Knowledge Asset minted.");
  console.log(`UAL: ${result.ual}`);
  console.log("\nIdentifiers:");
  console.log(`  DKG_KA_NAME=${result.name}`);
  console.log(`  DKG_UAL=${result.ual}`);
  console.log(`  DKG_SUBJECT_URI=${result.subjectUri}`);
  console.log(`  DKG_CONTEXT_GRAPH_ID=${contextGraphId}`);
  console.log(`  PDF_CID=${result.pdfCid}`);
  console.log(`  PDF_IPFS=${result.pdfIpfsUri}`);
}

runMain(main);
