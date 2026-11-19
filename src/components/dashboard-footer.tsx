"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Info, X } from "lucide-react";
import { targets } from "@/lib/analytics";
import { Button } from "@/components/ui/primitives";
import { ModalSurface } from "@/components/ui/modal";

export function DashboardFooter({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return <footer className="dashboard-footer no-print">
    <div className="footer-brand">
      <strong>Acadgine</strong>
      <span>Academic Analytics &amp; Intelligent Decision Support</span>
    </div>
    <span className="footer-data"><Info aria-hidden="true" /> Illustrative Academic Data</span>
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="footer-method">Methodology &amp; Privacy</Button>
      </Dialog.Trigger>
      <ModalSurface className="method-modal">
        <div className="modal-heading">
          <div>
            <Dialog.Title>Methodology &amp; Privacy</Dialog.Title>
            <Dialog.Description>How to read the Acadgine dashboard.</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close methodology"><X /></Button></Dialog.Close>
        </div>
        <dl className="methodology-facts">
          <div><dt>Demonstration records</dt><dd>Student and Faculty Portal records are fictional. Passing rates use finalized enrollments, and SETE averages are weighted by valid response counts.</dd></div>
          <div><dt>Benchmarks and review rules</dt><dd>Thresholds are illustrative. Substantial or multiple concerns can flag a section. Academic review uses at least {targets.minGraded} finalized grades, and SETE review uses at least {targets.minResponses} valid responses with {targets.minParticipation}% participation.</dd></div>
          <div><dt>Interpreting SETE</dt><dd>Period comparisons match the same subject, section, and professor. Consider participation and other teaching evidence when following up on review flags.</dd></div>
          <div><dt>Privacy</dt><dd>Acadgine contains fictional aggregates and no actual student evaluation responses.</dd></div>
        </dl>
      </ModalSurface>
    </Dialog.Root>
  </footer>;
}
