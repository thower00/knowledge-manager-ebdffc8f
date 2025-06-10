
import { AdobeCredentials } from './adobe-auth.ts';

export interface UploadResult {
  assetID: string;
  uploadUri: string;
}

export async function createUploadUrl(accessToken: string, clientId: string): Promise<UploadResult> {
  console.log('📝 Creating upload presigned URL...');
  
  const uploadUrlResponse = await fetch('https://pdf-services.adobe.io/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-API-Key': clientId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaType: 'application/pdf'
    })
  });

  console.log(`Upload URL response status: ${uploadUrlResponse.status}`);
  
  if (!uploadUrlResponse.ok) {
    const errorText = await uploadUrlResponse.text();
    console.error('❌ Upload URL creation failed:', uploadUrlResponse.status, errorText);
    throw new Error(`Failed to create upload URL: ${uploadUrlResponse.status} - ${errorText}`);
  }

  const uploadUrlData = await uploadUrlResponse.json();
  const uploadUri = uploadUrlData.uploadUri;
  const assetID = uploadUrlData.assetID;

  if (!uploadUri || !assetID) {
    console.error('❌ Invalid upload response:', uploadUrlData);
    throw new Error('Invalid upload URL response from Adobe');
  }
  
  console.log('✅ Upload URL created, assetID:', assetID);
  return { assetID, uploadUri };
}

export async function uploadFile(file: File, uploadUri: string): Promise<void> {
  console.log('📤 Uploading PDF file...');
  
  const uploadResponse = await fetch(uploadUri, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf'
    },
    body: await file.arrayBuffer()
  });

  console.log(`File upload response status: ${uploadResponse.status}`);
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('❌ File upload failed:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload PDF file: ${uploadResponse.status} - ${errorText}`);
  }
  
  console.log('✅ File uploaded successfully');
}
