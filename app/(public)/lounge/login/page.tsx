import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoungeLoginForm } from "@/components/lounge/lounge-login-form";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Вход в гостиную",
  robots: { index: false, follow: false },
};

export default async function LoungeLoginPage(props: PageProps<"/lounge/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const registerHref = next ? `/lounge/register?next=${encodeURIComponent(next)}` : "/lounge/register";

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-xl font-bold text-(--color-fg)">Вход в гостиную</h1>
          <LoungeLoginForm next={next} />
        </div>
        <Link href={registerHref} className="text-sm text-(--color-fg-muted) hover:underline">
          Нет аккаунта? Зарегистрироваться
        </Link>
      </main>
    </div>
  );
}
