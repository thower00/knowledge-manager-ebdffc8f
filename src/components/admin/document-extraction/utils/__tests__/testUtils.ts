
import { jest } from '../../../../../setupTests';

/**
 * Creates a mock PDF file as an ArrayBuffer
 */
export function createMockPdfArrayBuffer(): ArrayBuffer {
  // This is not a valid PDF file, just a placeholder for testing
  const bytes = new Uint8Array(10);
  bytes[0] = 0x25; // %
  bytes[1] = 0x50; // P
  bytes[2] = 0x44; // D
  bytes[3] = 0x46; // F
  
  return bytes.buffer;
}

// Additional test utilities can be added here
