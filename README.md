# Семейное дерево Огурцовых

Публичный некоммерческий генеалогический сайт одной семьи: интерактивное
семейное дерево, страницы людей, фотографии и документы. Редактируют
только два заранее созданных пользователя. Подробные требования — в
[`CLAUDE.md`](./CLAUDE.md).

**Статус:** Этапы 0–6 реализованы в коде. Работает вживую: дерево,
поиск, боковая панель, страницы людей, вход двух редакторов, CRUD людей
и связей, загрузка фото/файлов в Cloudflare R2 (после настройки по
[`docs/SETUP_R2.md`](./docs/SETUP_R2.md)), sitemap/robots, локальный
бэкап и GEDCOM-экспорт. Развёртывание на Vercel — по
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md), выполняет владелец
сайта.

## Важно про приватность

Весь опубликованный контент, включая фотографии и документы, доступен
**любому посетителю без входа** и **индексируется поисковиками**
(Google, Bing). Не загружайте на сайт то, что не готовы показывать
публично.

## Стек

- Next.js 16 (App Router), TypeScript (strict), Tailwind CSS
- Supabase Postgres + Supabase Auth
- Cloudflare R2 для файлов + отдельный Cloudflare Worker для их публичной отдачи
- `@xyflow/react` + `elkjs` для дерева
- Vitest для unit-тестов

Полное описание — в [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Установка на Mac

Понадобится Node.js 20 или новее (проверялось на Node 24) и npm.

```bash
npm install
cp .env.example .env.local
```

Заполните `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — см.
  [`docs/SETUP_SUPABASE.md`](./docs/SETUP_SUPABASE.md), если ещё не
  настраивали проект;
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`, `NEXT_PUBLIC_MEDIA_BASE_URL` — см.
  [`docs/SETUP_R2.md`](./docs/SETUP_R2.md); без них дерево/страницы
  людей и вход всё равно работают, просто загрузка фото/файлов будет
  выдавать ошибку.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Локальный сервер разработки (`http://localhost:3000`) |
| `npm run lint` | Проверка ESLint |
| `npm run typecheck` | Проверка типов TypeScript |
| `npm run test` | Unit-тесты (Vitest) |
| `npm run build` | Production-сборка |
| `npm run preview` | Production-сборка + локальный запуск |
| `npm run worker:dev` | Локальный запуск Cloudflare Worker (отдача файлов) |
| `npm run worker:deploy` | Развёртывание Worker в Cloudflare |
| `npm run backup:local -- [папка]` | Локальный бэкап всех данных и файлов |
| `npm run backup:verify -- [папка]` | Проверка целостности бэкапа |
| `npm run export:gedcom -- [файл]` | Экспорт в GEDCOM (переносимость в другое ПО) |

Подробнее о бэкапе и восстановлении —
[`docs/BACKUP_AND_RESTORE.md`](./docs/BACKUP_AND_RESTORE.md).

## Структура проекта

Целевая структура каталогов описана в `CLAUDE.md`, раздел 6, и в
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Документация

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — обзор архитектуры
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — модель данных и SQL-схема
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — план по этапам
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — визуальный язык и токены
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — принятые решения по неясностям
- [`docs/SECURITY.md`](./docs/SECURITY.md) — модель безопасности
- [`docs/BACKUP_AND_RESTORE.md`](./docs/BACKUP_AND_RESTORE.md) — резервное копирование и восстановление
- [`docs/SETUP_SUPABASE.md`](./docs/SETUP_SUPABASE.md) — создание Supabase-проекта и двух редакторов
- [`docs/SETUP_R2.md`](./docs/SETUP_R2.md) — создание R2-бакета и Worker для файлов
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — развёртывание на Vercel и прод-чеклист

## Дальнейшие этапы

Все этапы из `CLAUDE.md`, раздел 22, реализованы в коде. Осталось
только развёртывание — шаги в [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md),
их выполняет владелец сайта (создание аккаунтов, домены, оплата).

Бесплатный проект Supabase может «засыпать» при отсутствии активности
и потребует восстановления через dashboard — это нормальное поведение
бесплатного плана, а не поломка. Для Cloudflare R2 может понадобиться
включить billing на аккаунте Cloudflare, даже если реальное
использование останется в рамках бесплатного лимита; этот шаг делаете
только вы сами.
