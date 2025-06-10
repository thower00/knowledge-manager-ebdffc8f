
import { getAdobeCredentials, getAccessToken } from './adobe-auth.ts';
import { createUploadUrl, uploadFile } from './adobe-upload.ts';
import { createExtractJob } from './adobe-extract.ts';

export async function testAdobeCredentials(): Promise<any> {
  console.log('🔐 Testing Adobe credentials...');
  
  const credentials = await getAdobeCredentials();
  console.log(`Client ID: ${credentials.clientId.substring(0, 8)}...`);
  console.log(`Client Secret: ${credentials.clientSecret.substring(0, 8)}...`);

  try {
    const accessToken = await getAccessToken(credentials);
    
    return {
      status: 'success',
      message: 'Adobe credentials test passed',
      tokenReceived: !!accessToken,
      tokenType: 'Bearer'
    };
  } catch (error) {
    console.error('❌ Credentials test failed:', error);
    throw error;
  }
}

export async function testAdobeUpload(file: File): Promise<any> {
  console.log('📤 Testing Adobe file upload...');
  
  const credentials = await getAdobeCredentials();
  const accessToken = await getAccessToken(credentials);
  const { assetID, uploadUri } = await createUploadUrl(accessToken, credentials.clientId);
  
  await uploadFile(file, uploadUri);
  
  return {
    status: 'success',
    message: 'Adobe file upload test passed',
    assetID: assetID,
    fileSize: file.size,
    fileName: file.name
  };
}

export async function testAdobeExtractJobWithFixedHandling(file: File): Promise<any> {
  console.log('🔍 Testing Adobe extract job with fixed empty response handling...');
  
  try {
    const credentials = await getAdobeCredentials();
    const accessToken = await getAccessToken(credentials);
    const { assetID, uploadUri } = await createUploadUrl(accessToken, credentials.clientId);
    
    await uploadFile(file, uploadUri);
    
    const pollUrl = await createExtractJob(accessToken, credentials.clientId, assetID);
    
    return {
      status: 'success',
      message: 'Adobe extract job creation test passed',
      assetID: assetID,
      pollUrl: pollUrl
    };

  } catch (error) {
    console.error('❌ Extract test failed:', error);
    console.error('❌ Extract error stack:', error.stack);
    throw error;
  }
}
