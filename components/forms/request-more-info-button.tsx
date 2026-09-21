"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestTreeAccessMoreInfoAction } from "@/server/actions/tree-access";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function RequestMoreInfoButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  function close() {
    setIsOpen(false);
    setMessage("");
    setError(null);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        Запросить уточнение
      </Button>
      {isOpen && (
        <Modal onClose={close} className="max-w-md">
          <form
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-6 shadow-(--shadow-md)"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await requestTreeAccessMoreInfoAction(userId, message);
                if (result.ok) {
                  router.refresh();
                  close();
                } else {
                  setError(result.error ?? "Не удалось отправить запрос.");
                }
              });
            }}
          >
            <h2 className="font-heading text-lg font-bold text-(--color-fg)">Запросить дополнительные сведения</h2>
            <label htmlFor="more-info-message" className="text-sm font-medium text-(--color-fg)">
              Сообщение пользователю
            </label>
            <textarea
              id="more-info-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={4}
              maxLength={1000}
              placeholder="Например: для подтверждения родства, пожалуйста, сообщите девичью фамилию Вашей бабушки или приложите документы, подтверждающие родственную связь."
              className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-fg) focus-visible:outline-none"
            />
            {error && (
              <p role="alert" className="text-sm text-(--color-danger)">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close}>
                Отмена
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Отправляем…" : "Отправить"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
