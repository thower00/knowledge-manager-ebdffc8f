
export interface DocumentSourceConfig {
  [key: string]: any;
  client_email?: string;
  private_key?: string;
  project_id?: string;
  private_key_id?: string;
  folder_id?: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  url?: string;
  source: string;
  sourceId: string;
  sourceType: string;
  mimeType: string;
  size?: number;
  createdAt: string;
  processedAt?: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Adding DocumentFile interface
export interface DocumentFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  webViewLink?: string;
}

// Add ProcessedDocument interface for database records
export interface ProcessedDocument {
  id: string;
  title: string;
  source_id: string;
  source_type: string;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  error?: string;
  size?: number;
  url?: string;
}
