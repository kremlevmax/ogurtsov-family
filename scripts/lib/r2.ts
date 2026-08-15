/**
 * Standalone R2 client for scripts — deliberately not importing
 * `lib/r2/*`: those files start with `import "server-only"`, which
 * unconditionally throws outside a bundler that resolves the
 * `react-server` export condition (Next.js does; plain `tsx`/Node
 * doesn't). Same isolation reasoning as `workers/media`'s separate
 * tsconfig — small, deliberate duplication beats fighting the guard.
 */
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export function createScriptR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 не настроен: заполните R2_ACCOUNT_ID, R2_ACCESS_KEY_ID и R2_SECRET_ACCESS_KEY в .env.local");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getScriptR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME не задан в .env.local");
  return bucket;
}

export async function downloadR2ObjectToFile(client: S3Client, bucket: string, objectKey: string, destPath: string): Promise<void> {
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
  if (!result.Body) throw new Error(`Пустое тело ответа R2 для ${objectKey}`);
  await pipeline(result.Body as NodeJS.ReadableStream, createWriteStream(destPath));
}
