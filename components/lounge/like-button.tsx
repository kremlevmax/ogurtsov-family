"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
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

  // Optimistic view of (liked, count): flips the instant the button is
  // pressed, before the server round-trip. React folds it back onto the
  // real props once the transition ends — by then router.refresh() has
  // landed the new server values, so there's no visible flip-back. On a
  // failed toggle we also refresh(), which snaps it back to the truth.
  const [optimistic, applyOptimistic] = useOptimistic(
    { liked, count },
    (state, nextLiked: boolean) => ({
      liked: nextLiked,
      count: state.count + (nextLiked ? 1 : -1),
    }),
  );

  const label = `${optimistic.liked ? "♥" : "♡"}  Нравится${optimistic.count > 0 ? ` · ${optimistic.count}` : ""}`;

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
        className={clsx(className, optimistic.liked && activeClassName)}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            applyOptimistic(!optimistic.liked);
            const result = await toggleLoungeMessageLikeAction(messageId);
            if (result.ok) {
              // Direct action call (not a <form>), so — same as
              // DeleteLoungeMessageButton — needs an explicit refresh;
              // revalidatePath() inside the action alone doesn't
              // repaint an already-mounted page.
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось отметить «Нравится».");
              router.refresh();
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
