import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoginForm } from "@/components/auth/login-form";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Вход для редакторов",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-xl font-bold text-(--color-fg)">Вход для редакторов</h1>
          <LoginForm />
        </div>
        <Link href="/" className="text-sm text-(--color-fg-muted) hover:underline">
          Вернуться к дереву
        </Link>
      </main>
    </div>
  );
}
