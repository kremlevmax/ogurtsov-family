/**
 * Only ever redirect to a same-site path (never an absolute/external URL
 * from an untrusted "next" form field). Falls back to the homepage when
 * there's no explicit "next" — shared by the editor and lounge sign-in/
 * registration actions (server/actions/auth.ts, lounge-auth.ts), which
 * both post through the same unified /login and /register pages.
 */
export function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}
