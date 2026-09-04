# Настройка Supabase (Этап 1)

Эти шаги выполняет владелец сайта вручную — Claude Code не может
создавать аккаунты или вводить пароли за вас (это касается и вашего
собственного пароля, и пароля мамы).

## 1. Создать проект

1. Зайдите на [supabase.com](https://supabase.com) и войдите или
   зарегистрируйтесь (бесплатно).
2. **New Project** → укажите имя, например `ogurtsov-family`, придумайте
   пароль базы данных (сохраните его в надёжном месте — он не совпадает
   с паролями редакторов) и выберите ближайший регион.
3. Дождитесь инициализации проекта (обычно 1–2 минуты).

Бесплатный проект Supabase может «засыпать» при долгом отсутствии
активности — это нормально, его нужно будет разбудить через dashboard,
без искусственного keepalive в обход правил сервиса.

## 2. Передать мне URL и публичный ключ

**Project Settings → API**:

- скопируйте **Project URL**;
- скопируйте ключ **anon public** (не `service_role`!).

Оба значения безопасны для передачи в чат и для браузера — доступ на
запись всё равно ограничен через Row Level Security, а не секретностью
этого ключа.

**Ключ `service_role` никому не передавайте** — ни мне, ни в код, ни в
`.env.local` без крайней необходимости. Он обходит RLS.

Заполните `.env.local` (скопирован из `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

## 3. Применить миграцию

Когда вы дадите явное разрешение, я применю
`supabase/migrations/0001_init.sql` одним из способов:

- вставить содержимое файла в **SQL Editor** в Supabase Dashboard и
  выполнить;
- или через Supabase CLI (`supabase link`, `supabase db push`), если
  он у вас установлен.

Я не буду делать этого без вашего отдельного «да» — это создание схемы
на реальном сервисе (CLAUDE.md, раздел 21).

## 4. Создать двух редакторов

**Authentication → Users → Add user**:

1. Создайте пользователя для себя: email + пароль по вашему выбору.
2. Создайте пользователя для мамы: её email + пароль по вашему выбору
   (который потом можно будет сменить).
3. Скопируйте **User UID** (это выглядит как
   `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) для каждого из двух
   созданных пользователей.

## 5. Добавить их в таблицу `editors`

Дайте мне оба UID и отображаемые имена (например «Максим» и «Мама») —
я подготовлю и, с вашего разрешения, выполню:

```sql
insert into editors (user_id, display_name) values
  ('<UID владельца>', 'Имя владельца'),
  ('<UID мамы>', 'Имя мамы');
```

## 6. Проверка

После этого на сайте должна заработать `/login`: вход по email и
паролю одного из двух редакторов открывает `/edit` с приветствием;
попытка зайти на `/edit` без входа перенаправляет на `/login`.

## 7. Письмо подтверждения email для регистрации в гостиной

Когда кто-то регистрируется на `/register` (раздел «Семейная
гостиная», код приглашения — `LOUNGE_INVITE_CODE`), Supabase сам
отправляет письмо со ссылкой подтверждения — по умолчанию оно на
английском и не объясняет, от какого сайта пришло. Замените текст
письма на понятный русский вариант:

**Authentication → Email Templates → Confirm signup**. Вставьте в поле
**Subject** и **Message body** то, что ниже, и сохраните.

Subject:

```
Подтвердите email — Семейная гостиная «Огурцовы»
```

Message body (HTML — Supabase принимает HTML прямо в этом поле;
`{{ .ConfirmationURL }}` — переменная Supabase, подставит настоящую
ссылку сама, менять её текст не нужно):

```html
<div style="background:#fbf8ef;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#4e5148;">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fcf9f1;border:1px solid #d8d0bb;border-radius:8px;">
    <tr>
      <td style="padding:32px 32px 8px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a7a;">
          Семейное дерево Огурцовых
        </p>
        <h1 style="margin:0 0 20px;font-size:20px;color:#304733;">Подтвердите свой email</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;text-align:left;">
          Здравствуйте! Этот адрес указали при регистрации в «Семейной гостиной» —
          разделе сайта, где родственники делятся новостями и воспоминаниями.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;text-align:left;">
          Чтобы подтвердить, что это ваш email, и завершить регистрацию, нажмите на кнопку ниже.
        </p>
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:12px 28px;background:#273c2d;color:#fbf8ef;text-decoration:none;border-radius:4px;font-size:15px;font-weight:bold;">
          Подтвердить email
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;text-align:left;color:#7a7d72;">
          Если вы не регистрировались на сайте семейного дерева Огурцовых — просто
          проигнорируйте это письмо, аккаунт не будет создан.
        </p>
      </td>
    </tr>
  </table>
</div>
```

Тот же приём подходит и для других шаблонов на той же странице (например,
**Reset Password**, если позже добавите восстановление пароля) — меняйте
только текст, `{{ .ConfirmationURL }}` (или соответствующую переменную
шаблона) не трогайте.

**Site URL и Redirect URLs** (там же, **Authentication → URL
Configuration**) должны включать домен сайта — иначе кнопка в письме
поведёт не туда. Пока сайт не задеплоен, добавьте
`http://localhost:3000` в Redirect URLs, чтобы подтверждение работало
локально; после деплоя добавьте туда и боевой домен.
