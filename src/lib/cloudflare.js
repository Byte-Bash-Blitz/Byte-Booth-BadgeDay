// Cloudflare R2 configuration
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 configuration
const R2_CONFIG = {
  endpoint: import.meta.env.VITE_R2_ENDPOINT || 'https://8663c4e6e2afd68276b4120bed02b998.r2.cloudflarestorage.com',
  region: 'auto',
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
};

// Initialize R2 client
export const r2Client = new S3Client(R2_CONFIG);

// Generate presigned URL for photo upload with debugging
export const generateUploadUrl = async (fileName, fileType) => {
  console.log('🔑 Generating presigned URL for:', fileName, 'type:', fileType);
  
  const key = `photos/${Date.now()}-${fileName}`;
  console.log('📁 S3 Key:', key);
  
  const command = new PutObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  console.log('📋 PutObjectCommand details:', {
    bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    key: key,
    contentType: fileType
  });

  try {
    console.log('🔐 Creating signed URL with 1 hour expiration...');
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    console.log('✅ Signed URL generated successfully');
    return { url, key };
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    console.error('🔧 R2 Client config:', {
      endpoint: R2_CONFIG.endpoint,
      region: R2_CONFIG.region,
      hasCredentials: !!R2_CONFIG.credentials
    });
    throw error;
  }
};

// Generate presigned URL for photo download
export const generateDownloadUrl = async (fileName) => {
  console.log('🔽 Generating download URL for:', fileName);
  
  const key = fileName.startsWith('photos/') ? fileName : `photos/${fileName}`;
  console.log('📁 Download S3 Key:', key);
  
  const command = new GetObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: key,
  });

  try {
    console.log('🔐 Creating signed download URL with 1 hour expiration...');
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    console.log('✅ Download URL generated successfully');
    return url;
  } catch (error) {
    console.error('❌ Error generating download URL:', error);
    throw error;
  }
};

// Upload photo to R2 with comprehensive debugging
export const uploadPhotoToR2 = async (file) => {
  console.log('🚀 Starting R2 upload process...');
  console.log('📁 File details:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified)
  });

  try {
    const fileName = file.name;
    const fileType = file.type || 'application/octet-stream';
    
    // Debug environment variables
    console.log('🔧 R2 Configuration:', {
      hasAccessKey: !!import.meta.env.VITE_R2_ACCESS_KEY_ID,
      hasBucket: !!import.meta.env.VITE_R2_BUCKET_NAME,
      hasSecretKey: !!import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
      accessKey: import.meta.env.VITE_R2_ACCESS_KEY_ID?.substring(0, 8) + '...',
      bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      endpoint: R2_CONFIG.endpoint
    });
    
    // Check if R2 is configured
    if (!import.meta.env.VITE_R2_ACCESS_KEY_ID || !import.meta.env.VITE_R2_BUCKET_NAME || !import.meta.env.VITE_R2_SECRET_ACCESS_KEY) {
      throw new Error('❌ R2 not properly configured. Missing environment variables.');
    }
    
    console.log('🔗 Generating presigned URL...');
    const uploadResult = await generateUploadUrl(fileName, fileType);
    const uploadUrl = uploadResult.url;
    const s3Key = uploadResult.key;
    console.log('✅ Generated upload URL:', uploadUrl.substring(0, 120) + '...');
    console.log('🔑 S3 Key:', s3Key);
    
    // Parse URL to debug
    const urlObj = new URL(uploadUrl);
    console.log('🌐 URL Analysis:', {
      host: urlObj.host,
      pathname: urlObj.pathname,
      hasSignature: urlObj.searchParams.has('X-Amz-Signature'),
      hasCredentials: urlObj.searchParams.has('X-Amz-Credential'),
      expiresIn: urlObj.searchParams.get('X-Amz-Expires'),
      algorithm: urlObj.searchParams.get('X-Amz-Algorithm')
    });
    
    console.log('📤 Starting upload to R2...');
    console.log('🌐 Request details:', {
      method: 'PUT',
      url: uploadUrl.substring(0, 100) + '...',
      contentType: fileType,
      fileSize: file.size
    });
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': fileType,
      },
      // Remove timeout to avoid AbortSignal issues
    });

    console.log('📨 Upload response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error text');
      console.error('❌ Upload failed with error:', errorText);
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Return the photo metadata with S3 key for downloads
    const publicUrl = uploadUrl.split('?')[0];
    console.log('🎉 Upload successful! Public URL:', publicUrl);
    
    return {
      url: publicUrl,
      s3Key: s3Key,
      fileName: fileName,
      size: file.size,
      storage: 'r2'
    };
    
  } catch (error) {
    console.error('💥 R2 Upload failed:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    // Don't fallback automatically - let's see what's wrong first
    throw error;
  }
};

// Helper function to convert file to base64 (for debugging)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}
