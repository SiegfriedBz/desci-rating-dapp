"use client";

import { useEffect, useState } from "react";
import { RATING_PHASE } from "@desci/shared";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import type { OnChainRating } from "@/lib/queries/contract/ratings-types";
import { truncateUal } from "./rate-ka-table-meta";

/** After this, treat a still-pending request as likely oracle/DKG failure. */
export const ORACLE_STALL_MS = 90_000;

type OracleRequestStatusProps = {
  ual: string;
  rating: OnChainRating | null | undefined;
  /** Wall-clock when we started watching (tx confirmed). */
  watchStartedAt: number;
  className?: string;
};

/**
 * Post-requestPhase1 feedback: pending → fulfilled success, or stalled error
 * when the oracle never fulfills (common when DKG write quorum fails).
 */
export function OracleRequestStatus({
  ual,
  rating,
  watchStartedAt,
  className,
}: OracleRequestStatusProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const fulfilled =
    rating != null &&
    rating.phase === RATING_PHASE.Phase1Completed &&
    Boolean(rating.rKaUal);
  const elapsed = now - watchStartedAt;
  const stalled = !fulfilled && elapsed >= ORACLE_STALL_MS;

  if (fulfilled && rating) {
    return (
      <div
        className={`rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm ${className ?? ""}`}
        role="status"
      >
        <p className="flex items-center gap-2 font-semibold text-primary">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Phase 1 rating complete
        </p>
        <p className="mt-1 font-mono text-xs text-muted break-all">
          {truncateUal(ual, 20, 12)}
        </p>
        <p className="mt-2 text-foreground">
          Score{" "}
          <span className="font-semibold text-primary">
            {rating.phase1Score}
          </span>
          {rating.rKaUal ? (
            <>
              {" "}
              · R-KA{" "}
              <span className="font-mono text-xs">
                {truncateUal(rating.rKaUal)}
              </span>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  if (stalled) {
    return (
      <div
        className={`rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm ${className ?? ""}`}
        role="alert"
      >
        <p className="flex items-center gap-2 font-semibold text-amber-500">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Oracle is taking longer than expected
        </p>
        <p className="mt-1 font-mono text-xs text-muted break-all">
          {truncateUal(ual, 20, 12)}
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground/90">
          Your on-chain request is locked while the oracle finishes. It will
          keep retrying automatically — you do not need to do anything.
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground/60">
          You cannot submit another request for this KA until the current one
          is resolved. If it stays stuck, a contract administrator can cancel
          the lock to unblock it.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm ${className ?? ""}`}
      role="status"
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
        Request submitted
      </p>
      <p className="mt-1 font-mono text-xs text-muted break-all">
        {truncateUal(ual, 20, 12)}
      </p>
      <p className="mt-2 flex items-center gap-2 font-mono text-xs text-primary/80">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {elapsed < 30_000
          ? "Oracle scoring and publishing R-KA…"
          : "Still waiting for oracle fulfill on-chain…"}
      </p>
    </div>
  );
}
