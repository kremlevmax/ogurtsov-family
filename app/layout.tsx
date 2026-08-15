import type { Metadata } from "next";
import { Geist_Mono, Lora, Playfair_Display } from "next/font/google";
import { OfflineBanner } from "@/components/layout/offline-banner";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin", "cyrillic"],
});

const lora = Lora({
  variable: "--font-lora",
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
      className={`${playfairDisplay.variable} ${lora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-(--color-bg) text-(--color-fg)">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
