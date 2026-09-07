"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rejectTreeAccessAction } from "@/server/actions/tree-access";
import { Button } from "@/components/ui/button";

export function RejectTreeAccessButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await rejectTreeAccessAction(userId);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось отклонить заявку.");
            }
          });
        }}
      >
        {isPending ? "Отклоняем…" : "Отклонить"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
