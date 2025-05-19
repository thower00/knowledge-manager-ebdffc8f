
import { fetchDocumentViaProxy, fetchDocumentFromDatabase } from '../documentFetchService';
import { supabase } from '@/integrations/supabase/client';
import { createMockPdfArrayBuffer } from '../../utils/__tests__/testUtils';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
    })),
  },
}));

// Mock window.atob for base64 conversion
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'));

describe('Document Fetch Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDocumentViaProxy', () => {
    const mockUrl = 'https://example.com/document.pdf';
    const mockBase64 = 'JVBERi0xLjQK'; // Base64 for %PDF-1.4
    
    test('should fetch document successfully from proxy', async () => {
      // Mock successful proxy response
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockBase64,
        error: null,
      });
      
      const result = await fetchDocumentViaProxy(mockUrl);
      
      // Verify Supabase function was called with correct params
      expect(supabase.functions.invoke).toHaveBeenCalledWith('pdf-proxy', {
        body: expect.objectContaining({ 
          url: mockUrl,
          storeInDatabase: false,
        }),
      });
      
      // Verify correct conversion from base64 to ArrayBuffer
      expect(result).toBeInstanceOf(ArrayBuffer);
      const view = new Uint8Array(result);
      expect(view[0]).toBe(0x25); // %
      expect(view[1]).toBe(0x50); // P
      expect(view[2]).toBe(0x44); // D
      expect(view[3]).toBe(0x46); // F
    });

    test('should handle proxy service errors', async () => {
      // Mock proxy error response
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });
      
      await expect(fetchDocumentViaProxy(mockUrl))
        .rejects
        .toThrow(/Proxy service error/);
    });

    test('should handle empty data response', async () => {
      // Mock empty data response
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });
      
      await expect(fetchDocumentViaProxy(mockUrl))
        .rejects
        .toThrow(/No data received/);
    });

    test('should handle invalid base64 data', async () => {
      // Mock invalid base64 data
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: 'not-valid-base64!',
        error: null,
      });
      
      // Mock atob to throw on invalid base64
      (global.atob as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid base64');
      });
      
      await expect(fetchDocumentViaProxy(mockUrl))
        .rejects
        .toThrow(/Failed to decode/);
    });
  });

  describe('fetchDocumentFromDatabase', () => {
    const mockDocId = 'doc-123';
    const mockBase64 = 'JVBERi0xLjQK'; // Base64 for %PDF-1.4
    
    test('should fetch document from database successfully', async () => {
      // Mock successful database response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                binary_data: mockBase64,
                content_type: 'application/pdf',
              },
              error: null,
            }),
          }),
        }),
      });
      
      const result = await fetchDocumentFromDatabase(mockDocId);
      
      // Verify database was queried with correct document ID
      expect(supabase.from).toHaveBeenCalledWith('document_binaries');
      
      // Verify result is an ArrayBuffer with PDF signature
      expect(result).toBeInstanceOf(ArrayBuffer);
      const view = new Uint8Array(result as ArrayBuffer);
      expect(view[0]).toBe(0x25); // %
      expect(view[1]).toBe(0x50); // P
      expect(view[2]).toBe(0x44); // D
      expect(view[3]).toBe(0x46); // F
    });

    test('should return null when document not found in database', async () => {
      // Mock empty database response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });
      
      const result = await fetchDocumentFromDatabase(mockDocId);
      expect(result).toBeNull();
    });

    test('should return null on database error', async () => {
      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });
      
      const result = await fetchDocumentFromDatabase(mockDocId);
      expect(result).toBeNull();
    });
  });
});
