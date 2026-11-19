"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Search, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

type Option = { value: string; label: string; detail?: string; keywords?: string[] };

export function SearchableSelect({ id, label, value, options, onChange, placeholder, icon: Icon, disabled }: {
  id: string;
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);
  const [menuOptions, setMenuOptions] = useState(options);
  const input = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);

  function changeOpen(next: boolean) {
    if (next) {
      setMenuOptions(options);
      setOpening((version) => version + 1);
    }
    setOpen(next);
  }

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger id={id} aria-label={`${label}, ${selected?.label ?? "Select an option"}`} className="ui-select"
      data-selected={value !== "all"} disabled={disabled}
      onKeyDown={(event) => {
        if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          changeOpen(true);
        }
      }}>
      <span className="select-field-icon"><Icon aria-hidden="true" /></span>
      <span className="select-value">{selected?.label ?? "Select an option"}</span>
      <ChevronDown aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="select-content searchable-select-content" sideOffset={6} align="start" collisionPadding={12}
        aria-label={label} onOpenAutoFocus={(event) => {
          if (!input.current) return;
          event.preventDefault();
          input.current.focus();
        }}>
        <Command key={opening} className="search-command" label={placeholder} defaultValue={value} loop>
          <div className="filter-search">
            <Search aria-hidden="true" />
            <Command.Input ref={input} placeholder={placeholder} />
          </div>
          <Command.List className="search-options" label={`${label} options`}>
            <Command.Empty className="search-empty">No matches.</Command.Empty>
            <Command.Group>
              {menuOptions.map((option) => (
                <Command.Item key={option.value} value={option.value} keywords={[option.label, ...(option.keywords ?? [])]}
                  className="select-item search-item" data-current={value === option.value}
                  aria-current={value === option.value ? "true" : undefined} onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}>
                  <span className="search-option-label">
                    <span>{option.label}</span>
                    {option.detail && <small>{option.detail}</small>}
                  </span>
                  {value === option.value && <span className="select-indicator"><Check aria-hidden="true" /></span>}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
