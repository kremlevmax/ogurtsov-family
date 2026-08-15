# Модель данных

Источник истины — SQL-миграции в `supabase/migrations/`. Этот документ
описывает модель словами и не должен расходиться со схемой; при
конфликте миграция главнее.

Миграции `0001_init.sql` и `0002_add_is_deceased.sql` применены к
проекту `ogurtsov-family` (`nyrabenbhgnktdwqjqjn.supabase.co`).

## Таблицы

### `editors`

Два заранее созданных редактора, привязанных к `auth.users`. Оба имеют
одинаковые права. `is_editor()` — security-definer функция,
используемая в RLS-политиках остальных таблиц, чтобы не читать
`editors` напрямую из каждой политики.

### `places`

Место с необязательными координатами. Публично читаемо, если не
удалено (`deleted_at is null`).

### `people`

Основная сущность. Поддерживает неточные даты рождения/смерти через
пару полей `*_date_precision` + `*_date_start/end/text` — та же схема,
что описана в CLAUDE.md 7.2 и реализована в `lib/dates/date-value.ts`
(`DateValue`). `display_name` обязателен всегда, включая
placeholder-записи вроде «Неизвестный отец» (`is_placeholder = true`).

Поиск: GIN-индексы с `pg_trgm` на `first_name`, `middle_name` (Этап 5,
`0003_add_middle_name_trgm_idx.sql`), `last_name`, `maiden_name`,
`display_name` — под `ILIKE`/trigram-поиск без полного скана
(CLAUDE.md, раздел 8). На практике поиск на Этапе 5 остаётся
клиентским поверх уже загруженного для дерева массива `people` (см.
`docs/DECISIONS.md`, Этап 5) — индексы задел на случай перехода на
запросы к БД, если объём дерева вырастет.

`is_deceased` (добавлено в `0002_add_is_deceased.sql`) — явный признак
«человек умер», независимый от точности даты смерти. Раньше «жив/умер»
вычислялось из наличия и точности `death_date_*`, что не позволяло
записать «точно умер, но дата смерти неизвестна». По умолчанию
`false`. Публичная карточка показывает графу «Смерть» только если
`is_deceased = true` — даже когда сама дата неизвестна.

`birth_place_id`/`death_place_id` в форме редактора вводятся как
обычный текст: сервер ищет существующую запись `places` с таким же
именем (без учёта регистра) или создаёт новую (`findOrCreatePlaceId`,
`server/repositories/places.ts`) — так выполняется требование CLAUDE.md
3.9 «место может быть простым текстом».

### `relationships`

`from_person_id` → `to_person_id`. Для родительских типов
(`biological_parent`, `adoptive_parent`, `foster_parent`, `guardian`)
`from` — родитель, `to` — ребёнок, и `parent_role` обязателен
(`mother`/`father`/`parent`). Для `spouse`/`former_spouse`/`partner`
`parent_role` должен быть `null` — это проверяет constraint
`relationships_parent_role_matches_type`.

Ограничения:

- `relationships_no_self` — запрещает связь человека с самим собой;
- `relationships_parent_unique_idx` — запрещает дубликат одной и той
  же родительской связи;
- `relationships_partner_unique_idx` — запрещает дубликат пары A–B и
  B–A для одного типа партнёрской связи (канонический порядок через
  `least`/`greatest`);
- триггер `relationships_prevent_cycle` — перед вставкой/обновлением
  родительской связи рекурсивно проверяет предков предполагаемого
  родителя и отклоняет запись, если предполагаемый ребёнок уже входит
  в их число («человек — собственный предок»).

Братья/сёстры **не хранятся** отдельной связью — вычисляются на лету
через общих родителей (`features/people/relations.ts#getSiblings`),
чтобы не создавать противоречивые данные.

### `media`

Одна запись на файл. `object_key` — UUID-based (`media/<uuid>.<ext>`),
никогда не совпадает с исходным именем файла (оно только в
`original_filename`, метаданные, попадает лишь в заголовок
`Content-Disposition`, который формирует `workers/media/index.ts`).
`size_bytes` ограничен constraint'ом `<= 104857600` (100 MiB) — то же
самое дополнительно проверяется на сервере до выдачи presigned URL и
повторно при finalize (`lib/validation/media.ts`, `server/actions/media.ts`).

`kind` определяется по расширению через allowlist
(`lib/validation/media.ts#ALLOWED_FILE_TYPES`), а не доверяется от
клиента.

### `person_media`

Связь many-to-many между людьми и файлами
(`server/repositories/media.ts`). `person_media_one_profile_idx` —
частичный уникальный индекс, гарантирующий не более одной активной
`is_profile = true` фотографии на человека; `setProfilePhoto()` сперва
снимает флаг с прежней фотографии в той же транзакции запросов.
Профильное фото человека резолвится в публичный URL и попадает в
`Person.photoUrl` (`server/repositories/people.ts`), используется на
дереве и в поиске.

### `site_settings`

Singleton-таблица (`id boolean primary key default true`,
constraint `check (id)` — вставить можно только одну строку с `id = true`).

### `pending_uploads`

Временная запись для двухэтапной загрузки: presign → прямой PUT в R2 →
finalize (HEAD + проверка + создание записи в `media`). Просроченные
`pending`-записи должны вычищаться отдельным скриптом (появится на
Этапе 4).

## RLS

Единое правило для всех прикладных таблиц:

- **SELECT** открыт анонимным пользователям, если `deleted_at is null`
  (или всегда для `site_settings`);
- **INSERT/UPDATE/DELETE** — только если `is_editor()` истинно, то есть
  `auth.uid()` присутствует в `editors`.

`pending_uploads` — исключение: редактор видит и меняет только свои
собственные записи (`editor_id = auth.uid()`).

## Известное упрощение

Уникальный индекс на партнёрскую связь не различает повторные браки с
одним и тем же человеком (A и B не могут иметь две отдельные записи
`spouse` одновременно, даже если разведались и поженились снова). Для
личного семейного сайта это разумное упрощение; при необходимости его
можно снять, добавив дату начала в состав индекса отдельной миграцией.
