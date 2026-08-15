import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Scripts run outside Next.js's build pipeline (via `tsx`), so
 * `.env.local` isn't loaded automatically the way Next.js loads it for
 * `next dev`/`next build`. Minimal hand-rolled loader instead of adding
 * a `dotenv` dependency for one file.
 */
export function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
