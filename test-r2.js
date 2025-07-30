// Quick test script to verify R2 configuration
import { generateDownloadUrl } from './src/lib/cloudflare.js';

console.log('Testing R2 configuration...');

// Test environment variables
console.log('Environment check:', {
  hasAccessKey: !!import.meta.env.VITE_R2_ACCESS_KEY_ID,
  hasBucket: !!import.meta.env.VITE_R2_BUCKET_NAME,
  hasSecretKey: !!import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  hasEndpoint: !!import.meta.env.VITE_R2_ENDPOINT
});

// Test download URL generation (this would normally be called with an actual s3Key)
async function testDownload() {
  try {
    const testKey = 'photos/test-image.jpg';
    const downloadUrl = await generateDownloadUrl(testKey);
    console.log('✅ Download URL generated successfully:', downloadUrl.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ Download URL generation failed:', error);
  }
}

testDownload();
