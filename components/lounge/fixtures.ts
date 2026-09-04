/**
 * Static copy for the "Семейная гостиная" page — page chrome (headings,
 * hints, button labels, the pinned announcement, the rules panel) that
 * stays the same regardless of real data. Originally extracted verbatim
 * from ogurtsov-lounge-handoff/spec/copy-and-fixtures.json; the sample
 * filter counts and the three sample messages from that file are gone
 * now that lounge_messages (supabase/migrations/0007_add_lounge.sql) is
 * wired up — see server/repositories/lounge.ts for the real feed.
 */

export const LOUNGE_EYEBROW = "СЕМЕЙНОЕ ОБЩЕНИЕ";
export const LOUNGE_TITLE = "Семейная гостиная";
export const LOUNGE_SUBTITLE = "Место для новостей, воспоминаний, вопросов и тёплых слов родным";

export const LOUNGE_FILTERS_TITLE = "Показать";
export const LOUNGE_FILTERS_HINT = "Можно выбрать тему или найти публикацию по имени автора.";

export const LOUNGE_FEED_TITLE = "Последние сообщения";
export const LOUNGE_SORT_LABEL = "Сначала новые";

export const LOUNGE_PINNED_LABEL = "ЗАКРЕПЛЕНО";
// The fixed banner text is gone — PinnedMessageEditor
// (components/lounge/pinned-message-editor.tsx) reads/writes a real
// row instead (0014_lounge_pinned_message.sql, owner's request: an
// editor can create/edit/delete it).

export const LOUNGE_REPLY_LABEL = "Ответить";
// "♡ Поддержать" is gone — LikeButton (components/lounge/like-button.tsx)
// builds its own "♥/♡ Нравится · N" label instead (owner's rename).

export const LOUNGE_COMPOSE_TITLE = "Написать в гостиную";
export const LOUNGE_COMPOSE_HINT = "Поделитесь новостью, воспоминанием или задайте вопрос родным.";
export const LOUNGE_TOPIC_LABEL = "Тема";
export const LOUNGE_TOPIC_PLACEHOLDER = "Выберите тему";
export const LOUNGE_MESSAGE_LABEL = "Сообщение";
export const LOUNGE_MESSAGE_PLACEHOLDER = "Напишите несколько слов…";
export const LOUNGE_ATTACH_LABEL = "＋  Добавить фото или файл";
export const LOUNGE_PUBLISH_LABEL = "Опубликовать";

export const LOUNGE_RULES_TITLE = "Здесь говорят по-доброму";
export const LOUNGE_RULES_LINES = [
  "Подписывайте фотографии и документы",
  "Уважайте семейную историю",
  "Личные сведения живущих — только с согласия",
];
