"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PublishKaModal } from "./publish-ka-modal";

type PublishKaButtonProps = {
  label: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  disabledReason?: string | null;
};

export function PublishKaButton({
  label,
  className,
  variant = "default",
  size = "lg",
  disabled = false,
  disabledReason,
}: PublishKaButtonProps) {
  const [open, setOpen] = useState(false);
  const title = disabled
    ? (disabledReason?.trim() ||
      "DKG daemon not reachable in this environment.")
    : undefined;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className, {
          "cursor-pointer": !disabled
        })}
        disabled={disabled}
        title={title}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
      >
        {label}
        {variant === "default" ? <span aria-hidden>↗</span> : null}
      </Button>
      {!disabled ? (
        <PublishKaModal open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
