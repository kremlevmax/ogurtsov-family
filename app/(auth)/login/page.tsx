import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoginForm } from "@/components/auth/login-form";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: false },
};

/**
 * One unified login for the whole site — both the two editors and
 * registered "Семейная гостиная" members sign in here (owner's
 * request, 2026-09-04; see server/actions/auth.ts's signInAction for
 * how the post-login redirect picks between them). Replaces what used
 * to be two separate pages/forms at /login (editors only) and
 * /lounge/login (lounge members only); /lounge/login now redirects
 * here (next.config.ts).
 */
export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Вход</h1>
          <LoginForm next={next} />
        </div>
        <Link href={registerHref} className="text-lg text-(--color-fg-muted) hover:underline">
          Нет аккаунта? Зарегистрироваться
        </Link>
      </main>
    </div>
  );
}
