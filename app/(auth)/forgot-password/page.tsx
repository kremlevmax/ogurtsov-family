import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <ForgotPasswordForm />
        <Link href="/login" className="text-lg text-(--color-fg-muted) hover:underline">
          Вспомнили пароль? Войти
        </Link>
      </main>
    </div>
  );
}
