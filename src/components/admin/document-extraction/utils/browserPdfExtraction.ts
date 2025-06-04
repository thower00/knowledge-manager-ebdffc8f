
import * as pdfjsLib from 'pdfjs-dist';

export interface BrowserPdfResult {
  success: boolean;
  text: string;
  error?: string;
  pages?: number;
}

/**
 * Simple, reliable browser-based PDF text extraction
 */
export async function extractTextFromPdfBrowser(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<BrowserPdfResult> {
  console.log('🔍 Starting PDF extraction, buffer size:', arrayBuffer.byteLength);
  
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    console.error('❌ Invalid or empty PDF data');
    return {
      success: false,
      text: '',
      error: 'Invalid or empty PDF data'
    };
  }

  try {
    // Set progress to starting
    if (onProgress) onProgress(5);
    
    // Configure PDF.js worker with proper settings
    console.log('⚙️ Configuring PDF.js worker...');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('📝 PDF worker set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
    
    if (onProgress) onProgress(10);
    
    console.log('📄 Loading PDF document...');
    
    // FIXED: Use minimal configuration that won't cause hanging
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Don't set these to undefined - either omit them or set proper values
      verbosity: 0,
      // Disable problematic features that can cause hanging
      disableFontFace: true,
      disableRange: true,
      disableStream: true
    });
    
    console.log('⏳ Waiting for PDF to load...');
    const pdf = await loadingTask.promise;
    console.log('✅ PDF loaded successfully! Pages:', pdf.numPages);
    
    if (onProgress) onProgress(30);
    
    let allText = '';
    const totalPages = Math.min(pdf.numPages, 10); // Start with just 10 pages for testing
    
    console.log(`📖 Processing ${totalPages} pages...`);
    
    // Process pages one by one
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`📑 Processing page ${pageNum}/${totalPages}...`);
      
      try {
        const page = await pdf.getPage(pageNum);
        console.log(`📄 Got page ${pageNum}, extracting text...`);
        
        const textContent = await page.getTextContent();
        console.log(`📝 Text content items for page ${pageNum}:`, textContent.items.length);
        
        // Extract text more carefully
        const pageText = textContent.items
          .filter((item: any) => item && item.str && typeof item.str === 'string')
          .map((item: any) => item.str.trim())
          .filter(text => text.length > 0)
          .join(' ');
        
        if (pageText) {
          allText += pageText + '\n\n';
          console.log(`✅ Page ${pageNum}: extracted ${pageText.length} characters`);
        } else {
          console.log(`⚠️ Page ${pageNum}: no text found`);
        }
        
        // Update progress
        if (onProgress) {
          const progress = 30 + Math.round((pageNum / totalPages) * 60);
          onProgress(progress);
        }
        
      } catch (pageError) {
        console.error(`❌ Error processing page ${pageNum}:`, pageError);
        // Continue with other pages instead of failing completely
      }
    }
    
    if (onProgress) onProgress(95);
    
    // Clean up text
    allText = allText.trim();
    
    console.log(`📊 Extraction complete: ${allText.length} characters from ${totalPages} pages`);
    
    if (!allText) {
      console.warn('⚠️ No text extracted from PDF');
      return {
        success: false,
        text: '',
        error: 'No text found in PDF - document may be image-based or empty',
        pages: totalPages
      };
    }
    
    if (onProgress) onProgress(100);
    
    console.log('🎉 PDF extraction successful!');
    
    return {
      success: true,
      text: allText,
      pages: totalPages
    };
    
  } catch (error) {
    console.error('💥 PDF extraction failed:', error);
    
    let errorMessage = 'PDF extraction failed';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.name, error.message);
    }
    
    return {
      success: false,
      text: '',
      error: errorMessage
    };
  }
}
