
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { testAdobeCredentials, testAdobeUpload, testAdobeExtractJobWithFixedHandling } from './debug-tests.ts';
import { extractWithAdobe } from './pdf-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
};

// Convert Google Drive sharing URL to direct download URL
function convertGoogleDriveUrl(url: string): string {
  console.log('🔗 Converting Google Drive URL:', url);
  
  // Check if it's already a direct download URL
  if (url.includes('/uc?export=download') || url.includes('drive.google.com/uc')) {
    console.log('✅ URL is already in direct download format');
    return url;
  }
  
  // Extract file ID from various Google Drive URL formats
  let fileId = '';
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const viewMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (viewMatch) {
    fileId = viewMatch[1];
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (openMatch) {
    fileId = openMatch[1];
  }
  
  if (fileId) {
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    console.log('✅ Converted to direct download URL:', directUrl);
    return directUrl;
  }
  
  console.log('⚠️ Could not extract file ID, using original URL');
  return url;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 === EDGE FUNCTION STARTED ===`);
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    const headersObject = Object.fromEntries(req.headers.entries());
    console.log(`Headers:`, headersObject);
    const correlationId = req.headers.get('x-correlation-id');
    if (correlationId) {
      console.log(`🧵 Correlation ID: ${correlationId}`);
    }

    if (req.method !== 'POST') {
      console.log('❌ Method not allowed');
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    let requestBody;
    let file;
    let testStep;
    let documentUrl;
    let documentTitle;
    let documentId;
    let useStoredDocument;
    
    try {
      console.log('📥 Parsing request body...');
      
      // Check if it's JSON (stored document test) or FormData (file upload test)
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON request for stored document tests
        requestBody = await req.json();
        testStep = requestBody.testStep || 'full';
        documentUrl = requestBody.documentUrl;
        documentTitle = requestBody.documentTitle;
        documentId = requestBody.documentId;
        useStoredDocument = requestBody.useStoredDocument;
        
        console.log(`✅ JSON parsed. testStep: ${testStep}, useStoredDocument: ${useStoredDocument}`);
        console.log(`Document: ${documentTitle} (${documentId})`);
        console.log(`URL: ${documentUrl}`);
      } else {
        // Handle FormData for file upload tests
        const formData = await req.formData();
        file = formData.get('file') as File;
        testStep = formData.get('testStep') as string || 'full';
        console.log(`✅ Form data parsed. testStep: ${testStep}, file: ${file ? file.name : 'none'}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      return new Response(JSON.stringify({
        status: 'error',
        error: 'Failed to parse request body',
        details: error.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`=== STARTING TEST STEP: ${testStep} ===`);

    // Step 1: Basic function test
    if (testStep === 'basic') {
      console.log('✅ Basic edge function is working!');
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Basic edge function test passed',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Test Adobe credentials only
    if (testStep === 'credentials') {
      try {
        console.log('🔐 Starting credentials test...');
        const result = await testAdobeCredentials();
        console.log('✅ Credentials test completed successfully');
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Credentials test failed:', error);
        return new Response(JSON.stringify({
          status: 'error',
          error: error.message,
          details: error.stack
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Step 3: Test file upload to Adobe
    if (testStep === 'upload') {
      if (!file && !useStoredDocument) {
        console.log('❌ No file provided for upload test');
        return new Response(JSON.stringify({ 
          status: 'error',
          error: 'No file provided for upload test' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        console.log('📤 Starting upload test...');
        
        if (useStoredDocument) {
          // Convert Google Drive URL and fetch the file
          const directUrl = convertGoogleDriveUrl(documentUrl);
          console.log(`Fetching document from converted URL: ${directUrl}`);
          
          const response = await fetch(directUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          console.log(`✅ Fetched document, size: ${arrayBuffer.byteLength} bytes`);
          
          // Check if the response looks like a PDF
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfHeader = uint8Array.slice(0, 5);
          const headerString = String.fromCharCode(...pdfHeader);
          
          if (!headerString.startsWith('%PDF-')) {
            console.error('❌ Downloaded file does not appear to be a PDF. Header:', headerString);
            console.error('❌ This might be a Google Drive download page instead of the actual file');
            throw new Error(`Downloaded file is not a PDF. Expected PDF header but got: ${headerString}. This suggests the Google Drive URL is not correctly converted to a direct download link.`);
          }
          
          const fetchedFile = new File([arrayBuffer], documentTitle, { type: 'application/pdf' });
          
          const result = await testAdobeUpload(fetchedFile);
          console.log('✅ Upload test with stored document completed successfully');
          return new Response(JSON.stringify({
            ...result,
            message: `Adobe file upload test passed for stored document: ${documentTitle}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const result = await testAdobeUpload(file);
          console.log('✅ Upload test completed successfully');
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('❌ Upload test failed:', error);
        return new Response(JSON.stringify({
          status: 'error',
          error: error.message,
          details: error.stack
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Step 4: Test extract job creation
    if (testStep === 'extract') {
      if (!file && !useStoredDocument) {
        console.log('❌ No file provided for extract test');
        return new Response(JSON.stringify({ 
          status: 'error',
          error: 'No file provided for extract test' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        console.log('🔍 Starting extract test...');
        
        if (useStoredDocument) {
          const directUrl = convertGoogleDriveUrl(documentUrl);
          console.log(`Fetching document from converted URL: ${directUrl}`);
          
          const response = await fetch(directUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Validate PDF header
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfHeader = uint8Array.slice(0, 5);
          const headerString = String.fromCharCode(...pdfHeader);
          
          if (!headerString.startsWith('%PDF-')) {
            throw new Error(`Downloaded file is not a PDF. Expected PDF header but got: ${headerString}`);
          }
          
          const fetchedFile = new File([arrayBuffer], documentTitle, { type: 'application/pdf' });
          
          const result = await testAdobeExtractJobWithFixedHandling(fetchedFile);
          console.log('✅ Extract test with stored document completed');
          return new Response(JSON.stringify({
            ...result,
            message: `Adobe extract job creation test passed for stored document: ${documentTitle}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const result = await testAdobeExtractJobWithFixedHandling(file);
          console.log('✅ Extract test completed');
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('❌ Extract test failed:', error);
        return new Response(JSON.stringify({
          status: 'error',
          error: error.message,
          details: error.stack
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Default: Full processing
    if (!file && !useStoredDocument) {
      console.log('❌ No file or document reference provided for full processing');
      return new Response(JSON.stringify({ 
        status: 'error',
        error: 'No file or document reference provided' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      let processedFile: File;
      let filename: string;
      let fileSize: number;

      if (useStoredDocument) {
        console.log(`🔄 STARTING FULL PROCESSING for stored document: ${documentTitle}`);
        
        const directUrl = convertGoogleDriveUrl(documentUrl);
        console.log(`Fetching document from converted URL: ${directUrl}`);
        
        const response = await fetch(directUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Validate PDF header before processing
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdfHeader = uint8Array.slice(0, 5);
        const headerString = String.fromCharCode(...pdfHeader);
        
        console.log(`📄 File header analysis: ${headerString}`);
        
        if (!headerString.startsWith('%PDF-')) {
          console.error('❌ Downloaded file is not a PDF');
          console.error('❌ First 20 bytes:', uint8Array.slice(0, 20));
          throw new Error(`Downloaded file is not a valid PDF. Header: "${headerString}". This might indicate the Google Drive URL is returning a download page instead of the actual file.`);
        }
        
        processedFile = new File([arrayBuffer], documentTitle, { type: 'application/pdf' });
        filename = documentTitle;
        fileSize = arrayBuffer.byteLength;
        
        console.log(`✅ Successfully fetched and validated stored document, size: ${fileSize} bytes`);
      } else {
        if (file.type !== 'application/pdf') {
          console.log(`❌ Invalid file type: ${file.type}`);
          return new Response(JSON.stringify({ 
            status: 'error',
            error: 'File must be a PDF' 
          }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`🔄 STARTING FULL PROCESSING for uploaded file: ${file.name}, size: ${file.size} bytes`);
        processedFile = file;
        filename = file.name;
        fileSize = file.size;
      }
      
      const extractedText = await extractWithAdobe(processedFile);
      console.log(`✅ FULL PROCESSING COMPLETED for: ${filename}`);
      console.log(`✅ Extracted text length: ${extractedText.length} characters`);

      return new Response(JSON.stringify({
        filename: filename,
        size: fileSize,
        extractedText: extractedText,
        status: 'completed',
        source: useStoredDocument ? 'database' : 'upload',
        documentId: useStoredDocument ? documentId : undefined
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (extractError) {
      console.error(`❌ FULL PROCESSING FAILED for: ${useStoredDocument ? documentTitle : file?.name}`);
      console.error(`❌ Extract error:`, extractError);
      console.error(`❌ Extract error message:`, extractError.message);
      console.error(`❌ Extract error stack:`, extractError.stack);
      
      return new Response(JSON.stringify({
        status: 'error',
        error: `Full processing failed: ${extractError.message}`,
        details: extractError.stack,
        filename: useStoredDocument ? documentTitle : file?.name,
        source: useStoredDocument ? 'database' : 'upload'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ TOP LEVEL CRITICAL ERROR:', error);
    console.error('❌ ERROR MESSAGE:', error.message);
    console.error('❌ ERROR STACK:', error.stack);
    console.error('❌ ERROR NAME:', error.name);
    console.error('❌ ERROR CONSTRUCTOR:', error.constructor.name);
    
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message || 'Unknown error occurred',
      errorType: error.constructor.name,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
