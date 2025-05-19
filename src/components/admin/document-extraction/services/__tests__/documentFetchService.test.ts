
import {
  fetchDocumentViaProxy,
  fetchDocumentFromDatabase
} from '../documentFetchService';
import { jest, describe, test, expect, beforeEach } from '../../../../../setupTests';

// Define types for mocked Supabase responses
type SupabaseFunctionResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

type SupabaseDatabaseResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

// Create typed mock for supabase
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseMaybeSingle = jest.fn<() => Promise<SupabaseDatabaseResponse<any>>>();
const mockSupabaseFunctionsInvoke = jest.fn<(functionName: string, options: any) => Promise<SupabaseFunctionResponse<any>>>();

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: {
        invoke: mockSupabaseFunctionsInvoke,
      },
      from: mockSupabaseFrom.mockReturnValue({
        select: mockSupabaseSelect.mockReturnThis(),
        eq: mockSupabaseEq.mockReturnThis(),
        maybeSingle: mockSupabaseMaybeSingle,
        update: jest.fn().mockReturnThis(),
      }),
    },
  };
});

// Mock window.atob with proper typings
global.atob = jest.fn().mockImplementation(
  (str: string) => Buffer.from(str, 'base64').toString('binary')
) as jest.MockedFunction<typeof atob>;

describe('documentFetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDocumentViaProxy', () => {
    // Simulated base64 PDF data
    const mockBase64Data = 'JVBERi0xLjMK';
    
    test('should successfully fetch and decode document data', async () => {
      // Mock successful response with base64 data
      mockSupabaseFunctionsInvoke.mockResolvedValueOnce({
        data: mockBase64Data,
        error: null
      } as SupabaseFunctionResponse<string>);
      
      // Call the function
      const result = await fetchDocumentViaProxy('https://example.com/doc.pdf');
      
      // Verify correct data was sent to proxy function
      expect(mockSupabaseFunctionsInvoke).toHaveBeenCalledWith(
        'pdf-proxy',
        expect.objectContaining({
          body: expect.objectContaining({
            url: 'https://example.com/doc.pdf'
          })
        })
      );
      
      // Verify result is an ArrayBuffer
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(4); // Length of decoded mock data
      expect(new Uint8Array(result)[0]).toBe(37); // First byte of decoded mock data (J = 37)
      expect(new Uint8Array(result)[1]).toBe(86); // Second byte (V = 86)
    });
    
    test('should throw error when proxy function returns error', async () => {
      // Mock error response from edge function
      mockSupabaseFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Proxy error' }
      } as SupabaseFunctionResponse<null>);
      
      // Expect function to throw
      await expect(fetchDocumentViaProxy('https://example.com/doc.pdf')).rejects.toThrow('Proxy service error: Proxy error');
    });
    
    test('should throw error when no data is returned', async () => {
      // Mock response with no data
      mockSupabaseFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: null
      } as SupabaseFunctionResponse<null>);
      
      // Expect function to throw
      await expect(fetchDocumentViaProxy('https://example.com/doc.pdf')).rejects.toThrow('No data received from proxy');
    });
    
    test('should handle base64 decoding errors', async () => {
      // Mock invalid base64 data
      mockSupabaseFunctionsInvoke.mockResolvedValueOnce({
        data: 'invalid-base64!',
        error: null
      } as SupabaseFunctionResponse<string>);
      
      // Mock atob to throw error like it would in the browser
      (global.atob as jest.MockedFunction<typeof atob>).mockImplementationOnce(() => {
        throw new Error('Invalid character');
      });
      
      // Expect function to throw
      await expect(fetchDocumentViaProxy('https://example.com/doc.pdf')).rejects.toThrow('Failed to decode document data');
    });
  });

  describe('fetchDocumentFromDatabase', () => {
    // Simulated base64 PDF data
    const mockBase64Data = 'JVBERi0xLjMK';
    
    test('should successfully fetch document from database', async () => {
      // Mock successful database query
      mockSupabaseMaybeSingle.mockResolvedValueOnce({
        data: {
          binary_data: mockBase64Data,
          content_type: 'application/pdf'
        },
        error: null
      } as SupabaseDatabaseResponse<{binary_data: string, content_type: string}>);
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify correct database query
      expect(mockSupabaseFrom).toHaveBeenCalledWith('document_binaries');
      expect(mockSupabaseMaybeSingle).toHaveBeenCalled();
      
      // Verify result is correct
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result?.byteLength).toBe(4);
    });
    
    test('should return null when database query returns error', async () => {
      // Mock error from database
      mockSupabaseMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      } as SupabaseDatabaseResponse<null>);
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify result is null on error
      expect(result).toBeNull();
    });
    
    test('should return null when no document found', async () => {
      // Mock no document found
      mockSupabaseMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      } as SupabaseDatabaseResponse<null>);
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify result is null when no document
      expect(result).toBeNull();
    });
  });
});
