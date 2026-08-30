import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { OfflineBanner } from "@/components/layout/offline-banner";
import "./globals.css";

// Site-wide redesign to the owner's Figma handoff (docs/DECISIONS.md,
// 2026-08-29): Prata + EB Garamond -> one serif family for both
// headings and body copy. `desktop-layout.svg`'s own CSS names "Noto
// Serif", but that SVG's glyphs are vector outlines (text-to-path),
// not live text — the `font-family` declaration is leftover export
// metadata, not what actually produced those shapes. Noto Serif's
// sturdier, more geometric look didn't match the reference PNGs on a
// direct visual check (owner: "тонкий и красивый" — thin/elegant), so
// this follows Cormorant Garamond, matching DESIGN_SPEC.md's own text
// and the thin, high-contrast strokes visible in the PNGs. Person-node.tsx's
// own "Викторianский альбом" card frame is explicitly out of scope for
// this redesign and keeps referencing these same --font-heading/
// --font-body tokens, so its look changes along with the rest of the
// site (still one serif family for names/dates).
const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant-garamond",
  subsets: ["latin", "cyrillic"],
});

// Geist Mono -> Inter for nav/buttons/eyebrow labels (`.text-label`) —
// the reference's nav ("ГЛАВНАЯ ДРЕВО ИСТОРИЯ…") and buttons use a
// plain tracked sans, not a monospaced face.
const inter = Inter({
  variable: "--font-inter",
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
      className={`${cormorantGaramond.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-(--color-bg) text-(--color-fg)">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
