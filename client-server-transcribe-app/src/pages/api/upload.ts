import { type NextApiRequest, type NextApiResponse } from "next";
import formidable from "formidable";
import { uploadToS3 } from "~/utils/s3Client";
import fs from "fs";

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Create a temporary directory for the upload
    const form = formidable({
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB max size
      filter: (part) => part.mimetype?.includes("audio") || false,
    });

    return new Promise<void>((resolve, reject) => {
      form.parse(req, async (err, _fields, files) => {
        if (err) {
          res.status(500).json({ error: "Failed to upload file" });
          return resolve();
        }

        const file = Array.isArray(files.audio) 
          ? files.audio[0] 
          : files.audio;

        if (!file) {
          res.status(400).json({ error: "No audio file provided" });
          return resolve();
        }

        try {
          // Read the file buffer
          const fileBuffer = fs.readFileSync(file.filepath);
          const fileName = file.originalFilename || `recording-${Date.now()}.mp3`;
          const contentType = file.mimetype || "audio/mpeg";
          const jobName = `transcription-${Date.now()}`;

          // Upload to S3
          const s3Uri = await uploadToS3(fileBuffer, fileName, contentType);
          
          // Clean up the temporary file
          fs.unlinkSync(file.filepath);

          res.status(200).json({
            success: true,
            fileName,
            s3Uri,
            jobName,
          });
        } catch (uploadError) {
          console.error("S3 upload error:", uploadError);
          res.status(500).json({ error: "Failed to upload to S3" });
        }
        
        resolve();
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to process upload" });
  }
}