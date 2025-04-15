import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { env } from "~/env";

// Create S3 client
export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to S3
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file in S3
 * @param contentType - The content type of the file
 * @returns The S3 URI of the uploaded file
 */
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

/**
 * Get a signed URL for an S3 object
 * @param key - The S3 key of the object
 * @param expiresIn - The time in seconds that the URL will be valid for
 * @returns The signed URL
 */
export function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = {
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  };
  
  // This is a placeholder - in a real app, you would use the proper AWS SDK method:
  // return getSignedUrl(s3Client, new GetObjectCommand(command), { expiresIn });
  
  // For this demo, we'll return a mock URL
  return Promise.resolve(`https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`);
}