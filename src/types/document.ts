
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
