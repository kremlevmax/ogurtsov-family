"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveTreeAccessAction } from "@/server/actions/tree-access";
import { Button } from "@/components/ui/button";

export function ApproveTreeAccessButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await approveTreeAccessAction(userId);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось одобрить заявку.");
            }
          });
        }}
      >
        {isPending ? "Одобряем…" : "Одобрить"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
