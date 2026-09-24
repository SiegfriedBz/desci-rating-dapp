"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last resort: this replaces the root layout, so it runs when the failure is
 * in the layout itself — the header, the footer, or the AppKit provider — and
 * `error.tsx` never gets the chance to render.
 *
 * It therefore owns `html` and `body`, cannot use anything from the layout,
 * and imports the stylesheet itself. Keep it dependency-free on purpose: a
 * boundary that can throw is not a boundary. No fonts, no providers, no UI
 * primitives.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-lg space-y-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <h1 className="text-lg font-semibold text-destructive">
            VeriSci could not load
          </h1>
          <p className="text-sm leading-6">
            Reloading usually clears this. Nothing already running on the DKG is
            affected by it.
          </p>
          {error.digest ? (
            <p className="font-mono text-[11px] break-all opacity-70">
              Digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
