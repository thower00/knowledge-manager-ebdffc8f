
/**
 * Utility functions for URL validation and processing
 */

/**
 * Validates if a URL points to a PDF document
 * @param url URL to check
 * @returns Object with validation result and message
 */
export const validatePdfUrl = (url: string): { 
  isValid: boolean; 
  message: string | null;
} => {
  if (!url) {
    return { isValid: false, message: "URL is empty" };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (e) {
    return { isValid: false, message: "Invalid URL format" };
  }

  // Automatically attempt to convert Google Drive URLs to direct download format
  if (url.includes('drive.google.com')) {
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(url);
    
    // Consider any Google Drive URL valid as we'll try to convert it during processing
    return { isValid: true, message: null };
  }
  
  // Check for common PDF extensions in the URL
  const isPdfExtension = url.toLowerCase().endsWith('.pdf');
  const isPdfContentType = url.toLowerCase().includes('pdf') || 
                           url.includes('application/pdf');
  
  // For URLs with known content type, we can be more lenient
  if (isPdfContentType) {
    return { isValid: true, message: null };
  }
  
  // For other URLs, we want to see a .pdf extension
  if (!isPdfExtension) {
    return { 
      isValid: false, 
      message: "URL doesn't appear to point to a PDF document. The URL should end with .pdf or be a properly formatted Google Drive link."
    };
  }
  
  return { isValid: true, message: null };
};

/**
 * Convert Google Drive view URLs to direct download URLs
 * This function handles various Google Drive URL formats and returns a direct download URL
 * @param url Original Google Drive URL
 * @returns Object with converted URL and status flag
 */
export const convertGoogleDriveUrl = (url: string): { 
  url: string; 
  wasConverted: boolean;
} => {
  if (!url.includes('drive.google.com')) {
    return { url, wasConverted: false }; // Not a Google Drive URL
  }
  
  // Already in direct download format with alt=media
  if (url.includes('alt=media')) {
    return { url, wasConverted: false };
  }
  
  // Extract file ID from various Google Drive URL formats
  let fileId = '';
  
  // Format: drive.google.com/file/d/FILE_ID/view
  const filePattern = /\/file\/d\/([^/]+)/;
  const fileMatch = url.match(filePattern);
  
  if (fileMatch && fileMatch[1]) {
    fileId = fileMatch[1];
    
    // If URL already ends with /view?alt=media, don't modify it
    if (url.endsWith('/view?alt=media')) {
      return { url, wasConverted: false };
    }
    
    // If URL ends with /view, append ?alt=media
    if (url.endsWith('/view')) {
      return { 
        url: `${url}?alt=media`,
        wasConverted: true 
      };
    }
    
    // Otherwise create a proper direct download URL
    return { 
      url: `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`,
      wasConverted: true 
    };
  }
  
  // Format: drive.google.com/open?id=FILE_ID
  const openPattern = /\?id=([^&]+)/;
  const openMatch = url.match(openPattern);
  
  if (openMatch && openMatch[1]) {
    fileId = openMatch[1];
    return { 
      url: `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`,
      wasConverted: true 
    };
  }
  
  // Additional format: docs.google.com/document/d/FILE_ID/edit
  const docsPattern = /document\/d\/([^/]+)/;
  const docsMatch = url.match(docsPattern);
  
  if (docsMatch && docsMatch[1]) {
    fileId = docsMatch[1];
    return { 
      url: `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`,
      wasConverted: true 
    };
  }
  
  // If we can't parse the URL but it's a Google Drive URL, try our best guess
  const anyIdPattern = /([a-zA-Z0-9_-]{25,})/;
  const anyMatch = url.match(anyIdPattern);
  if (anyMatch && anyMatch[1]) {
    fileId = anyMatch[1];
    return {
      url: `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`,
      wasConverted: true
    };
  }
  
  return { url, wasConverted: false };
};
