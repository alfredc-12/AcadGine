"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ModalSurface } from "@/components/ui/modal";

export function WelcomeDialog({ open, mark, onSkip, onStart, restoreFocus }: {
  open: boolean;
  mark: ReactNode;
  onSkip: () => void;
  onStart: () => void;
  restoreFocus: () => void;
}) {
  const [starting, setStarting] = useState(false);

  return <Dialog.Root open={open && !starting} onOpenChange={(next) => { if (!next && !starting) onSkip(); }}>
    <ModalSurface className="welcome-modal" clearBackdrop onCloseAutoFocus={(event) => {
      event.preventDefault();
      if (starting) {
        setStarting(false);
        onStart();
      } else {
        restoreFocus();
      }
    }}>
      <div className="welcome-brand">
        {mark}<span><strong>Acadgine</strong><small>Program Chair Dashboard</small></span>
      </div>
      <div className="modal-heading welcome-heading">
        <div>
          <Dialog.Title>Welcome to Acadgine</Dialog.Title>
          <Dialog.Description>Explore academic performance, teaching effectiveness, and section-level insights in one dashboard.</Dialog.Description>
        </div>
      </div>
      <div className="welcome-cards">
        <Card className="welcome-card">
          <CardHeader><CardTitle as="h3"><Activity aria-hidden="true" /> Academic Intelligence</CardTitle></CardHeader>
          <CardContent><CardDescription>Monitor academic outcomes, SETE evaluations, and sections requiring review.</CardDescription></CardContent>
        </Card>
        <Card className="welcome-card">
          <CardHeader><CardTitle as="h3"><ShieldCheck aria-hidden="true" /> Responsible Analytics</CardTitle></CardHeader>
          <CardContent><CardDescription>Use evaluation results alongside response coverage and other teaching evidence.</CardDescription></CardContent>
        </Card>
      </div>
      <div className="modal-actions">
        <Dialog.Close asChild><Button variant="ghost">Skip</Button></Dialog.Close>
        <Button onClick={() => setStarting(true)} disabled={starting}>
          Start Dashboard Tour <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </ModalSurface>
  </Dialog.Root>;
}
