
/**
 * Check if the buffer is likely a PDF based on its initial bytes
 * @param buffer ArrayBuffer to check
 * @returns boolean indicating if the file is likely a PDF
 */
export function isPdfBuffer(buffer: ArrayBuffer): boolean {
  // PDF files start with "%PDF-"
  const header = new Uint8Array(buffer, 0, 5);
  const headerString = String.fromCharCode(...header);
  return headerString === '%PDF-';
}
