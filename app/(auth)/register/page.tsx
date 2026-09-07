import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { LoungeRegisterForm } from "@/components/lounge/lounge-register-form";

export const metadata: Metadata = {
  title: "Регистрация",
  robots: { index: false, follow: false },
};

/**
 * Self-registration for "Семейная гостиная" only — the two editors are
 * still pre-created by hand (CLAUDE.md 3.2), never through this form.
 * Moved here from /lounge/register (owner's request, 2026-09-04, to
 * match the unified /login); /lounge/register now redirects here
 * (next.config.ts).
 */
export default async function RegisterPage(props: PageProps<"/register">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <LoungeRegisterForm next={next} />
        <Link href={loginHref} className="text-lg text-(--color-fg-muted) hover:underline">
          Уже есть аккаунт? Войти
        </Link>
      </main>
    </div>
  );
}
