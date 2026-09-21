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

/**
 * Text below is verbatim from the owner's approved package
 * (Документация_сайта.zip, "Автоматические сообщения.pdf" section 2) —
 * per that document's own rule 7 ("Изменение утверждённых сообщений
 * допускается только после утверждения владельцем проекта"), don't
 * reword this without the owner signing off again. The "Открыть
 * памятку" button links to /guide (app/(public)/guide/page.tsx) — the
 * same approved package's "Первые шаги в родословном дереве.pdf",
 * built as a live page rather than a PDF attachment per that
 * document's own instruction ("памятка хранится на сайте... PDF к
 * письму не прикрепляется").
 */
export async function sendTreeAccessGrantedEmail(email: string): Promise<void> {
  const smtp = createTransport();
  if (!smtp) {
    console.error("sendTreeAccessGrantedEmail: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD не заданы — письмо не отправлено.");
    return;
  }

  const html = emailShell(
    "Добро пожаловать в родословное дерево семьи Огурцовых!",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">Здравствуйте!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Мы рады сообщить, что Ваше родство подтверждено.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Теперь Вы стали <b>подтверждённым участником</b> проекта «Родословное дерево семьи Огурцовых» и можете
      принимать участие в его дальнейшем развитии.
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;text-align:left;">Теперь Вам доступны:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;text-align:left;">
      <li>создание новых карточек в своей ветви родословного дерева;</li>
      <li>редактирование карточек, созданных лично Вами;</li>
      <li>добавление фотографий и документов;</li>
      <li>установление родственных связей между членами семьи.</li>
    </ul>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;text-align:left;">
      Чтобы Вам было проще начать работу, мы подготовили небольшую памятку.
    </p>
    ${emailButton(absoluteUrl("/guide"), "Открыть памятку")}
    <p style="margin:24px 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Если во время работы возникнут вопросы, Вы всегда можете обратиться к администратору сайта.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;text-align:left;">
      Желаем Вам интересных открытий и благодарим за желание сохранить историю нашей семьи для будущих поколений.
    </p>`,
  );

  const text = [
    "Здравствуйте!",
    "",
    "Мы рады сообщить, что Ваше родство подтверждено.",
    "",
    "Теперь Вы стали подтверждённым участником проекта «Родословное дерево семьи Огурцовых» и можете принимать участие в его дальнейшем развитии.",
    "",
    "Теперь Вам доступны:",
    "- создание новых карточек в своей ветви родословного дерева;",
    "- редактирование карточек, созданных лично Вами;",
    "- добавление фотографий и документов;",
    "- установление родственных связей между членами семьи.",
    "",
    "Чтобы Вам было проще начать работу, мы подготовили небольшую памятку «Первые шаги в родословном дереве»:",
    absoluteUrl("/guide"),
    "",
    "Если во время работы возникнут вопросы, Вы всегда можете обратиться к администратору сайта.",
    "",
    "Желаем Вам интересных открытий и благодарим за желание сохранить историю нашей семьи для будущих поколений.",
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: email,
    subject: "Добро пожаловать в родословное дерево семьи Огурцовых!",
    text,
    html,
  });
}

export interface TreeAccessMoreInfoNotification {
  email: string;
  message: string;
}

/**
 * "Запросить дополнительные сведения" (owner decision, 2026-09-20) —
 * not part of the approved SiteMessages v1.0 package, so this text is
 * drafted in-house following that package's house style (Автоматические
 * сообщения.pdf: приветствие, подпись, доброжелательный тон). The
 * button sends the member to answer in their own panel
 * (components/lounge/tree-access-request-form.tsx), not by replying to
 * the email directly.
 */
export async function sendTreeAccessMoreInfoRequestedEmail(request: TreeAccessMoreInfoNotification): Promise<void> {
  const smtp = createTransport();
  if (!smtp) {
    console.error("sendTreeAccessMoreInfoRequestedEmail: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD не заданы — письмо не отправлено.");
    return;
  }

  const html = emailShell(
    "Нужны уточнения по заявке",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">Здравствуйте!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Мы рассматриваем Вашу заявку на подтверждение родства в проекте «Родословное дерево семьи Огурцовых» — и
      хотели бы уточнить несколько деталей.
    </p>
    <div style="margin:0 0 20px;padding:14px 16px;background:#f4f0e2;border-left:3px solid #d8d0bb;text-align:left;font-size:15px;line-height:1.6;">
      ${escapeHtml(request.message).replace(/\n/g, "<br>")}
    </div>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;text-align:left;">
      Пожалуйста, ответьте в своём личном кабинете на сайте — там же можно приложить фотографии или документы,
      если они у Вас есть.
    </p>
    ${emailButton(absoluteUrl("/join"), "Ответить на сайте")}`,
  );

  const text = [
    "Здравствуйте!",
    "",
    "Мы рассматриваем Вашу заявку на подтверждение родства в проекте «Родословное дерево семьи Огурцовых» — и хотели бы уточнить несколько деталей.",
    "",
    request.message,
    "",
    "Пожалуйста, ответьте в своём личном кабинете на сайте — там же можно приложить фотографии или документы:",
    absoluteUrl("/join"),
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: request.email,
    subject: "Нужны уточнения по вашей заявке на подтверждение родства",
    text,
    html,
  });
}

export interface TreeAccessInfoProvidedNotification {
  firstName: string;
  lastName: string;
  reply: string;
}

/** Tells the editors a member answered a "Запросить дополнительные сведения" request — mirrors sendTreeAccessRequestNotification's shape, just for the follow-up round instead of the first submission. */
export async function sendTreeAccessInfoProvidedNotification(notification: TreeAccessInfoProvidedNotification): Promise<void> {
  const recipients = process.env.NOTIFY_EDITOR_EMAILS?.split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  const smtp = createTransport();
  if (!smtp || !recipients || recipients.length === 0) {
    console.error(
      "sendTreeAccessInfoProvidedNotification: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD/NOTIFY_EDITOR_EMAILS не заданы — письмо не отправлено.",
    );
    return;
  }

  const fullName = `${notification.firstName} ${notification.lastName}`;

  const html = emailShell(
    "Дополнительные сведения по заявке",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      <b>${escapeHtml(fullName)}</b> предоставил(а) дополнительные сведения по заявке на подтверждение родства.
    </p>
    <div style="margin:0 0 24px;padding:14px 16px;background:#f4f0e2;border-left:3px solid #d8d0bb;text-align:left;font-size:14px;line-height:1.6;">
      ${escapeHtml(notification.reply).replace(/\n/g, "<br>")}
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;text-align:left;color:#7a7d72;">
      Заявка снова ожидает рассмотрения — откройте страницу редактора, чтобы принять решение.
    </p>
    ${emailButton(absoluteUrl("/edit"), "Открыть страницу редактора")}`,
  );

  const text = [
    `${fullName} предоставил(а) дополнительные сведения по заявке на подтверждение родства:`,
    "",
    notification.reply,
    "",
    "Заявка снова ожидает рассмотрения — откройте страницу редактора:",
    absoluteUrl("/edit"),
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: recipients,
    subject: `Дополнительные сведения по заявке — ${fullName}`,
    text,
    html,
  });
}

/**
 * "Родство не подтверждено" (owner decision, 2026-09-20) — same
 * house-style caveat as sendTreeAccessMoreInfoRequestedEmail above:
 * the approved package (Работа администратора.pdf, section 3) leaves
 * this text unwritten on purpose ("текст такого сообщения в
 * окончательный состав SiteMessages v1.0 не включён"), so this is
 * drafted in-house rather than transcribed.
 */
export async function sendTreeAccessRejectedEmail(email: string): Promise<void> {
  const smtp = createTransport();
  if (!smtp) {
    console.error("sendTreeAccessRejectedEmail: SMTP_EMAIL_USER/SMTP_EMAIL_PASSWORD не заданы — письмо не отправлено.");
    return;
  }

  const html = emailShell(
    "О заявке на подтверждение родства",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">Здравствуйте!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Благодарим Вас за заявку на подтверждение родства в проекте «Родословное дерево семьи Огурцовых».
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      К сожалению, на основании имеющихся сведений подтвердить родственную связь пока не удалось.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
      Вы по-прежнему можете пользоваться сайтом в статусе «Гость»: писать сообщения в Семейной гостиной и
      знакомиться с родословным деревом.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;text-align:left;">
      Если у Вас появятся новые сведения или документы, Вы можете подать заявку ещё раз в любое время.
    </p>
    ${emailButton(absoluteUrl("/join"), "Подать заявку заново")}`,
  );

  const text = [
    "Здравствуйте!",
    "",
    "Благодарим Вас за заявку на подтверждение родства в проекте «Родословное дерево семьи Огурцовых».",
    "",
    "К сожалению, на основании имеющихся сведений подтвердить родственную связь пока не удалось.",
    "",
    "Вы по-прежнему можете пользоваться сайтом в статусе «Гость»: писать сообщения в Семейной гостиной и знакомиться с родословным деревом.",
    "",
    "Если у Вас появятся новые сведения или документы, Вы можете подать заявку ещё раз в любое время:",
    absoluteUrl("/join"),
  ].join("\n");

  await smtp.transporter.sendMail({
    from: smtp.user,
    to: email,
    subject: "О заявке на подтверждение родства",
    text,
    html,
  });
}
