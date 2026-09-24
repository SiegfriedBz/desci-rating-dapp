import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

/** Canonical Inngest event names — use these instead of raw strings. */
export enum InngestEvent {
  Phase1Requested = "RatingController/phase1.requested",
  Phase1Fulfilled = "RatingController/phase1.fulfilled",
  RequestCancelled = "RatingController/request.cancelled",
  OracleUpdated = "RatingController/oracle.updated",
  PdfSubmitted = "pdf.submitted",
  PdfMintRequested = "pdf.mint-requested",
}

/** Hex string for addresses / bytes32 (validated at runtime). */
const hexString = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/, "expected 0x-prefixed hex");

const commonLogFields = {
  chainId: z.number().int(),
  blockNumber: z.string(),
  transactionHash: hexString,
  logIndex: z.number().int(),
};

export const phase1RequestedSchema = z.object({
  ...commonLogFields,
  requestId: hexString,
  targetUal: z.string().min(1),
  requester: hexString,
});

export const phase1FulfilledSchema = z.object({
  ...commonLogFields,
  requestId: hexString,
  targetUal: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rKaUal: z.string().min(1),
});

export const requestCancelledSchema = z.object({
  ...commonLogFields,
  requestId: hexString,
  targetUal: z.string().min(1),
});

export const oracleUpdatedSchema = z.object({
  ...commonLogFields,
  newAgent: hexString,
});

export const pdfSubmittedSchema = z.object({
  pdfCid: z.string().min(1),
  filename: z.string().min(1),
});

/**
 * Mint the Target KA a publish already stored but never anchored.
 *
 * Carries the *original* `pdf.submitted` event id and nothing else, because
 * that id is what the asset name was derived from: re-sending `pdf.submitted`
 * would take a fresh id, derive a fresh name, and publish a second Knowledge
 * Asset for a paper the daemon already holds.
 */
export const pdfMintRequestedSchema = z.object({
  publishEventId: z.string().min(1),
});

export type Phase1RequestedData = z.infer<typeof phase1RequestedSchema>;
export type Phase1FulfilledData = z.infer<typeof phase1FulfilledSchema>;
export type RequestCancelledData = z.infer<typeof requestCancelledSchema>;
export type OracleUpdatedData = z.infer<typeof oracleUpdatedSchema>;
export type PdfSubmittedData = z.infer<typeof pdfSubmittedSchema>;
export type PdfMintRequestedData = z.infer<typeof pdfMintRequestedSchema>;

export const inngest = new Inngest({
  id: "desci-rating-dapp",
  schemas: new EventSchemas().fromSchema({
    [InngestEvent.Phase1Requested]: phase1RequestedSchema,
    [InngestEvent.Phase1Fulfilled]: phase1FulfilledSchema,
    [InngestEvent.RequestCancelled]: requestCancelledSchema,
    [InngestEvent.OracleUpdated]: oracleUpdatedSchema,
    [InngestEvent.PdfSubmitted]: pdfSubmittedSchema,
    [InngestEvent.PdfMintRequested]: pdfMintRequestedSchema,
  }),
});
