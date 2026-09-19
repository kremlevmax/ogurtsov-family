"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoungeRegisterForm } from "@/components/lounge/lounge-register-form";
import { TreeAccessRequestForm } from "@/components/lounge/tree-access-request-form";
import { RulesContent } from "@/components/legal/rules-content";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { Ornament } from "@/components/ui/ornament";
import { useAuthModal, type AuthModalView } from "@/components/auth/auth-modal-context";
import { getTreeAccessSummaryAction, type TreeAccessSummary } from "@/server/actions/tree-access-request";

export interface AuthModalHostProps {
  view: AuthModalView | null;
  onDismiss: () => void;
  onLoginSuccess: () => void;
}

/** The actual modal markup for AuthModalProvider — a separate file/component only to break a circular import (see auth-modal-context.tsx's doc comment). */
export function AuthModalHost({ view, onDismiss, onLoginSuccess }: AuthModalHostProps) {
  if (!view) return null;

  switch (view) {
    case "login":
      return (
        <Modal onClose={onDismiss}>
          <LoginForm mode="modal" onSuccess={onLoginSuccess} />
        </Modal>
      );
    case "register":
      return (
        <Modal onClose={onDismiss}>
          <LoungeRegisterForm mode="modal" />
        </Modal>
      );
    case "forgot-password":
      return (
        <Modal onClose={onDismiss}>
          <ForgotPasswordForm mode="modal" />
        </Modal>
      );
    case "join":
      return (
        <Modal onClose={onDismiss}>
          <JoinModalCard />
        </Modal>
      );
    case "rules":
      return (
        <Modal onClose={onDismiss} className="max-w-xl">
          <div className="flex max-h-[80vh] flex-col overflow-y-auto rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
            <Ornament className="mx-auto mb-4 h-3 w-24 text-(--color-border)" />
            <h1 className="font-heading text-center text-2xl font-bold text-(--color-heading)">Правила сайта</h1>
            <RulesContent showHeading={false} />
          </div>
        </Modal>
      );
    case "privacy":
      return (
        <Modal onClose={onDismiss} className="max-w-xl">
          <div className="flex max-h-[80vh] flex-col overflow-y-auto rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
            <Ornament className="mx-auto mb-4 h-3 w-24 text-(--color-border)" />
            <h1 className="font-heading text-center text-2xl font-bold text-(--color-heading)">
              Политика конфиденциальности
            </h1>
            <PrivacyContent showHeading={false} />
          </div>
        </Modal>
      );
    default:
      return null;
  }
}

/**
 * "Подтверждение родства" needs the viewer's own request status (server
 * data — the same check the standalone /join page does) before it can
 * render the right view, so this fetches it once on open instead of
 * navigating to a page. If the visitor isn't signed in yet — e.g. they
 * opened this straight after a registration that still needs email
 * confirmation — it offers the login modal instead of just failing.
 */
function JoinModalCard() {
  const { openLogin } = useAuthModal();
  const [summary, setSummary] = useState<TreeAccessSummary | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    getTreeAccessSummaryAction().then((result) => {
      if (!cancelled) setSummary(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (summary === "loading") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!summary.signedIn) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p className="font-heading text-2xl font-bold text-(--color-fg)">Подтверждение родства</p>
        <p className="text-lg text-(--color-fg)">Сначала нужно войти в гостиную.</p>
        <button
          type="button"
          onClick={openLogin}
          className="font-label inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-(--color-accent) px-6 text-[16px] font-bold tracking-[0.065px] text-(--color-accent-fg) uppercase transition-opacity hover:opacity-90"
        >
          Войти
        </button>
      </div>
    );
  }

  if (summary.hasTreeAccess) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p>У вас уже есть доступ к добавлению людей в родословное дерево.</p>
      </div>
    );
  }

  return <TreeAccessRequestForm initialStatus={summary.status} />;
}
