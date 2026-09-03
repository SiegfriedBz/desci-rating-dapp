import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

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

export type Phase1RequestedData = z.infer<typeof phase1RequestedSchema>;
export type Phase1FulfilledData = z.infer<typeof phase1FulfilledSchema>;
export type RequestCancelledData = z.infer<typeof requestCancelledSchema>;
export type OracleUpdatedData = z.infer<typeof oracleUpdatedSchema>;

export const inngest = new Inngest({
  id: "desci-rating-dapp",
  schemas: new EventSchemas().fromSchema({
    "RatingController/phase1.requested": phase1RequestedSchema,
    "RatingController/phase1.fulfilled": phase1FulfilledSchema,
    "RatingController/request.cancelled": requestCancelledSchema,
    "RatingController/oracle.updated": oracleUpdatedSchema,
  }),
});
