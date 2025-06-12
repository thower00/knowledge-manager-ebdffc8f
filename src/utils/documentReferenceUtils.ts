
import { convertGoogleDriveUrl } from '@/components/admin/document-extraction/utils/urlUtils';

export interface DocumentReference {
  title: string;
  viewUrl: string;
  downloadUrl?: string;
  isGoogleDrive: boolean;
}

export interface EnhancedContextSource {
  document_title: string;
  chunk_content: string;
  similarity?: number;
  document_url?: string;
  document_id?: string;
  chunk_id?: string;
}

/**
 * Extracts Google Drive file ID from various URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url.includes('drive.google.com')) {
    return null;
  }
  
  // Format: drive.google.com/file/d/FILE_ID/view
  const filePattern = /\/file\/d\/([^/]+)/;
  const fileMatch = url.match(filePattern);
  
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }
  
  // Format: drive.google.com/open?id=FILE_ID
  const openPattern = /\?id=([^&]+)/;
  const openMatch = url.match(openPattern);
  
  if (openMatch && openMatch[1]) {
    return openMatch[1];
  }
  
  // Fallback: look for any ID-like string
  const anyIdPattern = /([a-zA-Z0-9_-]{25,})/;
  const anyMatch = url.match(anyIdPattern);
  if (anyMatch && anyMatch[1]) {
    return anyMatch[1];
  }
  
  return null;
}

/**
 * Generates a download URL for Google Drive files
 */
export function generateGoogleDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Creates enhanced document references with view and download URLs
 */
export function createDocumentReference(source: EnhancedContextSource): DocumentReference {
  const { document_title, document_url } = source;
  
  if (!document_url) {
    return {
      title: document_title,
      viewUrl: '',
      isGoogleDrive: false
    };
  }
  
  const isGoogleDrive = document_url.includes('drive.google.com');
  
  if (isGoogleDrive) {
    const fileId = extractGoogleDriveFileId(document_url);
    
    if (fileId) {
      return {
        title: document_title,
        viewUrl: document_url,
        downloadUrl: generateGoogleDriveDownloadUrl(fileId),
        isGoogleDrive: true
      };
    }
  }
  
  // For non-Google Drive URLs, use the URL as both view and download
  return {
    title: document_title,
    viewUrl: document_url,
    downloadUrl: document_url,
    isGoogleDrive: false
  };
}

/**
 * Deduplicates document sources and creates enhanced references
 */
export function processDocumentSources(sources: EnhancedContextSource[]): DocumentReference[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  
  // Deduplicate by title and URL
  const uniqueSources = sources.reduce((acc, source) => {
    const key = `${source.document_title}|${source.document_url || 'no-url'}`;
    if (!acc.has(key)) {
      acc.set(key, source);
    }
    return acc;
  }, new Map<string, EnhancedContextSource>());
  
  // Convert to enhanced references and filter out sources without URLs
  return Array.from(uniqueSources.values())
    .filter(source => source.document_url)
    .map(source => createDocumentReference(source));
}

/**
 * Generates markdown text for document references (for chat responses)
 */
export function generateDocumentReferencesMarkdown(references: DocumentReference[]): string {
  if (references.length === 0) {
    return '';
  }
  
  const referenceLinks = references.map(ref => `- [${ref.title}](${ref.viewUrl})`);
  return '\n\n**Sources:**\n' + referenceLinks.join('\n');
}

/**
 * Legacy compatibility function for existing chat provider
 */
export function formatSourcesForChat(sources: EnhancedContextSource[]): string {
  const references = processDocumentSources(sources);
  return generateDocumentReferencesMarkdown(references);
}
