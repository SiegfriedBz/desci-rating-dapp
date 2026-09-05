"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type PublishKaSuccessProps = {
  ual: string | null;
  copied: boolean;
  onCopy: () => void;
};

export function PublishKaSuccess({
  ual,
  copied,
  onCopy,
}: PublishKaSuccessProps) {
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <CheckIcon className="size-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">
          Knowledge Asset published
        </p>
      </div>
      {ual ? (
        <>
          <p className="font-mono text-xs break-all text-muted">{ual}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy UAL"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted">
          Publish completed, but the UAL was not returned. Check the KA catalog
          or try again later.
        </p>
      )}
    </div>
  );
}
