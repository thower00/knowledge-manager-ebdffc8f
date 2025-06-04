
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
    
    // Configure PDF.js worker - use a simpler approach
    console.log('⚙️ Configuring PDF.js worker...');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Try to use the worker from public folder, fallback to CDN if needed
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('📝 PDF worker set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
    
    if (onProgress) onProgress(10);
    
    console.log('📄 Loading PDF document...');
    
    // Load the PDF with minimal configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      standardFontDataUrl: undefined, // Don't load extra fonts
      cMapUrl: undefined, // Don't load extra character maps
      verbosity: 0 // Minimal logging
    });
    
    console.log('⏳ Waiting for PDF to load...');
    const pdf = await loadingTask.promise;
    console.log('✅ PDF loaded successfully! Pages:', pdf.numPages);
    
    if (onProgress) onProgress(30);
    
    let allText = '';
    const totalPages = Math.min(pdf.numPages, 100); // Limit to 100 pages max
    
    console.log(`📖 Processing ${totalPages} pages...`);
    
    // Process each page sequentially
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`📑 Processing page ${pageNum}/${totalPages}...`);
      
      try {
        const page = await pdf.getPage(pageNum);
        console.log(`📄 Got page ${pageNum}, extracting text...`);
        
        const textContent = await page.getTextContent();
        console.log(`📝 Got text content for page ${pageNum}, items:`, textContent.items.length);
        
        // Extract text from this page
        const pageText = textContent.items
          .map((item: any) => {
            if (item && typeof item.str === 'string' && item.str.trim()) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
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
        // Continue with other pages
      }
    }
    
    if (onProgress) onProgress(95);
    
    // Clean up the extracted text
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
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return {
      success: false,
      text: '',
      error: errorMessage
    };
  }
}
