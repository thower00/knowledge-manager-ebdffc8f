
export interface ExtractJobRequest {
  assetID: string;
  elementsToExtract: string[];
}

export interface ExtractJobResult {
  pollUrl: string;
}

// Helper function to detect if URL is a pre-signed S3 URL
export function isPreSignedS3Url(url: string): boolean {
  return url.includes('X-Amz-Algorithm') || url.includes('amazonaws.com');
}

export async function createExtractJob(
  accessToken: string, 
  clientId: string, 
  assetID: string
): Promise<string> {
  console.log('🔍 Creating extract job...');
  
  const extractJobBody: ExtractJobRequest = {
    assetID: assetID,
    elementsToExtract: ['text']
  };
  
  console.log('Extract job request body:', JSON.stringify(extractJobBody, null, 2));

  const extractResponse = await fetch('https://pdf-services.adobe.io/operation/extractpdf', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-API-Key': clientId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(extractJobBody)
  });

  console.log(`Extract response status: ${extractResponse.status}`);
  
  if (!extractResponse.ok) {
    const errorText = await extractResponse.text();
    console.error('❌ Extract job creation failed:', extractResponse.status, errorText);
    throw new Error(`Failed to create extract job: ${extractResponse.status} - ${errorText}`);
  }

  // Handle potentially empty response body
  const extractResponseText = await extractResponse.text();
  console.log('Extract job response text length:', extractResponseText.length);
  console.log('Extract job response text:', extractResponseText);
  
  let pollUrl: string;

  if (!extractResponseText.trim()) {
    // Empty response - check headers for location
    console.log('Empty response body - checking headers...');
    pollUrl = extractResponse.headers.get('location');
    
    if (!pollUrl) {
      console.error('❌ No location in headers either');
      throw new Error('Extract job request returned empty response and no location header');
    }
    
    console.log('✅ Found location in headers:', pollUrl);
  } else {
    // Non-empty response - try to parse JSON
    let extractData;
    try {
      extractData = JSON.parse(extractResponseText);
    } catch (error) {
      console.error('❌ Failed to parse extract response JSON:', error);
      throw new Error(`Extract job returned invalid JSON: ${extractResponseText.substring(0, 200)}`);
    }

    pollUrl = extractData.location;

    if (!pollUrl) {
      console.error('❌ No poll URL in response:', extractData);
      throw new Error('No poll URL received from extract job');
    }
  }

  console.log('✅ Extract job created, polling URL:', pollUrl);
  return pollUrl;
}

export async function pollForCompletion(
  pollUrl: string, 
  accessToken: string, 
  clientId: string,
  maxAttempts: number = 30
): Promise<string> {
  console.log('⏳ Polling for job completion...');
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;
    
    console.log(`🔄 Poll attempt ${attempts}/${maxAttempts}...`);
    
    const pollResponse = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': clientId,
        'Accept': 'application/json'
      }
    });

    console.log(`Poll ${attempts} response status: ${pollResponse.status}`);

    if (pollResponse.ok) {
      const pollText = await pollResponse.text();
      console.log(`Poll ${attempts} response text length: ${pollText.length}`);
      console.log(`Poll ${attempts} response sample:`, pollText.substring(0, 500));
      
      let pollData;
      try {
        pollData = JSON.parse(pollText);
      } catch (error) {
        console.error(`❌ Failed to parse poll response ${attempts}:`, error);
        console.error(`❌ Raw response: ${pollText}`);
        continue;
      }
      
      console.log(`Poll ${attempts} status:`, pollData.status);
      
      if (pollData.status === 'done') {
        console.log('🎉 Job completed, returning download URI...');
        console.log('Complete poll response structure:', JSON.stringify(pollData, null, 2));
        
        // Handle multiple possible response formats
        let downloadUri: string;
        
        if (pollData.content && pollData.content.downloadUri) {
          downloadUri = pollData.content.downloadUri;
          console.log('✅ Using content.downloadUri:', downloadUri);
        } else if (pollData.asset && pollData.asset.downloadUri) {
          downloadUri = pollData.asset.downloadUri;
          console.log('✅ Using asset.downloadUri:', downloadUri);
        } else if (pollData.downloadUri) {
          downloadUri = pollData.downloadUri;
          console.log('✅ Using direct downloadUri:', downloadUri);
        } else {
          console.error('❌ No download URI found in any expected location:', pollData);
          throw new Error('No download URI found in completed job response');
        }
        
        return downloadUri;
      } else if (pollData.status === 'failed') {
        console.error('❌ Job failed:', pollData);
        throw new Error(`Extract job failed: ${pollData.error || 'Unknown error'}`);
      } else if (pollData.status === 'in progress') {
        console.log('⏳ Job still in progress, continuing to poll...');
      } else {
        console.log('❓ Unknown status:', pollData.status);
      }
    } else {
      const errorText = await pollResponse.text();
      console.error(`❌ Poll attempt ${attempts} failed: ${pollResponse.status} - ${errorText}`);
      
      if (pollResponse.status === 404) {
        throw new Error('Extract job not found - may have expired');
      }
    }
  }
  
  console.error('❌ Job timed out after maximum polling attempts');
  throw new Error('Job timed out after maximum polling attempts');
}

export async function downloadAndExtractText(
  downloadUri: string, 
  accessToken: string, 
  clientId: string
): Promise<string> {
  console.log('📥 Downloading result from:', downloadUri);
  
  // Smart URL detection and conditional headers
  const isS3Url = isPreSignedS3Url(downloadUri);
  console.log(`🔍 URL type detection: ${isS3Url ? 'S3 Pre-signed URL' : 'Adobe Direct URL'}`);
  
  const downloadHeaders = isS3Url 
    ? {} // No auth headers for S3 pre-signed URLs
    : {    // Adobe auth headers for direct Adobe URLs
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': clientId
      };
  
  console.log('📤 Download headers:', isS3Url ? 'No auth headers (S3)' : 'Adobe auth headers');
  
  const downloadResponse = await fetch(downloadUri, {
    headers: downloadHeaders
  });
  
  console.log(`Download response status: ${downloadResponse.status}`);
  
  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text();
    console.error('❌ Download failed:', downloadResponse.status, errorText);
    throw new Error(`Failed to download result: ${downloadResponse.status} - ${errorText}`);
  }

  const resultText = await downloadResponse.text();
  console.log('✅ Download successful, result length:', resultText.length);
  console.log('Result sample:', resultText.substring(0, 500));
  
  let resultData;
  try {
    resultData = JSON.parse(resultText);
  } catch (error) {
    console.error('❌ Failed to parse download result JSON:', error);
    throw new Error(`Download result returned invalid JSON: ${resultText.substring(0, 200)}`);
  }
  
  console.log('Result structure keys:', Object.keys(resultData));
  
  let text = '';
  if (resultData.elements && Array.isArray(resultData.elements)) {
    console.log(`Found ${resultData.elements.length} elements`);
    for (const element of resultData.elements) {
      if (element.Text) {
        text += element.Text + ' ';
      }
    }
  }
  
  if (!text.trim()) {
    console.error('❌ No text extracted from result:', resultData);
    throw new Error('No text found in PDF');
  }
  
  console.log(`✅ Successfully extracted ${text.length} characters of text`);
  return text.trim();
}
