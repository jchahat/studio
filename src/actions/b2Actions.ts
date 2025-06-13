
'use server';

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface B2AuthResponse {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  recommendedPartSize: number;
  absoluteMinimumPartSize: number;
}

interface B2GetUploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

export interface B2UploadCredentials {
  uploadUrl: string;
  authToken: string;
  finalFileName: string; // The name the file should have in B2 (includes UUID)
  publicFileUrlBase: string; // Base URL to construct the public link, e.g. https://f000.backblazeb2.com/file/your-bucket-name
}


const B2_KEY_ID = process.env.BACKBLAZE_B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.BACKBLAZE_B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.BACKBLAZE_B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.BACKBLAZE_B2_BUCKET_NAME;

// Cache for B2 authorization details
let b2AuthCache: { data: B2AuthResponse; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 20 * 1000; // 20 hours in milliseconds

async function getB2Auth(): Promise<B2AuthResponse> {
  if (b2AuthCache && (Date.now() - b2AuthCache.timestamp < CACHE_DURATION)) {
    return b2AuthCache.data;
  }

  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error('Backblaze B2 credentials are not configured.');
  }

  const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');

  try {
    const response = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
    b2AuthCache = { data: response.data, timestamp: Date.now() };
    return response.data;
  } catch (error: any) {
    console.error('B2 Auth Error:', error.response?.data || error.message);
    throw new Error('Failed to authorize with Backblaze B2.');
  }
}

export async function getB2UploadCredentialsAction(
  originalFileName: string,
): Promise<B2UploadCredentials> {
  if (!B2_BUCKET_ID || !B2_BUCKET_NAME) {
    throw new Error('Backblaze B2 bucket ID or name is not configured.');
  }
  
  const b2Auth = await getB2Auth();

  try {
    const uploadUrlResponse = await axios.post(
      `${b2Auth.apiUrl}/b2api/v2/b2_get_upload_url`,
      { bucketId: B2_BUCKET_ID },
      {
        headers: {
          Authorization: b2Auth.authorizationToken,
        },
      }
    );

    const { uploadUrl, authorizationToken: uploadAuthToken } = uploadUrlResponse.data as B2GetUploadUrlResponse;
    
    // Sanitize and create a unique file name for B2
    const fileExtension = originalFileName.split('.').pop() || '';
    const safeBaseName = originalFileName.substring(0, originalFileName.length - (fileExtension.length ? fileExtension.length + 1 : 0))
                                      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const finalFileName = `products/${uuidv4()}-${safeBaseName}${fileExtension ? '.' + fileExtension : ''}`;
    
    const publicFileUrlBase = `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}`;

    return {
      uploadUrl,
      authToken: uploadAuthToken,
      finalFileName,
      publicFileUrlBase,
    };
  } catch (error: any) {
    console.error('B2 Get Upload URL Error:', error.response?.data || error.message);
    throw new Error('Failed to get Backblaze B2 upload URL.');
  }
}
