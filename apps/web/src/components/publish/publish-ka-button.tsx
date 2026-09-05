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
};

export function PublishKaButton({
  label,
  className,
  variant = "default",
  size = "lg",
}: PublishKaButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        {label}
        {variant === "default" ? <span aria-hidden>↗</span> : null}
      </Button>
      <PublishKaModal open={open} onOpenChange={setOpen} />
    </>
  );
}
