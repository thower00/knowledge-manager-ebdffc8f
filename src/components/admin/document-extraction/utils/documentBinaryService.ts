import { supabase } from "@/integrations/supabase/client";

console.warn('documentBinaryService.ts: This module has been deprecated as binary data storage has been removed.');

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export async function checkDocumentBinaryExists(): Promise<boolean> {
  console.warn('checkDocumentBinaryExists: This function is deprecated as binary data storage has been removed.');
  return false;
}

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export async function getDocumentBinaryStats() {
  console.warn('getDocumentBinaryStats: This function is deprecated as binary data storage has been removed.');
  return {
    totalCount: 0,
    totalSize: 0,
    averageSize: 0,
    error: "Document binary storage has been removed"
  };
}

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export async function deleteDocumentBinary(): Promise<boolean> {
  console.warn('deleteDocumentBinary: This function is deprecated as binary data storage has been removed.');
  return false;
}
