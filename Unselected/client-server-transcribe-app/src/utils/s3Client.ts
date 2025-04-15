import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { env } from "~/env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
} as any);

export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = `audio/${Date.now()}-${fileName}`;
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    },
  });

  await upload.done();
  
  return `s3://${env.S3_BUCKET_NAME}/${key}`;
}

export function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = {
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  };
  
  return Promise.resolve(`https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`);
}