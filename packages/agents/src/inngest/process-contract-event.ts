import type { inngest as InngestClient } from "./client.js";
import type {
  OracleUpdatedData,
  Phase1FulfilledData,
  Phase1RequestedData,
  RequestCancelledData,
} from "./client.js";

type DecodedContractEvent = {
  eventName: string;
  args: Record<string, unknown>;
};

export type ProcessRatingControllerEventInput = {
  chainId: number;
  decoded: DecodedContractEvent;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: `0x${string}`;
  inngest: typeof InngestClient;
};

function asHex(value: unknown, field: string): `0x${string}` {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) {
    return value as `0x${string}`;
  }
  if (typeof value === "bigint") {
    return `0x${value.toString(16).padStart(64, "0")}` as `0x${string}`;
  }
  throw new Error(`Expected hex for ${field}, got ${typeof value}`);
}

function asString(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(`Expected non-empty string for ${field}`);
}

function asScore(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  throw new Error(`Expected integer score, got ${typeof value}`);
}

/**
 * Map a decoded RatingController log to a typed Inngest event.
 */
export async function processRatingControllerEvent(
  input: ProcessRatingControllerEventInput
): Promise<void> {
  const { chainId, decoded, blockNumber, logIndex, transactionHash, inngest } =
    input;

  const common = {
    chainId,
    blockNumber: blockNumber.toString(),
    transactionHash,
    logIndex,
  };

  switch (decoded.eventName) {
    case "Phase1Requested": {
      const requestId = asHex(decoded.args["requestId"], "requestId");
      const data: Phase1RequestedData = {
        ...common,
        requestId,
        targetUal: asString(decoded.args["targetUal"], "targetUal"),
        requester: asHex(decoded.args["requester"], "requester"),
      };
      await inngest.send({
        id: `${requestId}-phase1`,
        name: "RatingController/phase1.requested",
        data,
      });
      return;
    }
    case "Phase1Fulfilled": {
      const requestId = asHex(decoded.args["requestId"], "requestId");
      const data: Phase1FulfilledData = {
        ...common,
        requestId,
        targetUal: asString(decoded.args["targetUal"], "targetUal"),
        score: asScore(decoded.args["score"]),
        rKaUal: asString(decoded.args["rKaUal"], "rKaUal"),
      };
      await inngest.send({
        id: `${requestId}-phase1-fulfilled`,
        name: "RatingController/phase1.fulfilled",
        data,
      });
      return;
    }
    case "RequestCancelled": {
      const requestId = asHex(decoded.args["requestId"], "requestId");
      const data: RequestCancelledData = {
        ...common,
        requestId,
        targetUal: asString(decoded.args["targetUal"], "targetUal"),
      };
      await inngest.send({
        id: `${requestId}-cancelled`,
        name: "RatingController/request.cancelled",
        data,
      });
      return;
    }
    case "OracleAgentUpdated": {
      const newAgent = asHex(decoded.args["newAgent"], "newAgent");
      const data: OracleUpdatedData = {
        ...common,
        newAgent,
      };
      await inngest.send({
        id: `${newAgent}-oracle-${blockNumber}`,
        name: "RatingController/oracle.updated",
        data,
      });
      return;
    }
    default:
      console.warn(
        `[processRatingControllerEvent] Ignoring unknown event ${decoded.eventName}`
      );
  }
}
