import "server-only";
import nodemailer from "nodemailer";

/**
 * The only bespoke (non-Supabase-Auth) email this site sends: tells both
 * editors a member registered without an invite code and wants tree-editing
 * access (server/actions/lounge-auth.ts), and tells that member back once an
 * editor approves it (server/actions/tree-access.ts). Reuses the exact same
 * Gmail account/app-password already configured as Supabase's own Custom
 * SMTP (docs/SETUP_SUPABASE.md) — no new email provider, no new account to
 * set up, just the same credentials also read here as
 * SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD (.env.example).
 *
 * Best-effort throughout: a failed send is logged and swallowed by the
 * caller, never allowed to break the registration/approval it followed.
 */

function createTransport() {
  const user = process.env.SMTP_EMAIL_USER;
  const pass = process.env.SMTP_EMAIL_PASSWORD;
  if (!user || !pass) return null;
  return { user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

/** NEXT_PUBLIC_SITE_URL already exists for SEO absolute links (.env.example) — reused here so email links are clickable instead of a bare path. */
function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}${path}`;
}

export interface TreeAccessRequestNotification {
  firstName: string;
  lastName: string;
  email: string;
  relationNote: string;
}

export async function sendTreeAccessRequestNotification(request: TreeAccessRequestNotification): Promise<void> {
  const recipients = process.env.NOTIFY_EDITOR_EMAILS?.split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  const smtp = createTransport();
  if (!smtp || !recipients || recipients.length === 0) {
    console.error(
      "sendTreeAccessRequestNotification: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD/NOTIFY_EDITOR_EMAILS не заданы — письмо не отправлено.",
    );
    return;
  }

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: recipients,
    subject: `Новый участник без кода приглашения — ${request.firstName} ${request.lastName}`,
    text: [
      `${request.firstName} ${request.lastName} зарегистрировался(-ась) в «Семейной гостиной» без кода приглашения`,
      `и просит доступ к добавлению людей в дерево.`,
      "",
      `Email: ${request.email}`,
      "",
      "Как связан(а) с родом Огурцовых:",
      request.relationNote,
      "",
      "Войдите на сайт под своей редакторской учётной записью и откройте страницу редактора —",
      "там в разделе «Заявки на доступ к дереву» будут кнопки «Одобрить» и «Отклонить»:",
      absoluteUrl("/edit"),
    ].join("\n"),
  });
}

export async function sendTreeAccessGrantedEmail(email: string, firstName: string): Promise<void> {
  const smtp = createTransport();
  if (!smtp) {
    console.error("sendTreeAccessGrantedEmail: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD не заданы — письмо не отправлено.");
    return;
  }

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: email,
    subject: "Доступ к дереву открыт",
    text: [
      `${firstName}, здравствуйте!`,
      "",
      "Вам открыт доступ к добавлению людей в семейное дерево Огурцовых.",
      "Войдите в «Семейную гостиную» на сайте — теперь там доступны действия по добавлению родственников:",
      absoluteUrl("/login"),
    ].join("\n"),
  });
}
