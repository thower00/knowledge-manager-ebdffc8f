
import { renderHook, act } from '@testing-library/react-hooks';
import { useTextExtraction } from '../useTextExtraction';
import { fetchDocumentViaProxy, fetchDocumentFromDatabase } from '../../services/documentFetchService';
import { extractPdfText } from '../../utils/pdfUtils';
import { ProcessedDocument } from '@/types/document';
import { createMockPdfArrayBuffer } from '../../utils/__tests__/testUtils';
import { jest, describe, test, expect, beforeEach } from '@/src/setupTests';

// Mock service functions
jest.mock('../../services/documentFetchService', () => ({
  fetchDocumentViaProxy: jest.fn(),
  fetchDocumentFromDatabase: jest.fn(),
}));

jest.mock('../../utils/pdfUtils', () => ({
  extractPdfText: jest.fn(),
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
    })),
  },
}));

// Sample document for testing
const mockDocument: ProcessedDocument = {
  id: 'doc-123',
  title: 'Test Document',
  url: 'https://example.com/document.pdf',
  source_id: 'source-123',
  source_type: 'upload', 
  mime_type: 'application/pdf',
  status: 'completed',
  created_at: '2025-01-01T12:00:00Z',
};

describe('useTextExtraction Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (fetchDocumentViaProxy as jest.MockedFunction<typeof fetchDocumentViaProxy>).mockResolvedValue(createMockPdfArrayBuffer());
    (fetchDocumentFromDatabase as jest.MockedFunction<typeof fetchDocumentFromDatabase>).mockResolvedValue(createMockPdfArrayBuffer());
    (extractPdfText as jest.MockedFunction<typeof extractPdfText>).mockResolvedValue('Extracted text content');
  });

  test('should handle direct URL extraction successfully', async () => {
    // Setup
    const { result } = renderHook(() => useTextExtraction());
    
    // Execute
    act(() => {
      result.current.startExtraction({ url: 'https://example.com/test.pdf' });
    });
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(result.current.text).toBe('');
    expect(result.current.isExtractionComplete).toBe(false);
    expect(fetchDocumentViaProxy).toHaveBeenCalledWith('https://example.com/test.pdf', expect.any(Function));
  });

  test('should handle document database extraction successfully', async () => {
    const mockDocuments: ProcessedDocument[] = [{
      id: 'doc-123',
      title: 'Test Document',
      url: 'https://example.com/document.pdf',
      source_id: 'source-123',
      source_type: 'upload', 
      mime_type: 'application/pdf',
      status: 'completed' as const,
      created_at: '2025-01-01T12:00:00Z',
    }];
    
    // Setup
    const { result } = renderHook(() => useTextExtraction());
    
    // Execute
    act(() => {
      result.current.startExtraction({ documentId: mockDocuments[0].id });
    });
    
    expect(result.current.isLoading).toBe(true);
    expect(fetchDocumentFromDatabase).toHaveBeenCalledWith(mockDocuments[0].id);
    
    // Wait for extraction to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0)); // Flush promises
    });
    
    expect(extractPdfText).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isExtractionComplete).toBe(true);
    expect(result.current.text).toBe('Extracted text content');
  });

  test('should handle extraction errors properly', async () => {
    // Setup error mocks
    (fetchDocumentViaProxy as jest.MockedFunction<typeof fetchDocumentViaProxy>)
      .mockRejectedValue(new Error('Network error'));
    
    // Setup
    const { result } = renderHook(() => useTextExtraction());
    
    // Execute with invalid URL
    act(() => {
      result.current.startExtraction({ url: 'invalid-url' });
    });
    
    // Wait for extraction to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0)); // Flush promises
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.text).toBe('');
  });
});
