# Безопасность

Проект публичный по содержимому, но приватный по редактированию. Ниже
— модель угроз и то, как она закрыта на каждом уровне.

## Публичность контента

Все опубликованные данные, включая фотографии и документы, доступны
без входа и индексируются поисковиками. Это осознанное решение
(CLAUDE.md, разделы 3.1 и 13) — не пытайтесь создать иллюзию
приватности отдельными UI-приёмами.

## Редактирование

- Только два заранее созданных пользователя (Supabase Auth,
  email/password), без публичной регистрации.
- Авторизация проверяется в двух независимых местах: на сервере
  (Server Action/Route Handler) и в базе (RLS). UI-скрытие кнопок —
  не механизм защиты, а только удобство.
- `is_editor()` — security-definer SQL-функция, на которую опираются
  все write-политики RLS (см. `docs/DATA_MODEL.md`).

## Заголовки безопасности

`lib/security/headers.ts`, подключены в `next.config.ts` для всех
маршрутов уже на Этапе 0:

- `Content-Security-Policy` — `default-src 'self'` и точечные
  разрешения; без wildcard-хостов. При подключении Supabase/R2/медиа-
  worker'а `connect-src`/`img-src` расширяются точными доменами, не
  `*`.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Файлы (Этап 4)

- Object key — UUID (`media/<uuid>.<ext>`), генерируется сервером
  (`server/actions/media.ts`), никогда не берётся из клиента и не
  совпадает с исходным именем файла (оно хранится только как metadata
  и как R2 custom metadata для `Content-Disposition`).
  `media.object_key` в схеме — `unique`.
- Presigned PUT URL создаётся только после серверной проверки активной
  editor-сессии (`requireEditor()`), короткоживущий (5 минут), привязан
  к одному key и одному Content-Type (`lib/r2/objects.ts`).
- Двухэтапная загрузка: `pending_uploads` → прямой PUT в R2 → finalize
  (HEAD-проверка размера/типа + ranged GET для magic-bytes) → запись в
  `media`. Провал проверки — объект удаляется из R2, `pending_uploads`
  помечается `failed`.
- `media.size_bytes` ограничен constraint'ом `<= 104857600` (100 MiB)
  на уровне схемы; та же граница проверяется в `lib/validation/media.ts`
  и при presign, и при finalize — не только в форме.
- Allowlist типов файлов (CLAUDE.md 3.8, `lib/validation/media.ts`)
  проверяется на сервере по расширению, заявленному MIME (должны
  совпадать) и — для распространённых форматов (изображения, PDF,
  ZIP-контейнеры вроде docx/xlsx/pptx/odt, mp3) — по фактическим
  magic bytes прочитанного из R2 файла. Двойное расширение
  (`photo.jpg.exe`) и опасные расширения где угодно в имени файла
  отклоняются безусловно.
- Content-Disposition для скачиваемых файлов формирует
  `workers/media/index.ts` с санитизацией имени (ASCII-фолбэк +
  RFC 5987 `filename*`) — не берётся из пользовательского ввода
  напрямую браузером.
- CSP `connect-src` разрешает загрузку строго на
  `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, `img-src` — на
  точный хост `NEXT_PUBLIC_MEDIA_BASE_URL`; оба вычисляются из
  переменных окружения, без wildcard (`lib/security/headers.ts`).

## Секреты

- `.env*` в `.gitignore`, кроме `.env.example` (без значений).
- Service-role key и R2 secret никогда не импортируются в клиентские
  компоненты; `lib/supabase/server.ts` защищён пакетом `server-only`,
  который ломает сборку при случайном клиентском импорте.
- Секретные server-модули помечены и импортируются только на сервере.

## Что ещё не сделано (по плану, не пропущено)

- Rate limiting для `/login` и upload-presign — бесплатный стек
  (Vercel Hobby) не даёт простого встроенного механизма; отложено до
  явной необходимости.
- CSRF-защита для cookie-based мутаций сверх того, что даёт Next.js
  Server Actions «из коробки» (same-origin проверка).
- CORS-политика R2-бакета настраивается владельцем сайта вручную через
  Cloudflare Dashboard (`docs/SETUP_R2.md`) — не код приложения; на
  боевой домен нужно будет добавить origin при развёртывании (Этап 6).
