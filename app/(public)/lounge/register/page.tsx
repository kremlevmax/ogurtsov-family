import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoungeRegisterForm } from "@/components/lounge/lounge-register-form";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Регистрация в гостиной",
  robots: { index: false, follow: false },
};

export default async function LoungeRegisterPage(props: PageProps<"/lounge/register">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const loginHref = next ? `/lounge/login?next=${encodeURIComponent(next)}` : "/lounge/login";

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-xl font-bold text-(--color-fg)">Регистрация в гостиной</h1>
          <p className="text-center text-sm text-(--color-fg-muted)">
            Код приглашения можно узнать у владельца сайта.
          </p>
          <LoungeRegisterForm next={next} />
        </div>
        <Link href={loginHref} className="text-sm text-(--color-fg-muted) hover:underline">
          Уже есть аккаунт? Войти
        </Link>
      </main>
    </div>
  );
}
