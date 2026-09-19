import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { LoginForm } from "@/components/auth/login-form";

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

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <LoginForm next={next} />
      </main>
    </div>
  );
}
