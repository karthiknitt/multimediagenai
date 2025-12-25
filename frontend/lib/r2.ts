import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID) {
  throw new Error("R2_ACCOUNT_ID environment variable is not set");
}

if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error("R2_ACCESS_KEY_ID environment variable is not set");
}

if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2_SECRET_ACCESS_KEY environment variable is not set");
}

if (!process.env.R2_BUCKET_NAME) {
  throw new Error("R2_BUCKET_NAME environment variable is not set");
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );
}
