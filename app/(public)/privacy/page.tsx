import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика обработки персональных данных на сайте «Родословное дерево семьи Огурцовых».",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <PrivacyContent />
      </main>
    </div>
  );
}
