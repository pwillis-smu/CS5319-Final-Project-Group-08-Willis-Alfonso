import { type NextApiRequest, type NextApiResponse } from "next";
import { 
  TranscribeClient, 
  StartTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { env } from "~/env";

// Configure AWS Transcribe client
const transcribeClient = new TranscribeClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { s3Uri, jobName } = req.body;

    if (!s3Uri || !jobName) {
      return res.status(400).json({ error: "s3Uri and jobName are required" });
    }

    // Determine media format from S3 URI
    let fileExtension = s3Uri.split('.').pop()?.toLowerCase() || "mp3";
    
    // AWS Transcribe only accepts specific formats
    const validFormats = ["mp3", "mp4", "wav", "flac", "amr", "ogg", "webm", "m4a"];
    if (!validFormats.includes(fileExtension)) {
      // Default to mp3 if not a recognized format
      fileExtension = "mp3";
    }
    
    console.log(`Using media format: ${fileExtension} for file: ${s3Uri}`);
    
    // Start transcription job
    const startCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: s3Uri },
      LanguageCode: "en-US",
      MediaFormat: fileExtension,
      OutputBucketName: env.S3_BUCKET_NAME,
      OutputKey: `transcriptions/${jobName}/transcript`,
    });

    await transcribeClient.send(startCommand);

    return res.status(200).json({
      success: true,
      message: "Transcription job started",
      jobName,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: "Failed to start transcription" });
  }
}