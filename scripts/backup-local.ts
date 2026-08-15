/**
 * `npm run backup:local [папка]` (CLAUDE.md 18). Full local snapshot:
 * every application table to JSON, convenient CSVs for the tables people
 * actually want to eyeball, and every R2 object referenced by `media`.
 * Never touches remote data — read-only against Supabase and R2.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { loadEnvLocal } from "./lib/env";
import { createScriptSupabaseClient } from "./lib/supabase-admin";
import { toCsv } from "./lib/csv";
import { createScriptR2Client, downloadR2ObjectToFile, getScriptR2BucketName } from "./lib/r2";

loadEnvLocal();

const APP_TABLES = [
  "editors",
  "places",
  "people",
  "relationships",
  "media",
  "person_media",
  "site_settings",
  "pending_uploads",
] as const;

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\..+/, "");
}

function sha256OfFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  const errors: string[] = [];
  const destArg = process.argv[2];
  const backupRoot = destArg ? resolve(destArg) : resolve(process.cwd(), "backups");
  const backupDir = destArg ? backupRoot : join(backupRoot, timestampForPath(new Date()));

  if (existsSync(backupDir)) {
    console.error(`✗ Каталог бэкапа уже существует: ${backupDir}\n  Бэкап не перезаписывает существующие данные — укажите другую папку.`);
    process.exit(1);
  }
  mkdirSync(backupDir, { recursive: true });
  const dataDir = join(backupDir, "data");
  const csvDir = join(dataDir, "csv");
  const mediaDir = join(backupDir, "media");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(csvDir, { recursive: true });
  mkdirSync(mediaDir, { recursive: true });

  const { supabase, hasFullAccess } = createScriptSupabaseClient();

  console.log(`Бэкап в: ${backupDir}`);
  console.log(hasFullAccess ? "Доступ: service-role (полный)" : "Доступ: анонимный (частичный, см. предупреждение выше)");
  console.log("");

  const tableCounts: Record<string, number> = {};
  const tableRows: Partial<Record<(typeof APP_TABLES)[number], Record<string, unknown>[]>> = {};

  for (const table of APP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      errors.push(`Таблица ${table}: ${error.message}`);
      console.error(`✗ ${table}: ${error.message}`);
      continue;
    }
    const rows = data ?? [];
    tableRows[table] = rows;
    tableCounts[table] = rows.length;
    writeFileSync(join(dataDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
    console.log(`✓ ${table}: ${rows.length} записей`);
  }

  writeCsvExports(csvDir, tableRows);

  const mediaRows = tableRows.media ?? [];
  console.log("");
  console.log(`Файлы (R2): ${mediaRows.length}`);

  let downloadedCount = 0;
  let totalSizeBytes = 0;
  const mediaManifest: { objectKey: string; sizeBytes: number; sha256: string }[] = [];

  const r2Client = mediaRows.length > 0 ? createScriptR2Client() : null;
  const r2Bucket = mediaRows.length > 0 ? getScriptR2BucketName() : "";

  for (const row of mediaRows) {
    const objectKey = row.object_key as string;
    const destPath = join(mediaDir, objectKey);
    mkdirSync(resolve(destPath, ".."), { recursive: true });
    try {
      await downloadR2ObjectToFile(r2Client!, r2Bucket, objectKey, destPath);
      const sizeBytes = statSync(destPath).size;
      const sha256 = sha256OfFile(destPath);
      totalSizeBytes += sizeBytes;
      downloadedCount += 1;
      mediaManifest.push({ objectKey, sizeBytes, sha256 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Файл ${objectKey}: ${message}`);
      console.error(`✗ ${objectKey}: ${message}`);
    }
  }
  if (mediaRows.length > 0) {
    console.log(`✓ Скачано ${downloadedCount} из ${mediaRows.length}`);
  }

  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const appliedMigrations = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()
    : [];

  const manifest = {
    createdAt: new Date().toISOString(),
    fullAccess: hasFullAccess,
    schemaMigrations: appliedMigrations,
    tables: tableCounts,
    media: {
      totalCount: mediaRows.length,
      downloadedCount,
      totalSizeBytes,
      files: mediaManifest,
    },
    errors,
  };
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("");
  console.log(`Итог: ${Object.values(tableCounts).reduce((sum, n) => sum + n, 0)} записей в таблицах, ${downloadedCount} файлов (${formatBytes(totalSizeBytes)}).`);
  console.log(`Манифест: ${join(backupDir, "manifest.json")}`);

  if (errors.length > 0) {
    console.error(`\n✗ Бэкап завершён с ошибками (${errors.length}). Смотрите manifest.json → errors.`);
    process.exit(1);
  }
  console.log("\n✓ Бэкап завершён без ошибок.");
}

function writeCsvExports(
  csvDir: string,
  tableRows: Partial<Record<(typeof APP_TABLES)[number], Record<string, unknown>[]>>,
): void {
  const csvSpecs: { table: (typeof APP_TABLES)[number]; file: string; columns: string[] }[] = [
    {
      table: "people",
      file: "people.csv",
      columns: [
        "id",
        "display_name",
        "first_name",
        "middle_name",
        "last_name",
        "maiden_name",
        "is_placeholder",
        "is_deceased",
        "birth_date_precision",
        "birth_date_start",
        "birth_date_text",
        "death_date_precision",
        "death_date_start",
        "death_date_text",
        "profession",
        "education",
      ],
    },
    {
      table: "relationships",
      file: "relationships.csv",
      columns: ["id", "from_person_id", "to_person_id", "relationship_type", "parent_role", "note"],
    },
    {
      table: "places",
      file: "places.csv",
      columns: ["id", "name", "region", "country", "latitude", "longitude", "is_approximate"],
    },
    {
      table: "media",
      file: "media.csv",
      columns: [
        "id",
        "kind",
        "title",
        "caption",
        "original_filename",
        "object_key",
        "mime_type",
        "extension",
        "size_bytes",
        "width",
        "height",
      ],
    },
  ];

  for (const spec of csvSpecs) {
    const rows = tableRows[spec.table] ?? [];
    writeFileSync(join(csvDir, spec.file), toCsv(rows, spec.columns), "utf8");
  }
  console.log(`✓ CSV: ${csvSpecs.map((spec) => spec.file).join(", ")}`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

main().catch((error) => {
  console.error("✗ Бэкап прерван:", error instanceof Error ? error.message : error);
  process.exit(1);
});
