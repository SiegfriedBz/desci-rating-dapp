import { createDkgClient } from "./index.js";

function requireUal(): string {
  const ual = process.argv[2] ?? process.env["DKG_UAL"];
  if (!ual?.trim()) {
    throw new Error(
      "Missing UAL. Pass as argv or set DKG_UAL (e.g. from dkg:publish-sample output)."
    );
  }
  return ual.trim();
}

function requireContextGraphId(): string {
  const contextGraphId =
    process.argv[3] ?? process.env["DKG_CONTEXT_GRAPH_ID"];
  if (!contextGraphId?.trim()) {
    throw new Error(
      "Missing context graph id. Pass as second argv or set DKG_CONTEXT_GRAPH_ID."
    );
  }
  return contextGraphId.trim();
}

function optionalSubjectUri(): string | undefined {
  const subject = process.argv[4] ?? process.env["DKG_SUBJECT_URI"];
  const trimmed = subject?.trim();
  return trimmed || undefined;
}

async function main(): Promise<void> {
  const ual = requireUal();
  const contextGraphId = requireContextGraphId();
  const subjectUri = optionalSubjectUri();
  const targetIri = subjectUri ?? ual;
  const client = await createDkgClient();

  console.log(`API      : ${client.getApiBaseUrl()}`);
  console.log(`Graph    : ${contextGraphId}`);
  console.log(`UAL      : ${ual}`);
  console.log(`TargetIRI: ${targetIri}${subjectUri ? "" : " (from DKG_UAL)"}\n`);

  console.log("--- Action A: fetchTargetAsset ---");
  const { bindings: assetBindings } = await client.fetchTargetAsset(
    targetIri,
    contextGraphId
  );

  if (assetBindings.length === 0) {
    console.log("No triples found for target IRI.\n");
    if (!subjectUri) {
      console.warn(
        "Hint: sample Knowledge Assets use local subjects like urn:uuid:desci-sample-1, not the on-chain UAL."
      );
      console.warn(
        "Set DKG_SUBJECT_URI=urn:uuid:desci-sample-1 (or pass as argv[4]) and retry.\n"
      );
    }
  } else {
    console.log(`Found ${assetBindings.length} property binding(s):\n`);
    for (const { p, o } of assetBindings) {
      console.log(`  ${p}`);
      console.log(`    → ${o}`);
    }
    console.log();
  }

  console.log("--- Action B: fetchRatingsForAsset ---");
  const { bindings: ratingBindings } = await client.fetchRatingsForAsset(
    ual,
    contextGraphId
  );

  if (ratingBindings.length === 0) {
    console.log(
      "No ratings found for this UAL (expected until rating Knowledge Assets are published).\n"
    );
  } else {
    console.log(`Found ${ratingBindings.length} rating(s):\n`);
    for (const rating of ratingBindings) {
      console.log(`  subject : ${rating.ratingSubject}`);
      console.log(`  value   : ${rating.ratingValue}`);
      console.log(`  author  : ${rating.author}`);
      console.log();
    }
  }

  await client.stop();
}

main().catch((err: unknown) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
