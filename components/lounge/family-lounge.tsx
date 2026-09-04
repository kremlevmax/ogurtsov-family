"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { PhotoLightbox } from "@/components/media/photo-lightbox";
import { LOUNGE_TOPICS, LOUNGE_TOPIC_LABELS, type LoungeTopic } from "@/lib/validation/lounge";
import { formatLoungeMessageDate } from "@/lib/dates/format-lounge-message-date";
import { normalizeSearchText } from "@/features/search/normalize";
import { readImageDimensions, uploadWithProgress, UPLOAD_ACCEPT } from "@/lib/utils/upload";
import { createLoungeMessageAction, type LoungeMessageActionState } from "@/server/actions/lounge-messages";
import { presignLoungeAttachmentAction, finalizeLoungeAttachmentAction } from "@/server/actions/lounge-attachments";
import type { LoungeMessageRow } from "@/server/repositories/lounge";
import type { LoungeViewer } from "@/server/auth/require-lounge-member";
import { DeleteLoungeMessageButton } from "./delete-lounge-message-button";
import { LikeButton } from "./like-button";
import { PinnedMessageEditor } from "./pinned-message-editor";
import { ReplyComposer } from "./reply-composer";
import styles from "./family-lounge.module.css";
import {
  LOUNGE_ATTACH_LABEL,
  LOUNGE_COMPOSE_HINT,
  LOUNGE_COMPOSE_TITLE,
  LOUNGE_EYEBROW,
  LOUNGE_FEED_TITLE,
  LOUNGE_FILTERS_HINT,
  LOUNGE_FILTERS_TITLE,
  LOUNGE_MESSAGE_LABEL,
  LOUNGE_MESSAGE_PLACEHOLDER,
  LOUNGE_PUBLISH_LABEL,
  LOUNGE_REPLY_LABEL,
  LOUNGE_RULES_LINES,
  LOUNGE_RULES_TITLE,
  LOUNGE_SORT_LABEL,
  LOUNGE_SUBTITLE,
  LOUNGE_TITLE,
  LOUNGE_TOPIC_LABEL,
  LOUNGE_TOPIC_PLACEHOLDER,
} from "./fixtures";

type FilterId = "all" | LoungeTopic;

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Все сообщения" },
  ...LOUNGE_TOPICS.map((topic) => ({ id: topic, label: LOUNGE_TOPIC_LABELS[topic] })),
];

const initialComposeState: LoungeMessageActionState = { ok: false };

/** "Иван Огурцов" → "ИО" — same fallback shape whether it's a real name or the repository's "Участник гостиной" placeholder. */
function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

type AttachmentStatus = "idle" | "uploading" | "finalizing" | "error" | "done";

export interface FamilyLoungeProps {
  viewer: LoungeViewer;
  messages: LoungeMessageRow[];
  /** True if the feed failed to load (e.g. the DB migration isn't applied yet) — a distinct state from "no messages". */
  loadError?: boolean;
  /** The pinned banner's current text, null if nothing is pinned (server/repositories/lounge.ts's getLoungePinnedMessage). */
  pinnedMessage?: string | null;
}

/**
 * "Семейная гостиная" — ported from the Figma frame `2:19`
 * (ogurtsov-lounge-handoff), with owner-approved deviations from that
 * source: the top nav/logo is the shared `Header`, no surface uses a
 * plain white background, the compose hint wraps instead of clipping,
 * the content column matches the header's width — and now, the feed,
 * filters, and publish/delete flows run on real data (lounge_messages,
 * supabase/migrations/0007_add_lounge.sql) instead of the mockup's
 * three sample messages. See docs/DECISIONS.md for why registration
 * exists here at all (a deliberate, explicit departure from CLAUDE.md's
 * "no public registration" MVP default).
 *
 * Attachments upload for real (server/actions/lounge-attachments.ts —
 * same presign/finalize/R2 pipeline as the editor media flow, just
 * member-scoped) and avatars show initials from the author's real
 * name. Sort order, the author-name search the sidebar hint always
 * promised, and each card's topic are all real too now (owner's
 * requests, beyond the source design — that button had no second
 * state and that search field didn't exist in Figma at all).
 * "♡ Поддержать" is a real like now, renamed "Нравится" (owner's
 * request); "Ответить" opens a real single-level reply form
 * (0013_lounge_message_replies.sql) — none of this existed in the
 * source Figma design at all, which is why there's no "second state"
 * to match there either. The "ЗАКРЕПЛЕНО" banner (PinnedMessageEditor)
 * is likewise no longer fixed copy — an editor can create, edit and
 * delete it (0014_lounge_pinned_message.sql, owner's request).
 */
export function FamilyLounge({ viewer, messages, loadError = false, pinnedMessage = null }: FamilyLoungeProps) {
  const router = useRouter();
  const [activeFilterId, setActiveFilterId] = useState<FilterId>("all");
  const [openImageMessageId, setOpenImageMessageId] = useState<string | null>(null);
  const [openReplyMessageId, setOpenReplyMessageId] = useState<string | null>(null);
  const [authorQuery, setAuthorQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentStatus, setAttachmentStatus] = useState<AttachmentStatus>("idle");
  const [attachmentProgress, setAttachmentProgress] = useState(0);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [attachmentMediaId, setAttachmentMediaId] = useState<string | null>(null);
  const [composeState, composeFormAction, isComposePending] = useActionState(
    createLoungeMessageAction,
    initialComposeState,
  );

  // Pure state reset, safe to call during render (see the priorComposeState
  // block below) — refs can't be touched there (react-hooks/refs), so the
  // native file input's own value is cleared separately, only from the
  // "Убрать" button's event handler.
  function resetAttachmentState() {
    setAttachmentStatus("idle");
    setAttachmentProgress(0);
    setAttachmentError(null);
    setAttachmentFileName(null);
    setAttachmentMediaId(null);
  }

  function handleRemoveAttachment() {
    resetAttachmentState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAttachmentSelect(file: File | null) {
    if (!file) return;
    setAttachmentFileName(file.name);
    setAttachmentError(null);
    setAttachmentMediaId(null);
    setAttachmentStatus("uploading");
    setAttachmentProgress(0);

    const presignResult = await presignLoungeAttachmentAction({
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    if (!presignResult.ok || !presignResult.uploadUrl || !presignResult.pendingUploadId) {
      setAttachmentStatus("error");
      setAttachmentError(presignResult.error ?? "Не удалось подготовить загрузку.");
      return;
    }

    try {
      await uploadWithProgress(
        presignResult.uploadUrl,
        file,
        file.type || "application/octet-stream",
        setAttachmentProgress,
      );
    } catch (uploadError) {
      setAttachmentStatus("error");
      setAttachmentError(uploadError instanceof Error ? uploadError.message : "Загрузка не удалась.");
      return;
    }

    setAttachmentStatus("finalizing");
    const dimensions = await readImageDimensions(file);
    const finalizeResult = await finalizeLoungeAttachmentAction({
      pendingUploadId: presignResult.pendingUploadId,
      originalFilename: file.name,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    });
    if (!finalizeResult.ok || !finalizeResult.mediaId) {
      setAttachmentStatus("error");
      setAttachmentError(finalizeResult.error ?? "Не удалось сохранить файл.");
      return;
    }

    setAttachmentStatus("done");
    setAttachmentMediaId(finalizeResult.mediaId);
  }

  const isAttachmentBusy = attachmentStatus === "uploading" || attachmentStatus === "finalizing";

  // Clear the fields once a submission succeeds — adjusted during render
  // (React's documented pattern for "reset state when a prop/derived
  // value changes") rather than in an effect, to avoid the extra
  // render+effect cascade.
  const [priorComposeState, setPriorComposeState] = useState(composeState);
  if (composeState !== priorComposeState) {
    setPriorComposeState(composeState);
    if (composeState.ok) {
      setTopic("");
      setMessage("");
      resetAttachmentState();
    }
  }

  // A real refresh (not just revalidatePath() inside the action) —
  // same reason as DeleteLoungeMessageButton/LikeButton — kept in an
  // effect, not the render-phase block above, because it's a genuine
  // external-system side effect rather than a plain state reset.
  useEffect(() => {
    if (composeState.ok) router.refresh();
  }, [composeState, router]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterId, number> = { all: messages.length, news: 0, memories: 0, search: 0, thanks: 0 };
    for (const m of messages) counts[m.topic] += 1;
    return counts;
  }, [messages]);

  const visibleMessages = useMemo(() => {
    // `messages` arrives newest-first from the server (server/repositories/lounge.ts).
    const ordered = sortOrder === "oldest" ? [...messages].reverse() : messages;
    const byTopic = activeFilterId === "all" ? ordered : ordered.filter((m) => m.topic === activeFilterId);
    const normalizedQuery = normalizeSearchText(authorQuery);
    if (!normalizedQuery) return byTopic;
    return byTopic.filter((m) => normalizeSearchText(m.authorDisplayName).includes(normalizedQuery));
  }, [messages, activeFilterId, authorQuery, sortOrder]);

  const openImageMessage = messages.find((m) => m.id === openImageMessageId && m.attachment?.kind === "photo");

  return (
    // Header rendered OUTSIDE .root on purpose: .root's own reset rules
    // (`.root :where(button, input, ...) { font: inherit; color: inherit; }`,
    // below) are descendant selectors — CSS Modules only namespaces the
    // class name itself, not who ends up nested under it. With Header
    // as a child, its own button/link text was silently inheriting
    // .root's font/color instead of its own Tailwind classes (owner's
    // screenshot: "Выйти" rendering in a large serif font, only inside
    // the lounge — the home page's Header, not nested under any such
    // rule, was never affected). Keeping it a sibling instead removes
    // the problem outright, no matter what .root resets in the future.
    <div data-testid="family-lounge" data-design-ready="true">
      <Header />

      <div className={styles.root}>
      <div className={styles.hero} data-testid="lounge-hero">
        <p className={styles.eyebrow} data-testid="lounge-eyebrow">
          {LOUNGE_EYEBROW}
        </p>
        <h1 className={styles.title} data-testid="lounge-title">
          {LOUNGE_TITLE}
        </h1>
        <p className={styles.subtitle} data-testid="lounge-subtitle">
          {LOUNGE_SUBTITLE}
        </p>
      </div>

      <div className={styles.container}>
        <main className={styles.main}>
          <aside className={clsx(styles.surface, styles.filters)} data-testid="lounge-filters">
            <h2 className={styles.filtersTitle} data-testid="lounge-filters-title">
              {LOUNGE_FILTERS_TITLE}
            </h2>
            {FILTER_OPTIONS.map((filter) => {
              const isActive = filter.id === activeFilterId;
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={clsx(styles.filter, isActive && styles.filterActive)}
                  aria-pressed={isActive}
                  data-testid={`lounge-filter-${filter.id}`}
                  onClick={() => setActiveFilterId(filter.id)}
                >
                  <span className={clsx(styles.filterLabel, isActive && styles.filterLabelActive)}>
                    {filter.label}
                  </span>
                  <span className={clsx(styles.filterCount, isActive && styles.filterCountActive)}>
                    {filterCounts[filter.id]}
                  </span>
                </button>
              );
            })}
            <div className={styles.filtersDivider} data-testid="lounge-filters-divider" />
            <p className={styles.filtersHint} data-testid="lounge-filters-hint">
              {LOUNGE_FILTERS_HINT}
            </p>
            <input
              type="search"
              value={authorQuery}
              onChange={(event) => setAuthorQuery(event.target.value)}
              placeholder="Имя автора…"
              aria-label="Найти публикацию по имени автора"
              className={styles.authorSearch}
            />
          </aside>

          <section className={styles.feed} data-testid="lounge-feed" aria-label="Лента сообщений">
            <div className={styles.feedHeading} data-testid="lounge-feed-heading">
              <h2 className={styles.feedTitle} data-testid="lounge-feed-title">
                {LOUNGE_FEED_TITLE}
              </h2>
              <div className={styles.sortWrap}>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
                  aria-label="Порядок сортировки"
                  className={clsx(styles.control, styles.sort)}
                  data-testid="lounge-sort"
                >
                  <option value="newest">{LOUNGE_SORT_LABEL}</option>
                  <option value="oldest">Сначала старые</option>
                </select>
                <ChevronDown className={styles.sortIcon} aria-hidden="true" />
              </div>
            </div>

            <PinnedMessageEditor initialBody={pinnedMessage} isEditor={viewer.isEditor} />

            {loadError ? (
              <p className={clsx(styles.emptyState, styles.emptyStateError)}>
                Не удалось загрузить сообщения. Попробуйте обновить страницу.
              </p>
            ) : messages.length === 0 ? (
              <p className={styles.emptyState}>Здесь пока нет сообщений. Станьте первым, кто напишет в гостиную!</p>
            ) : visibleMessages.length === 0 ? (
              <p className={styles.emptyState}>В этой теме пока нет сообщений.</p>
            ) : (
              visibleMessages.map((post, index) => {
                const n = index + 1;
                return (
                  <article
                    key={post.id}
                    className={clsx(styles.surface, styles.message)}
                    data-testid={`lounge-message-${n}`}
                  >
                    <div className={styles.authorRow}>
                      <div className={styles.avatar} aria-hidden="true" data-testid={`lounge-message-${n}-avatar`}>
                        {initialsOf(post.authorFirstName, post.authorLastName)}
                      </div>
                      <div className={styles.authorBlock}>
                        <p className={styles.authorName} data-testid={`lounge-message-${n}-name`}>
                          {post.authorDisplayName}
                        </p>
                        <p className={styles.messageDate}>{formatLoungeMessageDate(post.createdAt)}</p>
                      </div>
                      <span className={styles.topicBadge}>{LOUNGE_TOPIC_LABELS[post.topic]}</span>
                    </div>
                    <p className={styles.messageText} data-testid={`lounge-message-${n}-text`}>
                      {post.body}
                    </p>
                    {post.attachment &&
                      (post.attachment.kind === "photo" ? (
                        <button
                          type="button"
                          className={styles.messageImageButton}
                          onClick={() => setOpenImageMessageId(post.id)}
                          title="Открыть изображение полностью"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- R2-hosted, arbitrary dimensions per upload; not worth Image's build-time optimization here. */}
                          <img src={post.attachment.url} alt="" className={styles.messageImage} loading="lazy" />
                        </button>
                      ) : (
                        <a
                          href={post.attachment.url}
                          download={post.attachment.filename}
                          className={styles.messageFile}
                        >
                          📎 {post.attachment.filename}
                        </a>
                      ))}
                    <div className={styles.actions}>
                      {viewer.isMember ? (
                        <button
                          type="button"
                          className={clsx(styles.actionButton, styles.actionReply)}
                          onClick={() => setOpenReplyMessageId((current) => (current === post.id ? null : post.id))}
                        >
                          {LOUNGE_REPLY_LABEL}
                        </button>
                      ) : (
                        <Link href="/lounge/login" className={clsx(styles.actionButton, styles.actionReply)}>
                          {LOUNGE_REPLY_LABEL}
                        </Link>
                      )}
                      <LikeButton
                        messageId={post.id}
                        liked={post.likedByViewer}
                        count={post.likeCount}
                        canLike={viewer.isMember}
                        className={styles.actionButton}
                        activeClassName={styles.actionLiked}
                        errorClassName={styles.errorText}
                      />
                      {post.canManage && (
                        <DeleteLoungeMessageButton
                          messageId={post.id}
                          buttonClassName={styles.actionButton}
                          errorClassName={styles.errorText}
                        />
                      )}
                    </div>

                    {openReplyMessageId === post.id && (
                      <ReplyComposer
                        parentMessageId={post.id}
                        onDone={() => setOpenReplyMessageId(null)}
                        formClassName={styles.replyForm}
                        textareaClassName={clsx(styles.input, styles.textarea, styles.replyTextarea)}
                        buttonRowClassName={styles.replyButtonRow}
                        submitClassName={clsx(styles.control, styles.controlPrimary, styles.replySubmit)}
                        cancelClassName={styles.replyCancel}
                        errorClassName={styles.errorText}
                      />
                    )}

                    {post.replies.length > 0 && (
                      <div className={styles.replyList}>
                        {post.replies.map((reply) => (
                          <div key={reply.id} className={styles.reply}>
                            <div className={styles.authorRow}>
                              <div className={styles.avatarSmall} aria-hidden="true">
                                {initialsOf(reply.authorFirstName, reply.authorLastName)}
                              </div>
                              <div className={styles.authorBlock}>
                                <p className={styles.authorName}>{reply.authorDisplayName}</p>
                                <p className={styles.messageDate}>{formatLoungeMessageDate(reply.createdAt)}</p>
                              </div>
                            </div>
                            <p className={styles.messageText}>{reply.body}</p>
                            <div className={styles.actions}>
                              <LikeButton
                                messageId={reply.id}
                                liked={reply.likedByViewer}
                                count={reply.likeCount}
                                canLike={viewer.isMember}
                                className={styles.actionButton}
                                activeClassName={styles.actionLiked}
                                errorClassName={styles.errorText}
                              />
                              {reply.canManage && (
                                <DeleteLoungeMessageButton
                                  messageId={reply.id}
                                  buttonClassName={styles.actionButton}
                                  errorClassName={styles.errorText}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>

          <aside className={styles.right} data-testid="lounge-right">
            {viewer.isMember ? (
              <form
                className={clsx(styles.surface, styles.compose)}
                data-testid="lounge-compose"
                action={composeFormAction}
              >
                <h2 className={styles.composeTitle} data-testid="lounge-compose-title">
                  {LOUNGE_COMPOSE_TITLE}
                </h2>
                <p className={styles.composeHint} data-testid="lounge-compose-hint">
                  {LOUNGE_COMPOSE_HINT}
                </p>

                <div className={styles.field} data-testid="lounge-topic-field">
                  <label className={styles.fieldLabel} htmlFor="lounge-topic">
                    {LOUNGE_TOPIC_LABEL}
                  </label>
                  <select
                    id="lounge-topic"
                    name="topic"
                    required
                    className={clsx(styles.input, styles.select, topic === "" && styles.placeholderShown)}
                    data-testid="lounge-topic-input"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                  >
                    <option value="" disabled>
                      {LOUNGE_TOPIC_PLACEHOLDER}
                    </option>
                    {LOUNGE_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {LOUNGE_TOPIC_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field} data-testid="lounge-message-field">
                  <label className={styles.fieldLabel} htmlFor="lounge-message">
                    {LOUNGE_MESSAGE_LABEL}
                  </label>
                  <textarea
                    id="lounge-message"
                    name="body"
                    required
                    className={clsx(styles.input, styles.textarea)}
                    data-testid="lounge-message-input"
                    placeholder={LOUNGE_MESSAGE_PLACEHOLDER}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  hidden
                  aria-hidden="true"
                  onChange={(event) => handleAttachmentSelect(event.target.files?.[0] ?? null)}
                />
                <input type="hidden" name="imageMediaId" value={attachmentMediaId ?? ""} />
                <button
                  type="button"
                  className={clsx(styles.control, styles.attach)}
                  data-testid="lounge-attach"
                  disabled={isAttachmentBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isAttachmentBusy ? "Загружаем…" : LOUNGE_ATTACH_LABEL}
                </button>

                {attachmentFileName && attachmentStatus !== "idle" && (
                  <p className={styles.attachmentStatus}>
                    {attachmentStatus === "uploading" && `Загружаем «${attachmentFileName}»… ${attachmentProgress}%`}
                    {attachmentStatus === "finalizing" && `Проверяем «${attachmentFileName}»…`}
                    {attachmentStatus === "done" && `Прикреплено: ${attachmentFileName}`}
                    {attachmentStatus === "error" && (attachmentError ?? "Не удалось прикрепить файл.")}
                    {attachmentStatus === "done" && (
                      <button type="button" className={styles.attachmentRemove} onClick={handleRemoveAttachment}>
                        Убрать
                      </button>
                    )}
                  </p>
                )}

                {composeState.error && (
                  <p className={styles.errorText} role="alert">
                    {composeState.error}
                  </p>
                )}

                <button
                  type="submit"
                  className={clsx(styles.control, styles.publish)}
                  data-testid="lounge-publish"
                  disabled={isComposePending || isAttachmentBusy}
                >
                  {isComposePending ? "Публикуем…" : LOUNGE_PUBLISH_LABEL}
                </button>
              </form>
            ) : (
              <div className={clsx(styles.surface, styles.compose)} data-testid="lounge-compose">
                <h2 className={styles.composeTitle}>{LOUNGE_COMPOSE_TITLE}</h2>
                <p className={styles.composeAuthGate}>
                  Чтобы опубликовать сообщение, войдите в аккаунт гостиной или зарегистрируйтесь по коду приглашения.
                </p>
                <div className={styles.composeAuthActions}>
                  <Link href="/lounge/login" className={styles.control}>
                    Войти
                  </Link>
                  <Link href="/lounge/register" className={clsx(styles.control, styles.controlPrimary)}>
                    Зарегистрироваться
                  </Link>
                </div>
              </div>
            )}

            <div className={clsx(styles.surface, styles.rules)} data-testid="lounge-rules">
              <h2 className={styles.rulesTitle} data-testid="lounge-rules-title">
                {LOUNGE_RULES_TITLE}
              </h2>
              <p className={styles.rulesText} data-testid="lounge-rules-text">
                {LOUNGE_RULES_LINES.map((line) => `• ${line}`).join("\n")}
              </p>
            </div>
          </aside>
        </main>
      </div>
      </div>

      {openImageMessage?.attachment && (
        <PhotoLightbox
          photos={[
            {
              id: openImageMessage.id,
              objectKey: openImageMessage.attachment.objectKey,
              title: openImageMessage.attachment.filename,
              caption: null,
            },
          ]}
          index={0}
          onClose={() => setOpenImageMessageId(null)}
          onIndexChange={() => {}}
        />
      )}
    </div>
  );
}
