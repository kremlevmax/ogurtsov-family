import "server-only";
import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2BucketName } from "./client";

/** Short-lived — a fresh presigned URL is issued per upload attempt (CLAUDE.md 5.4). */
const PRESIGN_EXPIRY_SECONDS = 5 * 60;

/**
 * Presigned PUT URL scoped to exactly one object key and one Content-
 * Type. `originalFilename` is embedded as R2 custom metadata (never as
 * the object key) so the public worker can set Content-Disposition
 * without ever trusting a client-supplied path.
 */
export async function createPresignedUploadUrl(
  objectKey: string,
  contentType: string,
  originalFilename: string,
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
    ContentType: contentType,
    Metadata: { originalfilename: originalFilename },
  });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

/**
 * Direct server-side upload — for small derivative files (PDF card
 * thumbnails) that arrive as a Blob through a Server Action, unlike the
 * originals (up to 100 MiB), which always go browser-direct through a
 * presigned PUT (CLAUDE.md 5.4) rather than through the Next.js server.
 */
export async function putR2Object(objectKey: string, body: Uint8Array, contentType: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({ Bucket: getR2BucketName(), Key: objectKey, Body: body, ContentType: contentType }),
  );
}

export interface R2ObjectHead {
  sizeBytes: number;
  contentType: string | null;
}

export async function headR2Object(objectKey: string): Promise<R2ObjectHead | null> {
  const client = getR2Client();
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: getR2BucketName(), Key: objectKey }),
    );
    return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/** Reads just the first `byteCount` bytes — enough for a magic-byte check without downloading the whole file. */
export async function readR2ObjectHeadBytes(objectKey: string, byteCount: number): Promise<Uint8Array> {
  const client = getR2Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      Range: `bytes=0-${byteCount - 1}`,
    }),
  );
  const body = await result.Body?.transformToByteArray();
  return body ?? new Uint8Array();
}

export async function deleteR2Object(objectKey: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: objectKey }));
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "NotFound"
  );
}
