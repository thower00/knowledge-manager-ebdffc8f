
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

  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    // Check if it's in direct download format (contains 'alt=media')
    if (!url.includes('alt=media')) {
      return { 
        isValid: false, 
        message: "Google Drive URL must be in direct download format (include '?alt=media')"
      };
    }
  }
  
  // Check for common PDF extensions in the URL
  const isPdfExtension = url.toLowerCase().endsWith('.pdf');
  const isPdfContentType = url.toLowerCase().includes('pdf') || 
                           url.includes('application/pdf');
  
  // For Google Drive or URLs with known content type, we can be more lenient
  if (url.includes('drive.google.com') || isPdfContentType) {
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
 * @param url Original Google Drive URL
 * @returns Converted URL for direct download
 */
export const convertGoogleDriveUrl = (url: string): { 
  url: string; 
  wasConverted: boolean;
} => {
  if (!url.includes('drive.google.com')) {
    return { url, wasConverted: false }; // Not a Google Drive URL
  }
  
  // Already in direct download format
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
  
  return { url, wasConverted: false };
};
