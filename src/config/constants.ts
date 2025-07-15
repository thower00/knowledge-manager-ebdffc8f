// Application configuration constants
// Centralized configuration to avoid hardcoded values throughout the application

export const SUPABASE_CONFIG = {
  URL: "https://sxrinuxxlmytddymjbmr.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0"
} as const;

export const TIMEOUTS = {
  // PDF processing timeouts (in milliseconds)
  PDF_LOADING: 30000,
  PDF_EXTRACTION: 45000,
  PDF_PROCESSING: 20000,
  
  // Network timeouts
  PROXY_CONNECTION_CHECK: 30000,
  API_REQUEST: 15000,
  
  // UI feedback timeouts
  SUCCESS_MESSAGE: 3000,
  TOAST_DURATION: 5000,
  
  // Sync and polling
  DATABASE_SYNC_WAIT: 3000,
  STATUS_SYNC_TIMEOUT: 10000,
  POLL_INTERVAL: 1000,
  
  // Auth related
  AUTH_REDIRECT_DELAY: 3000,
  SESSION_CHECK_DELAY: 800
} as const;

export const RETRY_CONFIG = {
  // Default retry attempts
  MAX_RETRIES: 2,
  CONNECTION_RETRIES: 3,
  
  // Backoff intervals (in milliseconds)
  BACKOFF_INTERVALS: [750, 1500, 3000] as const,
  
  // Exponential backoff base
  BACKOFF_MULTIPLIER: 1000
} as const;

export const DOCUMENT_CONFIG = {
  // Default chunk sizes for different providers
  DEFAULT_CHUNK_SIZES: {
    OPENAI: "1000",
    COHERE: "1500",
    HUGGINGFACE: "1500",
    LOCAL: "800"
  },
  
  // Content processing
  STANDARD_CONTENT_LENGTH: 1500,
  
  // File processing
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_MIME_TYPES: ["application/pdf"] as const
} as const;

export const API_ENDPOINTS = {
  FUNCTIONS: {
    PDF_PROXY: "/functions/v1/pdf-proxy",
    PROCESS_PDF: "/functions/v1/process-pdf",
    CHAT_COMPLETION: "/functions/v1/chat-completion",
    CREATE_USER: "/functions/v1/create-user",
    DELETE_USER: "/functions/v1/delete-user"
  }
} as const;

export const UI_CONFIG = {
  // Animation durations
  LOADING_SPINNER_MIN_DURATION: 500,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  
  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  INPUT_DEBOUNCE: 500
} as const;