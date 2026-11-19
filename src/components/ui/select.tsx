"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardSelect<T extends string>({ id, label, value, options, onChange, active, disabled, className }: {
  id?: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={(choice) => onChange(choice as T)} disabled={disabled}>
      <Select.Trigger id={id} aria-label={label} data-slot="select-trigger" data-selected={active}
        className={cn("ui-select", className)}>
        <span className="select-value"><Select.Value /></span>
        <Select.Icon asChild><ChevronDown aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={6} align="start" collisionPadding={12}
          data-slot="select-content" className="select-content">
          <Select.ScrollUpButton className="select-scroll-button"><ChevronUp aria-hidden="true" /></Select.ScrollUpButton>
          <Select.Viewport className="select-viewport">
            <Select.Group>
              {options.map((option) => <Select.Item value={option.value} key={option.value}
                data-slot="select-item" className="select-item">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="select-indicator"><Check aria-hidden="true" /></Select.ItemIndicator>
              </Select.Item>)}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll-button"><ChevronDown aria-hidden="true" /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
