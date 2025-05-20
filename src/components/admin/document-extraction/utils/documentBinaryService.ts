
/**
 * This is a placeholder module that used to handle document binary storage.
 * The functionality has been removed as we now use direct references to external storage (like Google Drive).
 * @deprecated Document binary storage has been removed in favor of external references
 */

console.warn('documentBinaryService.ts: This module has been deprecated as binary storage has been removed in favor of external references.');

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export function checkDocumentBinaryExists(): Promise<boolean> {
  console.warn('checkDocumentBinaryExists: This function is deprecated as binary data storage has been removed.');
  return Promise.resolve(false);
}

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export function getDocumentBinaryStats() {
  console.warn('getDocumentBinaryStats: This function is deprecated as binary data storage has been removed.');
  return Promise.resolve({
    totalCount: 0,
    totalSize: 0,
    averageSize: 0,
    error: "Document binary storage has been removed in favor of external references"
  });
}

/**
 * This is a placeholder for compatibility. This functionality has been removed.
 * @deprecated Document binary storage has been removed
 */
export function deleteDocumentBinary(): Promise<boolean> {
  console.warn('deleteDocumentBinary: This function is deprecated as binary data storage has been removed.');
  return Promise.resolve(false);
}
