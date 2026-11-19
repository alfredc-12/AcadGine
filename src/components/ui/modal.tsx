"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ModalSurface({ className, children, clearBackdrop, ...props }: ComponentProps<typeof Dialog.Content> & {
  clearBackdrop?: boolean;
}) {
  return <Dialog.Portal>
    <Dialog.Overlay className="modal-overlay no-print" data-clear={clearBackdrop} />
    <Dialog.Content className={cn("modal-surface no-print", className)} {...props}>
      {children}
    </Dialog.Content>
  </Dialog.Portal>;
}
