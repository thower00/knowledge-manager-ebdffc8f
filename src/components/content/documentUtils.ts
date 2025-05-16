
import { DocumentSourceConfig } from "@/types/document";
import { fetchSourceConfig } from "./utils/configService";
import { fetchGoogleDriveDocuments, processGoogleDriveDocuments } from "./utils/googleDriveService";
import { fetchProcessedDocuments } from "./utils/documentDbService";

/**
 * Process selected documents based on their source
 */
export async function processSelectedDocuments(
  documentSource: string, 
  sourceConfig: DocumentSourceConfig | null,
  selectedDocuments: string[]
) {
  if (!sourceConfig) {
    return { success: false, message: "Missing configuration" };
  }
  
  if (selectedDocuments.length === 0) {
    return { success: false, message: "No documents selected" };
  }
  
  if (documentSource === "google-drive") {
    return processGoogleDriveDocuments(sourceConfig, selectedDocuments);
  }

  return { success: false, message: "Unsupported document source" };
}

// Re-export all utility functions for backward compatibility
export {
  fetchSourceConfig,
  fetchGoogleDriveDocuments,
  fetchProcessedDocuments
};
