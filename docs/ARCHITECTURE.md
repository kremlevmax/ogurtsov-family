# Архитектура

## Обзор

Next.js 16 (App Router) — единственное приложение. Публичные страницы
и редакторские маршруты живут в одном проекте, но разделены route
group'ами `(public)` и `(auth)` плюс каталогом `edit/`. База данных и
авторизация — Supabase Postgres/Auth. Файлы — Cloudflare R2, отдаются
через отдельный минимальный Cloudflare Worker. Next.js никогда не
проксирует крупные файлы через себя: браузер загружает их напрямую в
R2 через presigned URL.

```
Браузер
  │
  ├─ Next.js (Vercel) ── чтение/запись через RLS ──▶ Supabase Postgres
  │                                                    (+ Supabase Auth)
  │
  ├─ прямой PUT presigned URL ───────────────────▶ Cloudflare R2
  │
  └─ GET файлов ──────────────────────────────────▶ Cloudflare Worker ──▶ R2
```

## Текущее состояние (Этапы 0–6)

- Supabase подключён и применён (`docs/SETUP_SUPABASE.md`): дерево,
  поиск, страницы людей, вход двух редакторов, CRUD людей/связей — всё
  на реальных данных.
- R2 и Worker настроены и проверены вживую (`lib/r2/`,
  `server/actions/media.ts`, `workers/media/`, `docs/SETUP_R2.md`).
- `sitemap.xml`/`robots.txt`, офлайн-баннер и WCAG-проверка палитры —
  Этап 5.
- Локальный бэкап, GEDCOM-экспорт и инструкция по развёртыванию —
  Этап 6, см. `scripts/` ниже и `docs/DEPLOYMENT.md`.

## Слои

- `app/` — маршруты App Router. Серверные компоненты по умолчанию;
  `"use client"` только там, где нужна интерактивность (поиск, дерево,
  формы).
- `components/` — переиспользуемые UI-компоненты, разбитые по домену
  (`tree`, `people`, `layout`, `ui`, `forms`).
- `features/` — доменная логика конкретной функции: построение графа
  дерева (`features/tree`), поиск (`features/search`), связи людей
  (`features/people`), типы медиа (`features/media`). Чистые функции,
  тестируются без React.
- `lib/` — сквозные утилиты без UI: даты (`lib/dates`), имена
  (`lib/names`), Zod-валидация (`lib/validation`), Supabase-клиенты
  (`lib/supabase`), заголовки безопасности (`lib/security`), R2-клиент
  и presign (`lib/r2`).
- `server/` — `repositories/` (Supabase-запросы), `actions/` (Server
  Actions с проверкой авторизации), `auth/` (`requireEditor`).
- `supabase/migrations/` — SQL-миграции, единственный источник истины
  для схемы.
- `workers/media/` — отдельный Cloudflare Worker, деплоится независимо
  от основного приложения (`npm run worker:deploy`); исключён из
  `tsconfig.json` основного приложения (свой `tsconfig.json` со
  `@cloudflare/workers-types`).
- `scripts/` — операционные скрипты вне рантайма приложения
  (`backup-local.ts`, `verify-backup.ts`, `export-gedcom.ts`), запускаются
  через `tsx`. Собственный минимальный Supabase/R2-клиент в
  `scripts/lib/` вместо переиспользования `lib/supabase`/`lib/r2` —
  те файлы помечены `import "server-only"`, который безусловно бросает
  исключение вне бандлера Next.js (см. `docs/DECISIONS.md`, Этап 6).

## Дерево: доменная модель → граф

`features/tree/build-graph.ts` — чистая функция без побочных эффектов:
принимает список людей и связей и строит граф из person-узлов и
промежуточных family-unit узлов (по одному на пару родителей/партнёров
и связанных с ними детей). Она не знает о React Flow и не выполняет
layout — это чтобы её было легко тестировать (см.
`tests/unit/build-graph.test.ts`).

`features/tree/layout.ts` берёт этот граф и вызывает ELK
(`elkjs/lib/elk.bundled.js`, top-to-bottom layered layout) для
вычисления координат. `features/tree/to-react-flow.ts` объединяет оба
шага и отдаёт узлы/рёбра в формате `@xyflow/react`.

Family-unit узлы — служебные: они не резолвятся как реальные люди
(`components/tree/family-unit-node.tsx` рендерит только маленькую
точку без ссылки).

## SEO и маршрутизация

Маршруты (CLAUDE.md, раздел 9) — все реализованы:

- `/` — дерево и поиск, клик по узлу открывает боковую панель;
- `/?person=<uuid>` — дерево с открытой панелью, восстанавливается по
  прямой ссылке;
- `/people/<uuid>` — индексируемая страница человека (та же вёрстка,
  что и в панели, через общий `components/people/person-detail-content.tsx`);
- `/login` — вход редакторов, `noindex`;
- `/edit`, `/edit/people/<uuid>`, `/edit/people/new` — редакторские
  формы, `noindex`.

Панель на `/` управляется полностью на клиенте
(`components/tree/family-tree-explorer.tsx`): URL меняется через
`window.history.pushState`, а не `router.push`, чтобы открытие панели
не вызывало повторный запрос к Supabase и не сбрасывало pan/zoom
дерева (подробнее — `docs/DECISIONS.md`, Этап 3).

## Загрузка файлов

Двухэтапный поток (CLAUDE.md 5.4), полностью в Server Actions
(`server/actions/media.ts`):

1. **`presignUploadAction`** — проверяет сессию редактора, валидирует
   имя/MIME/размер файла по allowlist (`lib/validation/media.ts`),
   создаёт UUID-based `object_key`, строку в `pending_uploads` и
   короткоживущий (5 минут) presigned PUT URL, скованный одним ключом
   и одним `Content-Type`.
2. Браузер грузит файл **напрямую в R2** (`XMLHttpRequest`, чтобы
   показывать прогресс — `fetch` этого не умеет).
3. **`finalizeUploadAction`** — делает HEAD в R2, повторно проверяет
   размер/тип, читает первые байты через ranged GET и сверяет
   magic-bytes для распространённых форматов, создаёт запись `media` и
   привязку `person_media`. Провал любой проверки — объект в R2
   удаляется, `pending_uploads.status` помечается `failed`.

Публично файлы отдаёт `workers/media/index.ts` через R2-биндинг
(без прохождения через сам Next.js) — inline для изображений (кроме
TIFF), `attachment` для всего остального.

## Безопасность на уровне приложения

`next.config.ts` подключает `lib/security/headers.ts` — CSP,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` — применяются глобально уже на Этапе 0. `CSP`
`connect-src`/`img-src` придётся расширить точными хостами Supabase и
медиа-worker'а на следующих этапах — без wildcard'ов.

Подробнее — в [`SECURITY.md`](./SECURITY.md).
