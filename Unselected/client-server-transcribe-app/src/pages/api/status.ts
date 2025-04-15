import { type NextApiRequest, type NextApiResponse } from "next";
import { 
  TranscribeClient, 
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

const transcribeClient = new TranscribeClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
} as any);

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
} as any);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const jobName = req.query.jobName as string;

    if (!jobName) {
      return res.status(400).json({ error: "jobName is required" });
    }

    const getCommand = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    const response = await transcribeClient.send(getCommand);
    
    if (!response.TranscriptionJob) {
      return res.status(404).json({ error: "Transcription job not found" });
    }

    const jobStatus = response.TranscriptionJob.TranscriptionJobStatus;
    
    let transcriptText = null;
    if (
      jobStatus === "COMPLETED" && 
      response.TranscriptionJob.Transcript?.TranscriptFileUri
    ) {
      try {
        const transcriptUri = response.TranscriptionJob.Transcript.TranscriptFileUri;
        console.log("Transcript URI:", transcriptUri);
        let s3Key;
        if (transcriptUri.startsWith('s3://')) {
          const parts = transcriptUri.substring(5).split('/');
          parts.shift();
          s3Key = parts.join('/');
        } else {
          const url = new URL(transcriptUri);
          s3Key = url.pathname.substring(1);
          
          const bucketPrefixWithSlash = env.S3_BUCKET_NAME + '/';
          if (s3Key.startsWith(bucketPrefixWithSlash)) {
            s3Key = s3Key.substring(bucketPrefixWithSlash.length);
          }
        }
        
        console.log("Extracting from S3 key:", s3Key);
        
        const getObjectCommand = new GetObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: s3Key,
        });
        
        const { Body } = await s3Client.send(getObjectCommand);
        const bodyString = await streamToString(Body);
        const transcriptData = JSON.parse(bodyString);
        transcriptText = transcriptData.results.transcripts[0].transcript;
        
        console.log("Retrieved transcript:", transcriptText.substring(0, 100) + "...");
      } catch (error) {
        console.error("Error fetching transcript:", error);
        transcriptText = "Error retrieving transcript: " + (error instanceof Error ? error.message : String(error));
      }
    }

    return res.status(200).json({
      status: jobStatus,
      transcript: transcriptText,
      completedAt: response.TranscriptionJob.CompletionTime,
      details: {
        jobName: response.TranscriptionJob.TranscriptionJobName,
        languageCode: response.TranscriptionJob.LanguageCode,
        mediaFormat: response.TranscriptionJob.MediaFormat,
        mediaSampleRateHertz: response.TranscriptionJob.MediaSampleRateHertz,
        startedAt: response.TranscriptionJob.CreationTime,
        settings: response.TranscriptionJob.Settings,
      }
    });
  } catch (error) {
    console.error("Error checking transcription status:", error);
    return res.status(500).json({ error: "Failed to check transcription status" });
  }
}

function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}