import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono, Prata } from "next/font/google";
import { OfflineBanner } from "@/components/layout/offline-banner";
import "./globals.css";

// Merriweather -> Prata (CLAUDE.md 24 decision log, docs/DECISIONS.md):
// chosen alongside the "Victorian album" redesign direction — Prata's
// engraved, high-contrast display serif reads as more formal/archival
// for names and headings. Only one weight exists, so founder/heading
// emphasis leans on size and letter-spacing rather than a bold cut.
const prata = Prata({
  weight: "400",
  variable: "--font-prata",
  subsets: ["latin", "cyrillic"],
});

// Lora -> EB Garamond, same redesign pass — a classic Garamond-style
// body face pairs with Prata's display character better than Lora's
// more contemporary curves, and its italic (used for approximate/life-
// span dates) has genuine calligraphic swashes instead of a slanted
// roman.
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Семейное дерево Огурцовых",
    template: "%s — Семейное дерево Огурцовых",
  },
  description:
    "Публичный семейный архив: интерактивное родословное дерево, фотографии и документы семьи Огурцовых.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${prata.variable} ${ebGaramond.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-(--color-bg) text-(--color-fg)">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
