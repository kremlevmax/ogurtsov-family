import "server-only";

interface PostgresLikeError {
  code?: string;
  message: string;
}

function isPostgresLikeError(error: unknown): error is PostgresLikeError {
  return typeof error === "object" && error !== null && "message" in error;
}

/**
 * Converts a Postgres/Supabase error into a safe Russian message and
 * logs the real error server-side (CLAUDE.md 15). The ancestor-cycle
 * trigger in 0001_init.sql already raises a Russian message, so that
 * one is passed through as-is instead of genericized.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  console.error(error);

  if (!isPostgresLikeError(error)) return fallback;

  if (error.code === "23505") {
    return "Такая связь или запись уже существует.";
  }

  if (error.message.includes("предком самого себя")) {
    return error.message;
  }

  return fallback;
}
