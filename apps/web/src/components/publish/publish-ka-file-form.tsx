"use client";

import type { KeyboardEvent, RefObject } from "react";
import { FileIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MAX_PDF_MB } from "@/lib/publish-types";
import { cn } from "@/lib/utils";

type PublishKaFileFormProps = {
  file: File | null;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
};

export function PublishKaFileForm({
  file,
  error,
  fileInputRef,
  onFileChange,
}: PublishKaFileFormProps) {
  const openPicker = () => fileInputRef.current?.click();

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="publish-pdf">PDF file</Label>
        <div
          role="button"
          tabIndex={0}
          aria-controls="publish-pdf"
          onClick={openPicker}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          )}
        >
          <FileIcon className="size-4 shrink-0 text-muted" />
          <span className={cn("truncate", file ? "text-foreground" : "text-muted")}>
            {file ? file.name : "Choose PDF file…"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          id="publish-pdf"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted">
          Maximum size {MAX_PDF_MB} MB. PDF only.
        </p>
        {file ? (
          <p className="text-xs text-muted">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        ) : null}
      </div>
      {error ? (
        <p
          className={cn(
            "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
