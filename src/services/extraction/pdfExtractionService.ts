import { supabase } from "@/integrations/supabase/client";

interface PdfExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
  forceTextMode?: boolean;
  disableBinaryOutput?: boolean;
  strictTextCleaning?: boolean;
  useAdvancedExtraction?: boolean;
  useTextPatternExtraction?: boolean;
}

/**
 * Extract text from PDF using server-side processing with improved error handling and fallback
 */
export async function extractPdfWithProxy(
  base64Data: string,
  options: PdfExtractionOptions = {},
  progressCallback?: (progress: number) => void
): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 1000;
  const correlationId = Math.random().toString(36).slice(2, 10);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Calling server-side PDF processing function with options:`, options);
      
      if (progressCallback) {
        progressCallback(10 + (attempt - 1) * 20);
      }
      
      // Get a fresh session to ensure we have valid auth
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      // First try: Use Supabase client invoke method
      if (attempt === 1) {
        try {
          console.log("Trying Supabase client invoke method");
          const { data, error } = await supabase.functions.invoke('process-pdf', {
            body: {
              pdfBase64: base64Data,
              options: {
                ...options,
                timeout: options.timeout || 30
              }
            },
            headers: {
              'X-Correlation-Id': correlationId
            }
          });
          
          if (error) {
            console.error("Supabase invoke error:", error);
            throw new Error(`Supabase invoke failed: ${error.message}`);
          }
          
          if (data?.error) {
            throw new Error(`Server processing error: ${data.error}`);
          }
          
          if (data?.text) {
            if (progressCallback) progressCallback(100);
            console.log(`Successfully extracted ${data.text.length} characters of text`);
            return data.text;
          }
          
          throw new Error("No text returned from server processing");
        } catch (invokeError) {
          console.error("Supabase invoke method failed:", invokeError);
          // Fall through to direct fetch method
        }
      }
      
      // Fallback: Use direct fetch method
      const functionUrl = `https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/process-pdf`;
      const authToken = session.session?.access_token || '';
      const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";
      
      const requestBody = {
        pdfBase64: base64Data,
        options: {
          ...options,
          timeout: options.timeout || 30
        }
      };
      
      console.log(`Attempt ${attempt}: Making direct fetch call to process-pdf function`);
      console.log(`Using Correlation ID: ${correlationId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': apiKey,
            'Cache-Control': 'no-cache',
            'X-Correlation-Id': correlationId,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP ${response.status}: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (progressCallback) {
          progressCallback(70 + attempt * 10);
        }
        
        console.log("Server-side PDF processing response:", {
          success: data.success,
          textLength: data.text?.length || 0,
          available: data.available
        });
        
        if (data.error) {
          throw new Error(`Server processing error: ${data.error}`);
        }
        
        if (!data.text) {
          throw new Error("No text returned from server processing");
        }
        
        if (progressCallback) {
          progressCallback(100);
        }
        
        console.log(`Successfully extracted ${data.text.length} characters of text`);
        return data.text;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("PDF processing timed out");
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // On final attempt, provide detailed error information
      let errorMessage = `Server-side PDF processing failed after ${maxRetries} attempts`;
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages
        if (errorMessage.includes("Failed to fetch")) {
          errorMessage = "Cannot connect to PDF processing service. The service may be down or there may be a network issue.";
        } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
          errorMessage = "PDF processing timed out. The document may be too large or complex.";
        } else if (errorMessage.includes("Authentication error")) {
          errorMessage = "Authentication failed. Please try refreshing the page and logging in again.";
        }
      }
      
      throw new Error(errorMessage);
    }
  }
  
  throw new Error("All retry attempts failed");
}
