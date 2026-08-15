import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Вход для редакторов",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-xl font-semibold">Вход для редакторов</h1>
        <LoginForm />
        <Link href="/" className="text-sm text-(--color-fg-muted) hover:underline">
          Вернуться к дереву
        </Link>
      </main>
    </div>
  );
}
