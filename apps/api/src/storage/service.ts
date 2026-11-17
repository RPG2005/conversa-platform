import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from '../config.js';

export interface AttachmentStorage {
  createUploadUrl: (objectKey: string, contentType: string) => Promise<string>;
  inspectObject: (objectKey: string) => Promise<{ size: number; contentType: string | undefined }>;
  createDownloadUrl: (objectKey: string) => Promise<string>;
}

export const createAttachmentStorage = (config: AppConfig): AttachmentStorage => {
  const options: S3ClientConfig = {
    region: 'us-east-1',
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
  };
  const client = new S3Client({ ...options, endpoint: config.S3_PUBLIC_ENDPOINT });
  const internalClient = new S3Client({ ...options, endpoint: config.S3_INTERNAL_ENDPOINT });
  return {
    createUploadUrl: (objectKey, contentType) => getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: objectKey, ContentType: contentType }),
      { expiresIn: 300 },
    ),
    async inspectObject(objectKey) {
      const result = await internalClient.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: objectKey }));
      return { size: result.ContentLength ?? -1, contentType: result.ContentType };
    },
    createDownloadUrl: (objectKey) => getSignedUrl(client, new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: objectKey }), { expiresIn: 300 }),
  };
};
