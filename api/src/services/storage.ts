import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const client = new S3Client({
  endpoint: env.bucketUrl,
  region: 'auto',
  credentials: {
    accessKeyId: env.bucketAccessKeyId,
    secretAccessKey: env.bucketSecretAccessKey,
  },
  forcePathStyle: true,
});

const UPLOAD_URL_EXPIRES_SECONDS = 300; // 5 minutes to complete the upload
const DOWNLOAD_URL_EXPIRES_SECONDS = 3600; // 1 hour, per Railway's guidance

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
};

export function isAllowedImageContentType(contentType: string): boolean {
  return contentType in ALLOWED_CONTENT_TYPES;
}

export type UploadPurpose = 'find' | 'avatar';

const FOLDER_BY_PURPOSE: Record<UploadPurpose, string> = {
  find: 'finds',
  avatar: 'avatars',
};

export async function createUploadUrl(
  userId: string,
  contentType: string,
  purpose: UploadPurpose = 'find'
): Promise<{ uploadUrl: string; key: string }> {
  const ext = ALLOWED_CONTENT_TYPES[contentType];
  const key = `${FOLDER_BY_PURPOSE[purpose]}/${userId}/${randomUUID()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.bucketName, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_EXPIRES_SECONDS }
  );

  return { uploadUrl, key };
}

export function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: env.bucketName, Key: key }), {
    expiresIn: DOWNLOAD_URL_EXPIRES_SECONDS,
  });
}

// Uploads are keyed as `{folder}/{userId}/{uuid}.{ext}` (see createUploadUrl),
// so everything a user ever uploaded -- finds and avatar -- lives under these
// two prefixes. Deleting by prefix means we don't need to trust the DB rows
// (which are already gone by the time this runs) to enumerate what to remove.
export async function deleteUserPhotos(userId: string): Promise<void> {
  for (const folder of Object.values(FOLDER_BY_PURPOSE)) {
    const prefix = `${folder}/${userId}/`;
    let continuationToken: string | undefined;

    do {
      const listing = await client.send(
        new ListObjectsV2Command({ Bucket: env.bucketName, Prefix: prefix, ContinuationToken: continuationToken })
      );
      const keys = (listing.Contents ?? []).map((obj) => obj.Key).filter((key): key is string => !!key);

      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: env.bucketName,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          })
        );
      }

      continuationToken = listing.IsTruncated ? listing.NextContinuationToken : undefined;
    } while (continuationToken);
  }
}
