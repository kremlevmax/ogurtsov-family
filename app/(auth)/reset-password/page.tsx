import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Новый пароль",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Новый пароль</h1>
          <Suspense fallback={<p className="text-center text-lg text-(--color-fg-muted)">Загрузка…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
