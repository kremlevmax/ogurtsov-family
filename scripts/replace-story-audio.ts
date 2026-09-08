/**
 * `npm run story:replace-audio -- <путь к файлу>` — заменяет
 * аудиозапись «История, рассказанная вслух» на /story
 * (components/media/story-audio-player.tsx,
 * server/repositories/media.ts's listUnlistedAudio) на новый файл: та
 * же строка `media` (kind=audio, unlisted=true), но новый R2-объект.
 *
 * Требует ровно одну такую запись — если их ноль или больше одной,
 * останавливается и печатает список, чтобы не гадать, какую заменять.
 * Старый R2-объект удаляется только после того, как обновление строки
 * в базе прошло успешно.
 */
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { loadEnvLocal } from "./lib/env";
import { createScriptSupabaseClient } from "./lib/supabase-admin";
import { createScriptR2Client, getScriptR2BucketName } from "./lib/r2";

loadEnvLocal();

const MIME_BY_EXTENSION: Record<string, string> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

async function main() {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    console.error("Использование: npm run story:replace-audio -- <путь к файлу>");
    process.exit(1);
  }

  const filePath = resolve(filePathArg);
  if (!existsSync(filePath)) {
    console.error(`Файл не найден: ${filePath}`);
    process.exit(1);
  }

  const extension = extname(filePath).slice(1).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    console.error(`Неподдерживаемое расширение «.${extension}». Ожидается одно из: ${Object.keys(MIME_BY_EXTENSION).join(", ")}`);
    process.exit(1);
  }

  const { supabase, hasFullAccess } = createScriptSupabaseClient();
  if (!hasFullAccess) {
    console.error("Нужен SUPABASE_SERVICE_ROLE_KEY в .env.local — без него не видно всех строк media.");
    process.exit(1);
  }

  const { data: rows, error } = await supabase
    .from("media")
    .select("id, object_key, title, original_filename")
    .eq("kind", "audio")
    .eq("unlisted", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (!rows || rows.length !== 1) {
    console.error(
      `Ожидалась ровно одна запись аудио истории (kind=audio, unlisted=true), найдено: ${rows?.length ?? 0}.`,
    );
    for (const row of rows ?? []) {
      console.error(`  - ${row.id}: «${row.title}» (${row.object_key})`);
    }
    console.error("Уточните вручную, какую запись заменить, и при необходимости адаптируйте скрипт.");
    process.exit(1);
  }

  const existing = rows[0];
  const fileBuffer = readFileSync(filePath);
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");
  const newObjectKey = `media/${randomUUID()}.${extension}`;
  const originalFilename = filePathArg.split("/").pop() ?? filePathArg;

  console.log(`Заменяю аудио «${existing.title}» (${existing.id})`);
  console.log(`  старый объект: ${existing.object_key}`);
  console.log(`  новый объект:  ${newObjectKey}`);
  console.log(`  размер:        ${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)} МБ`);

  const r2 = createScriptR2Client();
  const bucket = getScriptR2BucketName();

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: newObjectKey,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: { originalfilename: originalFilename },
    }),
  );
  console.log("Новый файл загружен в R2.");

  const { error: updateError } = await supabase
    .from("media")
    .update({
      object_key: newObjectKey,
      original_filename: originalFilename,
      mime_type: mimeType,
      extension,
      size_bytes: fileBuffer.byteLength,
      sha256,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Не удалось обновить запись в базе — старый R2-объект НЕ тронут, новый остался неиспользуемым:", newObjectKey);
    throw updateError;
  }
  console.log("Запись в базе обновлена.");

  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: existing.object_key }));
  console.log("Старый файл удалён из R2.");

  console.log("Готово — на /story теперь новая аудиозапись.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
