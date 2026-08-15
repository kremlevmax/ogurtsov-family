import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

/** R2 is S3-compatible; the SDK just needs the account-scoped endpoint and API token. */
export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 не настроен: заполните R2_ACCOUNT_ID, R2_ACCESS_KEY_ID и R2_SECRET_ACCESS_KEY в .env.local",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return cachedClient;
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME не задан в .env.local");
  }
  return bucket;
}
