"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./primitives";

export function Sheet({ title, description, children, open, onOpenChange, onRestoreFocus }: {
  title: string;
  description?: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreFocus?: () => boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet-content" onCloseAutoFocus={(event) => {
          if (onRestoreFocus?.()) event.preventDefault();
        }}>
          <div className="sheet-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description className={description ? undefined : "sr-only"}>{description ?? title}</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" className="sheet-close" aria-label="Close panel"><X /></Button></Dialog.Close>
          </div>
          <div className="sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
