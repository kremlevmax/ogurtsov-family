"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const PROBE_TIMEOUT_MS = 4000;
const RECHECK_INTERVAL_MS = 15000;

/**
 * `navigator.onLine` only reflects whether the OS/network adapter has a
 * link, not whether the internet is actually reachable — it's known to
 * report `false` incorrectly on some machines/networks. A real
 * same-origin request is the only trustworthy signal, so the browser
 * flag is just a hint for *when* to bother probing, never the verdict.
 */
async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    await fetch("/favicon.ico", { method: "HEAD", cache: "no-store", signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

/** Centralized offline/network-error state (CLAUDE.md 10) — one banner for the whole site instead of per-form handling. */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function stopRechecking() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    async function check() {
      const online = await probeConnectivity();
      if (cancelled) return;
      setIsOffline(!online);
      if (online) stopRechecking();
    }

    function handleOffline() {
      check();
      if (!intervalId) intervalId = setInterval(check, RECHECK_INTERVAL_MS);
    }

    function handleOnline() {
      setIsOffline(false);
      stopRechecking();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    if (!navigator.onLine) handleOffline();

    return () => {
      cancelled = true;
      stopRechecking();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
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
