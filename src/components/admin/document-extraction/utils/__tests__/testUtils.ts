
/**
 * Test utilities for PDF extraction tests
 */

/**
 * Creates a simple PDF-like ArrayBuffer for testing
 * This simulates the first few bytes of a PDF file (the signature)
 */
export const createMockPdfArrayBuffer = (): ArrayBuffer => {
  // PDF files start with "%PDF-" signature (hex: 25 50 44 46 2D)
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A]);
  return bytes.buffer;
};

/**
 * Creates a non-PDF ArrayBuffer for testing invalid files
 */
export const createMockNonPdfArrayBuffer = (): ArrayBuffer => {
  // Create a text buffer that doesn't have PDF signature
  const encoder = new TextEncoder();
  return encoder.encode("This is not a PDF file").buffer;
};

/**
 * Mock progress update function for testing
 */
export const mockProgressUpdate = jest.fn();

/**
 * Reset all mocks between tests
 */
export const resetMocks = () => {
  mockProgressUpdate.mockReset();
};
