import { type NextApiRequest, type NextApiResponse } from "next";
import { 
  TranscribeClient, 
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

// Configure AWS clients
const transcribeClient = new TranscribeClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Client = new S3Client({
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const jobName = req.query.jobName as string;

    if (!jobName) {
      return res.status(400).json({ error: "jobName is required" });
    }

    // Get transcription job status
    const getCommand = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    const response = await transcribeClient.send(getCommand);
    
    if (!response.TranscriptionJob) {
      return res.status(404).json({ error: "Transcription job not found" });
    }

    const jobStatus = response.TranscriptionJob.TranscriptionJobStatus;
    
    // If the job is complete and we have a transcript file, fetch it
    let transcriptText = null;
    if (
      jobStatus === "COMPLETED" && 
      response.TranscriptionJob.Transcript?.TranscriptFileUri
    ) {
      try {
        // Extract the S3 key from the S3 URI provided by AWS Transcribe
        const transcriptUri = response.TranscriptionJob.Transcript.TranscriptFileUri;
        console.log("Transcript URI:", transcriptUri);
        
        // Parse the S3 URI to get the key
        // Format is typically: https://s3.[region].amazonaws.com/[bucket]/[key]
        // or s3://[bucket]/[key]
        let s3Key;
        if (transcriptUri.startsWith('s3://')) {
          // s3://bucket/key format
          const parts = transcriptUri.substring(5).split('/');
          // Remove bucket from the parts to get the key
          parts.shift();
          s3Key = parts.join('/');
        } else {
          // https URL format
          const url = new URL(transcriptUri);
          s3Key = url.pathname.substring(1); // Remove leading slash
          
          // If the URL includes the bucket name in the path, remove it
          const bucketPrefixWithSlash = env.S3_BUCKET_NAME + '/';
          if (s3Key.startsWith(bucketPrefixWithSlash)) {
            s3Key = s3Key.substring(bucketPrefixWithSlash.length);
          }
        }
        
        console.log("Extracting from S3 key:", s3Key);
        
        // Get the transcript JSON file from S3
        const getObjectCommand = new GetObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: s3Key,
        });
        
        // This is the actual implementation to fetch and parse the transcript
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

// Helper function to convert a readable stream to a string
function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}