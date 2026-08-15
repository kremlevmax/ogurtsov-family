/**
 * `npm run backup:verify [папка]` (CLAUDE.md 18). Purely local integrity
 * check against a manifest.json produced by backup-local.ts — no network
 * calls, doesn't touch Supabase or R2.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

interface Manifest {
  createdAt: string;
  fullAccess: boolean;
  tables: Record<string, number>;
  media: {
    totalCount: number;
    downloadedCount: number;
    totalSizeBytes: number;
    files: { objectKey: string; sizeBytes: number; sha256: string }[];
  };
  errors: string[];
}

function findLatestBackupDir(): string | null {
  const root = resolve(process.cwd(), "backups");
  if (!existsSync(root)) return null;
  const entries = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const latest = entries.at(-1);
  return latest ? join(root, latest) : null;
}

function sha256OfFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main(): void {
  const argDir = process.argv[2];
  const backupDir = argDir ? resolve(argDir) : findLatestBackupDir();

  if (!backupDir || !existsSync(backupDir)) {
    console.error("✗ Каталог бэкапа не найден. Укажите путь явно: npm run backup:verify -- <папка>");
    process.exit(1);
  }

  const manifestPath = join(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`✗ manifest.json не найден в ${backupDir}`);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const problems: string[] = [];

  console.log(`Проверяю: ${backupDir}`);
  console.log(`Создан: ${manifest.createdAt}`);
  console.log("");

  for (const [table, expectedCount] of Object.entries(manifest.tables)) {
    const tablePath = join(backupDir, "data", `${table}.json`);
    if (!existsSync(tablePath)) {
      problems.push(`Таблица ${table}: файл data/${table}.json отсутствует`);
      continue;
    }
    const rows = JSON.parse(readFileSync(tablePath, "utf8"));
    if (!Array.isArray(rows) || rows.length !== expectedCount) {
      problems.push(`Таблица ${table}: ожидалось ${expectedCount} записей, найдено ${Array.isArray(rows) ? rows.length : "не массив"}`);
    } else {
      console.log(`✓ ${table}: ${rows.length} записей совпадает с манифестом`);
    }
  }

  console.log("");
  let checkedFiles = 0;
  for (const file of manifest.media.files) {
    const filePath = join(backupDir, "media", file.objectKey);
    if (!existsSync(filePath)) {
      problems.push(`Файл ${file.objectKey}: отсутствует на диске`);
      continue;
    }
    const actualSize = statSync(filePath).size;
    if (actualSize !== file.sizeBytes) {
      problems.push(`Файл ${file.objectKey}: размер не совпадает (ожидалось ${file.sizeBytes}, на диске ${actualSize})`);
      continue;
    }
    const actualSha256 = sha256OfFile(filePath);
    if (actualSha256 !== file.sha256) {
      problems.push(`Файл ${file.objectKey}: checksum не совпадает — файл повреждён или изменён`);
      continue;
    }
    checkedFiles += 1;
  }
  if (manifest.media.files.length > 0) {
    console.log(`✓ Файлы: ${checkedFiles} из ${manifest.media.files.length} прошли проверку checksum`);
  }

  if (manifest.errors.length > 0) {
    console.log("");
    console.log(`⚠ В самом манифесте отмечены ошибки при создании бэкапа (${manifest.errors.length}):`);
    for (const error of manifest.errors) console.log(`  - ${error}`);
  }

  console.log("");
  if (problems.length > 0) {
    console.error(`✗ Проверка не пройдена (${problems.length} проблем):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log("✓ Бэкап цел: все таблицы и файлы совпадают с манифестом.");
}

main();
