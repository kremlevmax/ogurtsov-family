"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toggleLoungeMessageLikeAction } from "@/server/actions/lounge-messages";

export interface LikeButtonProps {
  messageId: string;
  liked: boolean;
  count: number;
  /** Whether the viewer is a registered member — if not, this is a login link instead of a toggle. */
  canLike: boolean;
  className?: string;
  activeClassName?: string;
  errorClassName?: string;
}

/** "♡ Поддержать" renamed to "Нравится" and made real (owner's request) — a like per member per message. */
export function LikeButton({ messageId, liked, count, canLike, className, activeClassName, errorClassName }: LikeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = `${liked ? "♥" : "♡"}  Нравится${count > 0 ? ` · ${count}` : ""}`;

  if (!canLike) {
    return (
      <Link href="/lounge/login" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        className={clsx(className, liked && activeClassName)}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleLoungeMessageLikeAction(messageId);
            if (result.ok) {
              // Direct action call (not a <form>), so — same as
              // DeleteLoungeMessageButton — needs an explicit refresh;
              // revalidatePath() inside the action alone doesn't
              // repaint an already-mounted page.
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось отметить «Нравится».");
            }
          });
        }}
      >
        {label}
      </button>
      {error && (
        <span role="alert" className={errorClassName}>
          {error}
        </span>
      )}
    </>
  );
}
