import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getRatingControllerAddress,
  ratingControllerAbi,
} from "@desci/contracts";
import {
  inngest,
  processRatingControllerEvent,
} from "@desci/agents/inngest";
import { NextResponse } from "next/server";
import { decodeEventLog, getAddress, type Hex } from "viem";

export const runtime = "nodejs";

const BASE_SEPOLIA_CHAIN_ID = 84532;

type AlchemyLog = {
  account?: { address?: string };
  address?: string;
  data?: string;
  topics?: string[];
  index?: number | string;
  transaction?: { hash?: string };
  transactionHash?: string;
  block?: { number?: string | number };
};

function verifyAlchemySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const normalized = signatureHeader.startsWith("0x")
    ? signatureHeader.slice(2)
    : signatureHeader;

  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return false;
  }

  const expectedHex = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(normalized, "hex");
  const calcBuffer = Buffer.from(expectedHex, "hex");

  if (sigBuffer.length !== calcBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, calcBuffer);
}

function resolveLogAddress(log: AlchemyLog): `0x${string}` | null {
  const raw = log.account?.address ?? log.address;
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const secret = process.env["ALCHEMY_BASE_SEPOLIA_WH_SK"];
    if (!secret) {
      return NextResponse.json(
        { error: "ALCHEMY_BASE_SEPOLIA_WH_SK is not configured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-alchemy-signature");
    const sigOk = verifyAlchemySignature(rawBody, signature, secret);

    if (!sigOk) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let json: {
      event?: {
        data?: {
          block?: {
            number?: string | number;
            logs?: AlchemyLog[];
          };
        };
      };
    };

    try {
      json = JSON.parse(rawBody) as typeof json;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const targetAddress = getAddress(
      getRatingControllerAddress(BASE_SEPOLIA_CHAIN_ID)
    );
    const logs = json.event?.data?.block?.logs ?? [];
    const blockNumberRaw = json.event?.data?.block?.number ?? "0";

    for (const rawLog of logs) {
      const logAddress = resolveLogAddress(rawLog);
      if (!logAddress || logAddress !== targetAddress) {
        continue;
      }

      if (!rawLog.data || !Array.isArray(rawLog.topics)) {
        continue;
      }

      const rawTxHash =
        rawLog.transaction?.hash ?? rawLog.transactionHash ?? null;
      if (!rawTxHash || !/^0x[0-9a-fA-F]+$/.test(rawTxHash)) {
        console.warn(
          `[alchemy-webhook] Skipping log without valid transaction hash at block ${blockNumberRaw}`
        );
        continue;
      }
      const transactionHash = rawTxHash as Hex;
      const logIndex = Number(rawLog.index ?? 0);

      const blockNumber = BigInt(
        rawLog.block?.number ?? blockNumberRaw ?? "0"
      );

      let decoded: {
        eventName?: string;
        args: unknown;
      };

      try {
        decoded = decodeEventLog({
          abi: ratingControllerAbi,
          data: rawLog.data as Hex,
          topics: rawLog.topics as [Hex, ...Hex[]],
        });
      } catch (err) {
        console.error(`[alchemy-webhook] Failed to decode log:`, err);
        continue;
      }

      if (!decoded.eventName) {
        console.warn(
          `[alchemy-webhook] Skipping anonymous/undecoded event at block ${blockNumber}`
        );
        continue;
      }

      try {
        await processRatingControllerEvent({
          chainId: BASE_SEPOLIA_CHAIN_ID,
          decoded: {
            eventName: decoded.eventName,
            args: decoded.args as Record<string, unknown>,
          },
          blockNumber,
          logIndex,
          transactionHash,
          inngest,
        });
      } catch (err) {
        console.error("[alchemy-webhook] Dispatch failed:", err);
        return NextResponse.json(
          { error: "Failed to dispatch Inngest event" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[alchemy-webhook] Uncaught:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
