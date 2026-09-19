import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { RulesContent } from "@/components/legal/rules-content";

export const metadata: Metadata = {
  title: "Правила сайта",
  description: "Правила участия в проекте «Родословное дерево семьи Огурцовых».",
};

export default function RulesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <RulesContent />
      </main>
    </div>
  );
}
