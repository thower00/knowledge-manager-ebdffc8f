
import {
  fetchDocumentViaProxy,
  fetchDocumentFromDatabase
} from '../documentFetchService';
import { jest, describe, test, expect, beforeEach } from '../../../../../setupTests';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: {
        invoke: jest.fn(),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
      }),
    },
  };
});

// Mock window.atob since it's not available in JSDOM
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString('binary')) as jest.MockedFunction<typeof global.atob>;

describe('documentFetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDocumentViaProxy', () => {
    // Simulated base64 PDF data
    const mockBase64Data = 'JVBERi0xLjMK';
    
    test('should successfully fetch and decode document data', async () => {
      // Mock successful response with base64 data
      const supabaseFunctions = require('@/integrations/supabase/client').supabase.functions;
      (supabaseFunctions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: mockBase64Data,
        error: null
      });
      
      // Call the function
      const result = await fetchDocumentViaProxy('https://example.com/doc.pdf');
      
      // Verify correct data was sent to proxy function
      expect(supabaseFunctions.invoke).toHaveBeenCalledWith(
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
      const supabaseFunctions = require('@/integrations/supabase/client').supabase.functions;
      (supabaseFunctions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Proxy error' }
      });
      
      // Expect function to throw
      await expect(fetchDocumentViaProxy('https://example.com/doc.pdf')).rejects.toThrow('Proxy service error: Proxy error');
    });
    
    test('should throw error when no data is returned', async () => {
      // Mock response with no data
      const supabaseFunctions = require('@/integrations/supabase/client').supabase.functions;
      (supabaseFunctions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: null,
        error: null
      });
      
      // Expect function to throw
      await expect(fetchDocumentViaProxy('https://example.com/doc.pdf')).rejects.toThrow('No data received from proxy');
    });
    
    test('should handle base64 decoding errors', async () => {
      // Mock invalid base64 data
      const supabaseFunctions = require('@/integrations/supabase/client').supabase.functions;
      (supabaseFunctions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: 'invalid-base64!',
        error: null
      });
      
      // Mock atob to throw error like it would in the browser
      (global.atob as jest.MockedFunction<typeof global.atob>).mockImplementationOnce(() => {
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
      const supabaseFrom = require('@/integrations/supabase/client').supabase.from;
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          binary_data: mockBase64Data,
          content_type: 'application/pdf'
        },
        error: null
      });
      
      (supabaseFrom().select().eq().maybeSingle as jest.MockedFunction<any>) = mockMaybeSingle;
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify correct database query
      expect(supabaseFrom).toHaveBeenCalledWith('document_binaries');
      expect(mockMaybeSingle).toHaveBeenCalled();
      
      // Verify result is correct
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(4);
    });
    
    test('should return null when database query returns error', async () => {
      // Mock error from database
      const supabaseFrom = require('@/integrations/supabase/client').supabase.from;
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      
      (supabaseFrom().select().eq().maybeSingle as jest.MockedFunction<any>) = mockMaybeSingle;
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify result is null on error
      expect(result).toBeNull();
    });
    
    test('should return null when no document found', async () => {
      // Mock no document found
      const supabaseFrom = require('@/integrations/supabase/client').supabase.from;
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });
      
      (supabaseFrom().select().eq().maybeSingle as jest.MockedFunction<any>) = mockMaybeSingle;
      
      // Call the function
      const result = await fetchDocumentFromDatabase('doc123');
      
      // Verify result is null when no document
      expect(result).toBeNull();
    });
  });
});
