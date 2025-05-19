
import * as pdfjsLib from "pdfjs-dist";

// Set worker path - needed for pdf.js to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Function to fetch document via proxy service
export const fetchDocumentViaProxy = async (url: string): Promise<ArrayBuffer> => {
  try {
    console.log("Fetching document via proxy:", url);
    
    const response = await fetch("/api/pdf-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Proxy service error: ${response.status} ${response.statusText}`);
    }
    
    // Get the binary data as array buffer
    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error fetching document via proxy:", error);
    throw error;
  }
};

// Extract text from PDF
export const extractPdfText = async (
  pdfData: ArrayBuffer, 
  onProgressUpdate: (progress: number) => void
): Promise<string> => {
  // Check if this looks like a PDF (starts with %PDF-)
  const firstBytes = new Uint8Array(pdfData.slice(0, 5));
  const isPdfSignature = firstBytes[0] === 0x25 && // %
                         firstBytes[1] === 0x50 && // P
                         firstBytes[2] === 0x44 && // D
                         firstBytes[3] === 0x46 && // F
                         firstBytes[4] === 0x2D;   // -
  
  if (!isPdfSignature) {
    // First few bytes of the response as text for debugging
    const decoder = new TextDecoder();
    const textStart = decoder.decode(pdfData.slice(0, 100));
    throw new Error(`Response is not a valid PDF. Content starts with: ${textStart.substring(0, 30)}...`);
  }
  
  // Load the PDF using pdf.js
  onProgressUpdate(40);
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  
  let extractedContent = `PDF document loaded. Total pages: ${pdf.numPages}\n\n`;
  
  // Extract text from each page
  const totalPages = pdf.numPages;
  let pageTexts: string[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    onProgressUpdate(40 + Math.floor((i / totalPages) * 50));
    
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    pageTexts.push(`--- Page ${i} ---\n${pageText}\n`);
  }
  
  extractedContent += pageTexts.join('\n');
  onProgressUpdate(95);
  
  return extractedContent;
};
