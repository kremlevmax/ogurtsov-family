import { z } from "zod";

export const LOUNGE_TOPICS = ["news", "memories", "search", "thanks"] as const;
export type LoungeTopic = (typeof LOUNGE_TOPICS)[number];

export const LOUNGE_TOPIC_LABELS: Record<LoungeTopic, string> = {
  news: "Новости семьи",
  memories: "Воспоминания",
  search: "Ищу родственников",
  thanks: "Благодарности",
};

/**
 * Server-side validation for lounge member registration. Same schema
 * runs client-side (RHF-free plain form here, but the shape still backs
 * the Server Action) and server-side — CLAUDE.md 13.
 *
 * Registration itself no longer asks how the member is related to the
 * family (owner decision, 2026-09-18, docs/DECISIONS.md — invite-code
 * registration removed) — every member starts as a plain "Гость" with
 * lounge-posting rights only. Asking to add people to the tree is a
 * separate, later step: treeAccessRequestSchema below, submitted via
 * server/actions/tree-access-request.ts.
 */
export const loungeRegisterSchema = z
  .object({
    email: z.email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    confirmPassword: z.string(),
    firstName: z.string().trim().min(1, "Укажите имя").max(80),
    lastName: z.string().trim().min(1, "Укажите фамилию").max(80),
    agreedToRules: z.literal(true, {
      error: "Нужно принять Правила сайта и Политику конфиденциальности",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

/**
 * "Подтверждение родства" (docs/design handoff, 2026-09-18): a signed-in
 * member asks an editor for the right to add people to the tree.
 * `ancestorRef` and `aboutSelf` are optional free text the member fills
 * in separately in the form, but both fold into the single
 * `lounge_tree_access.relation_note` column server-side (no reason to
 * add two more nullable text columns for something only ever read by a
 * human editor) — see server/actions/tree-access-request.ts.
 */
export const treeAccessRequestSchema = z.object({
  ancestorRef: z.string().trim().max(300).optional().default(""),
  aboutSelf: z.string().trim().max(2000).optional().default(""),
});

/**
 * Covers both a top-level post (topic required, no parentMessageId)
 * and a reply (parentMessageId required, topic omitted — the reply
 * copies its parent's topic server-side instead of asking again,
 * server/repositories/lounge.ts's createLoungeMessage).
 */
export const loungeMessageSchema = z
  .object({
    topic: z.enum(LOUNGE_TOPICS, { message: "Выберите тему" }).nullable().optional(),
    body: z.string().trim().min(1, "Напишите текст сообщения").max(2000),
    imageMediaId: z.uuid().nullable().optional(),
    parentMessageId: z.uuid().nullable().optional(),
  })
  .refine((data) => data.parentMessageId || data.topic, {
    message: "Выберите тему",
    path: ["topic"],
  });

/**
 * The pinned banner (components/lounge/pinned-message-editor.tsx). An
 * empty string is valid here — the action treats it as "clear the
 * banner", same as the singleton row's `body` going back to null
 * (supabase/migrations/0014_lounge_pinned_message.sql).
 */
export const loungePinnedMessageSchema = z.object({
  body: z.string().trim().max(2000, "Слишком длинный текст"),
});
