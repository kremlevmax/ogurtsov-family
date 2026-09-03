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
 */
export const loungeRegisterSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
  firstName: z.string().trim().min(1, "Укажите имя").max(80),
  lastName: z.string().trim().min(1, "Укажите фамилию").max(80),
  inviteCode: z.string().trim().min(1, "Введите код приглашения"),
});

export const loungeSignInSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const loungeMessageSchema = z.object({
  topic: z.enum(LOUNGE_TOPICS, { message: "Выберите тему" }),
  body: z.string().trim().min(1, "Напишите текст сообщения").max(2000),
  imageMediaId: z.uuid().nullable().optional(),
});
