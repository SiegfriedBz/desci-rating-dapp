"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RATING_PHASE } from "@desci/shared";
import { Loader2 } from "lucide-react";
import { queryRatingByUal } from "@/lib/queries/contract/ratings";
import { Button } from "@/components/ui/button";
import { OracleRequestStatus } from "./oracle-request-status";
import { RequestPhase1Button } from "./request-phase1-button";
import { truncateUal } from "./rate-ka-table-meta";

export function UalPasteField() {
  const [input, setInput] = useState("");
  const [checkedUal, setCheckedUal] = useState<string | null>(null);
  const [watchingUal, setWatchingUal] = useState<string | null>(null);
  const [watchStartedAt, setWatchStartedAt] = useState<number | null>(null);

  const ratingQuery = useQuery({
    queryKey: ["rating-by-ual-paste", checkedUal],
    queryFn: () => queryRatingByUal(checkedUal!),
    enabled: Boolean(checkedUal),
    refetchInterval: (query) => {
      if (!watchingUal || watchingUal !== checkedUal) {
        return false;
      }
      const rating = query.state.data;
      if (!rating) {
        return 5_000;
      }
      if (rating.phase === RATING_PHASE.Phase1Completed) {
        return false;
      }
      return 5_000;
    },
  });

  const rating = ratingQuery.data;
  const canRequest =
    rating != null &&
    rating.phase === RATING_PHASE.Unrated &&
    !rating.isPending;

  const showWatchBanner =
    watchingUal != null &&
    watchStartedAt != null &&
    watchingUal === checkedUal;

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <p className="text-sm font-semibold text-foreground">Paste a KA UAL</p>
      <p className="mt-1.5 text-sm leading-6 text-muted">
        The catalog only lists recent publications. Paste any target UAL to
        check on-chain status and request Phase 1.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setWatchingUal(null);
            setWatchStartedAt(null);
          }}
          placeholder="did:dkg:base:84532/…"
          spellCheck={false}
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-xs text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="shrink-0 rounded-full"
          disabled={!input.trim() || ratingQuery.isFetching}
          onClick={() => {
            setCheckedUal(input.trim());
            setWatchingUal(null);
            setWatchStartedAt(null);
          }}
        >
          {ratingQuery.isFetching ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Checking…
            </>
          ) : (
            "Check"
          )}
        </Button>
      </div>

      {checkedUal && ratingQuery.isFetched ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {showWatchBanner ? (
            <OracleRequestStatus
              ual={watchingUal}
              rating={ratingQuery.data ?? null}
              watchStartedAt={watchStartedAt}
            />
          ) : null}

          {!rating ? (
            <p className="text-sm text-danger" role="alert">
              Could not read on-chain rating for this UAL. Check the UAL format
              and that Base Sepolia RPC is reachable.
            </p>
          ) : rating.phase === RATING_PHASE.Phase1Completed &&
            !showWatchBanner ? (
            <p className="text-sm text-foreground" role="status">
              Already rated — score{" "}
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
          ) : rating.isPending && !showWatchBanner ? (
            <p className="flex items-center gap-2 font-mono text-xs text-primary/80">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              A request is already pending on-chain for this UAL…
            </p>
          ) : canRequest ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                Unrated
              </span>
              <RequestPhase1Button
                targetUal={checkedUal}
                onSuccess={(ual) => {
                  setWatchingUal(ual);
                  setWatchStartedAt(Date.now());
                  void ratingQuery.refetch();
                }}
              />
            </div>
          ) : showWatchBanner ? null : (
            <p className="text-sm text-muted">
              This KA is not eligible for a new Phase 1 request.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
