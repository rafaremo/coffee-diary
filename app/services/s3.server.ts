import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client with AWS credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_S3_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';

/**
 * Uploads a file to S3 and returns the URL
 * @param file The file data (base64 encoded string)
 * @param fileName The name to give the file in S3
 * @param contentType The MIME type of the file
 * @returns The URL of the uploaded file
 */
export async function uploadFileToS3(
  file: string,
  fileName: string,
  contentType: string
): Promise<string> {
  // Check if credentials and bucket are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    throw new Error('AWS S3 credentials or bucket name are not configured');
  }

  // Convert base64 to Buffer
  // Remove prefix like "data:image/jpeg;base64," if it exists
  const base64Data = file.includes('base64,') 
    ? file.split('base64,')[1] 
    : file;

  const buffer = Buffer.from(base64Data, 'base64');
  
  // Set up parameters for S3 upload
  const key = `avatars/${fileName}`;
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentEncoding: 'base64',
  };

  try {
    // Upload the file to S3
    await s3Client.send(new PutObjectCommand(params));
    
    // Construct and return the URL
    // For custom S3-compatible services, use the provided endpoint
    if (process.env.AWS_S3_ENDPOINT) {
      // Use the custom endpoint to build the URL
      const endpoint = process.env.AWS_S3_ENDPOINT.replace(/\/$/, ''); // Remove trailing slash if present
      return `${endpoint}/${bucketName}/${key}`;
    } else {
      // Use standard AWS S3 URL format
      return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    }
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

/**
 * Generates a presigned URL for uploading directly to S3 from the client
 * @param fileName The name to give the file in S3
 * @param contentType The MIME type of the file
 * @returns Object containing the URL and fields needed for the upload
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<string> {
  // Check if credentials and bucket are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    throw new Error('AWS S3 credentials or bucket name are not configured');
  }

  const key = `avatars/${fileName}`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  try {
    // Generate the presigned URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
} 