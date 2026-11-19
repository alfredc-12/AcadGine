"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ModalSurface({ className, children, ...props }: ComponentProps<typeof Dialog.Content>) {
  return <Dialog.Portal>
    <Dialog.Overlay className="modal-overlay no-print" />
    <Dialog.Content className={cn("modal-surface no-print", className)} {...props}>
      {children}
    </Dialog.Content>
  </Dialog.Portal>;
}
