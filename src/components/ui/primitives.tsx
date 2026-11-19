"use client";

import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: { default: "button-primary", outline: "button-outline", ghost: "button-ghost" },
    size: { default: "button-default", sm: "button-sm", icon: "button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section data-slot="card" className={cn("ui-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"header">) {
  return <header data-slot="card-header" className={cn("card-header", className)} {...props} />;
}

export function CardTitle({ as: Heading = "h2", ...props }: ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return <Heading data-slot="card-title" {...props} />;
}

export function CardDescription(props: ComponentProps<"p">) {
  return <p data-slot="card-description" {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("card-content", className)} {...props} />;
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="badge" className={cn("ui-badge", className)} {...props} />;
}

export function Alert({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert" className={cn("ui-alert", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn("ui-input", className)} {...props} />;
}

export function Table(props: ComponentProps<"table">) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={props["aria-label"]}>
    <table data-slot="table" {...props} />
  </div>;
}

export function Empty({ children = "No records match these filters." }: { children?: React.ReactNode }) {
  return <div data-slot="empty" className="empty-state">{children}</div>;
}
