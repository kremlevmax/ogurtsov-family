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
 * HTML styling deliberately mirrors the Supabase Auth email templates
 * (docs/SETUP_SUPABASE.md sections 7 and 9) so every email from the site
 * looks like it comes from the same place, even though these two are sent
 * by our own code instead of Supabase.
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

/** Every value below comes from a member (name, relation note) — escaped before going into HTML, unlike the Supabase templates which only ever interpolate Supabase's own ConfirmationURL. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:#273c2d;color:#fbf8ef;text-decoration:none;border-radius:4px;font-size:15px;font-weight:bold;">${label}</a>`;
}

/** Shared card shell — same colors/font as the Supabase-sent emails (docs/SETUP_SUPABASE.md), so the two families of email look consistent. `bodyHtml` is trusted, pre-built markup; escape any member-supplied text before it reaches here. */
function emailShell(heading: string, bodyHtml: string): string {
  return `<div style="background:#fbf8ef;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#4e5148;">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fcf9f1;border:1px solid #d8d0bb;border-radius:8px;">
    <tr>
      <td style="padding:32px 32px 8px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a7a;">
          Семейное дерево Огурцовых
        </p>
        <h1 style="margin:0 0 20px;font-size:20px;color:#304733;">${heading}</h1>
        ${bodyHtml}
      </td>
    </tr>
  </table>
</div>`;
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

  const fullName = `${request.firstName} ${request.lastName}`;

  const html = emailShell(
    "Новая заявка на доступ к дереву",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      <b>${escapeHtml(fullName)}</b> зарегистрировался(-ась) в «Семейной гостиной» без кода приглашения
      и просит доступ к добавлению людей в дерево.
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;text-align:left;">
      Email: ${escapeHtml(request.email)}
    </p>
    <div style="margin:0 0 24px;padding:14px 16px;background:#f4f0e2;border-left:3px solid #d8d0bb;text-align:left;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#8a8a7a;">
        Как связан(а) с родом Огурцовых
      </p>
      ${escapeHtml(request.relationNote).replace(/\n/g, "<br>")}
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;text-align:left;color:#7a7d72;">
      Войдите под своей редакторской учётной записью и откройте страницу редактора — там, в разделе
      «Заявки на доступ к дереву», можно одобрить или отклонить эту заявку.
    </p>
    ${emailButton(absoluteUrl("/edit"), "Открыть страницу редактора")}`,
  );

  const text = [
    `${fullName} зарегистрировался(-ась) в «Семейной гостиной» без кода приглашения`,
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
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: recipients,
    subject: `Новый участник без кода приглашения — ${fullName}`,
    text,
    html,
  });
}

export async function sendTreeAccessGrantedEmail(email: string, firstName: string): Promise<void> {
  const smtp = createTransport();
  if (!smtp) {
    console.error("sendTreeAccessGrantedEmail: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD не заданы — письмо не отправлено.");
    return;
  }

  const html = emailShell(
    "Доступ к дереву открыт",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      ${escapeHtml(firstName)}, здравствуйте! Вам открыт доступ к добавлению людей в семейное дерево Огурцовых.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;text-align:left;">
      Войдите в «Семейную гостиную» на сайте — теперь там доступны действия по добавлению родственников.
    </p>
    ${emailButton(absoluteUrl("/login"), "Войти в гостиную")}`,
  );

  const text = [
    `${firstName}, здравствуйте!`,
    "",
    "Вам открыт доступ к добавлению людей в семейное дерево Огурцовых.",
    "Войдите в «Семейную гостиную» на сайте — теперь там доступны действия по добавлению родственников:",
    absoluteUrl("/login"),
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: email,
    subject: "Доступ к дереву открыт",
    text,
    html,
  });
}
