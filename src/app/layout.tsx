import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Acadgine", template: "%s · Acadgine" },
  description: "Academic analytics and decision support for Program Chairs using fictional demonstration records.",
};

const initializeAppearance = `try {
  const mode = localStorage.getItem("acadgine-theme") || "system";
  document.documentElement.dataset.theme = mode === "dark" || (mode !== "light" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
} catch {}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initializeAppearance }} /></head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
