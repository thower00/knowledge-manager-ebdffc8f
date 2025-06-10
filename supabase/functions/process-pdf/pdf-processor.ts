
import { getAdobeCredentials, getAccessToken } from './adobe-auth.ts';
import { createUploadUrl, uploadFile } from './adobe-upload.ts';
import { createExtractJob, pollForCompletion, downloadAndExtractText } from './adobe-extract.ts';

export async function extractWithAdobe(file: File): Promise<string> {
  console.log('🎯 === STARTING EXTRACT WITH ADOBE ===');
  
  try {
    // Step 1: Get credentials and access token
    const credentials = await getAdobeCredentials();
    const accessToken = await getAccessToken(credentials);

    // Step 2: Create upload URL and upload file
    const { assetID, uploadUri } = await createUploadUrl(accessToken, credentials.clientId);
    await uploadFile(file, uploadUri);

    // Step 3: Create extract job
    const pollUrl = await createExtractJob(accessToken, credentials.clientId, assetID);

    // Step 4: Poll for completion
    const downloadUri = await pollForCompletion(pollUrl, accessToken, credentials.clientId);

    // Step 5: Download and extract text
    const extractedText = await downloadAndExtractText(downloadUri, accessToken, credentials.clientId);

    return extractedText;
    
  } catch (error) {
    console.error('❌ EXTRACT WITH ADOBE FAILED:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}
