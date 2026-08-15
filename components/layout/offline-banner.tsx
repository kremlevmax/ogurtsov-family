"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Centralized offline/network-error state (CLAUDE.md 10) — one banner for the whole site instead of per-form handling. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-(--color-danger) px-4 py-2 text-center text-sm text-(--color-danger-fg)"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Нет соединения с интернетом. Изменения не сохранятся, пока связь не восстановится.
    </div>
  );
}
