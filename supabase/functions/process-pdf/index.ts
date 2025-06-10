
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { testAdobeCredentials, testAdobeUpload, testAdobeExtractJobWithFixedHandling } from './debug-tests.ts';
import { extractWithAdobe } from './pdf-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 === EDGE FUNCTION STARTED ===`);
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log(`Headers:`, Object.fromEntries(req.headers.entries()));

    if (req.method !== 'POST') {
      console.log('❌ Method not allowed');
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    let formData;
    let file;
    let testStep;
    
    try {
      console.log('📥 Parsing form data...');
      formData = await req.formData();
      file = formData.get('file') as File;
      testStep = formData.get('testStep') as string || 'full';
      console.log(`✅ Form data parsed. testStep: ${testStep}, file: ${file ? file.name : 'none'}`);
    } catch (error) {
      console.error('❌ Failed to parse form data:', error);
      return new Response(JSON.stringify({
        status: 'error',
        error: 'Failed to parse form data',
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
      if (!file) {
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
        const result = await testAdobeUpload(file);
        console.log('✅ Upload test completed successfully');
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
      if (!file) {
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
        const result = await testAdobeExtractJobWithFixedHandling(file);
        console.log('✅ Extract test completed');
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
    if (!file) {
      console.log('❌ No file provided for full processing');
      return new Response(JSON.stringify({ 
        status: 'error',
        error: 'No file provided' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    console.log(`🔄 STARTING FULL PROCESSING for: ${file.name}, size: ${file.size} bytes`);
    
    try {
      const extractedText = await extractWithAdobe(file);
      console.log(`✅ FULL PROCESSING COMPLETED for: ${file.name}`);
      console.log(`✅ Extracted text length: ${extractedText.length} characters`);

      return new Response(JSON.stringify({
        filename: file.name,
        size: file.size,
        extractedText: extractedText,
        status: 'completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (extractError) {
      console.error(`❌ FULL PROCESSING FAILED for: ${file.name}`);
      console.error(`❌ Extract error:`, extractError);
      console.error(`❌ Extract error message:`, extractError.message);
      console.error(`❌ Extract error stack:`, extractError.stack);
      
      return new Response(JSON.stringify({
        status: 'error',
        error: `Full processing failed: ${extractError.message}`,
        details: extractError.stack,
        filename: file.name
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
