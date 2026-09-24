"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * The app shipped without one, and a single client-side throw anywhere in the
 * tree — a status poll, a wallet hook, one bad render — replaced the entire
 * document with the framework's default error page. A publish that failed took
 * the catalog, the header and the footer down with it. This keeps a failure
 * inside the page that caused it and leaves the user somewhere to go.
 *
 * React redacts `error.message` in production and leaves only `digest`, so the
 * digest is shown rather than a message that would read as empty.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page-error]", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <div className="max-w-2xl space-y-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 shrink-0 text-destructive" />
            <h1 className="text-lg font-semibold text-destructive">
              Something on this page stopped working
            </h1>
          </div>
          <p className="text-sm leading-6 text-foreground">
            The rest of the app is fine. Anything already running on the DKG
            keeps running — this is the page failing to draw, not your publish
            or your rating failing.
          </p>
          {error.digest ? (
            <p className="font-mono text-[11px] break-all text-muted">
              Digest: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" onClick={reset}>
              <RefreshCwIcon className="size-4" />
              Try again
            </Button>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to the catalog
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
