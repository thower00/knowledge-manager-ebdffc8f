
import { renderHook, act } from '@testing-library/react-hooks';
import { useTextExtraction } from '../useTextExtraction';
import { fetchDocumentViaProxy, fetchDocumentFromDatabase } from '../../services/documentFetchService';
import { extractPdfText } from '../../utils/pdfUtils';
import { createMockPdfArrayBuffer } from '../../utils/__tests__/testUtils';

// Mock dependencies
jest.mock('../../services/documentFetchService', () => ({
  fetchDocumentViaProxy: jest.fn(),
  fetchDocumentFromDatabase: jest.fn(),
}));

jest.mock('../../utils/pdfUtils', () => ({
  extractPdfText: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

describe('useTextExtraction Hook', () => {
  const mockDocuments = [
    { 
      id: 'doc-1', 
      title: 'Test Document 1', 
      url: 'https://example.com/doc1.pdf',
      source_id: 'src-1',
      source_type: 'google-drive',
      mime_type: 'application/pdf',
      status: 'completed',
      created_at: '2023-05-01',
    },
    { 
      id: 'doc-2', 
      title: 'Test Document 2', 
      url: 'https://example.com/doc2.pdf',
      source_id: 'src-2',
      source_type: 'google-drive',
      mime_type: 'application/pdf',
      status: 'completed',
      created_at: '2023-05-02',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (fetchDocumentViaProxy as jest.Mock).mockResolvedValue(createMockPdfArrayBuffer());
    (fetchDocumentFromDatabase as jest.Mock).mockResolvedValue(null);
    (extractPdfText as jest.Mock).mockResolvedValue('Test extracted content');
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useTextExtraction());
    
    expect(result.current.selectedDocumentId).toBe('');
    expect(result.current.isExtracting).toBe(false);
    expect(result.current.extractedText).toBe('');
    expect(result.current.extractionProgress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.storeInDatabase).toBe(false);
  });

  test('should extract text from document via proxy', async () => {
    const { result } = renderHook(() => useTextExtraction());
    
    // Extract text from the first mock document
    await act(async () => {
      await result.current.extractTextFromDocument('doc-1', mockDocuments);
    });
    
    // Verify proxy was called with correct URL
    expect(fetchDocumentViaProxy).toHaveBeenCalledWith(
      'https://example.com/doc1.pdf',
      'Test Document 1',
      'doc-1',
      false
    );
    
    // Verify text extraction was called with the returned ArrayBuffer
    expect(extractPdfText).toHaveBeenCalled();
    
    // Verify state updates
    expect(result.current.extractedText).toBe('Test extracted content');
    expect(result.current.isExtracting).toBe(false);
    expect(result.current.extractionProgress).toBe(100);
    expect(result.current.error).toBeNull();
  });

  test('should extract text from document in database when storeInDatabase is true', async () => {
    // Mock that document exists in database
    (fetchDocumentFromDatabase as jest.Mock).mockResolvedValue(createMockPdfArrayBuffer());
    
    const { result } = renderHook(() => useTextExtraction());
    
    // Enable database storage
    act(() => {
      result.current.setStoreInDatabase(true);
    });
    
    // Extract text
    await act(async () => {
      await result.current.extractTextFromDocument('doc-1', mockDocuments);
    });
    
    // Verify database was checked first
    expect(fetchDocumentFromDatabase).toHaveBeenCalledWith('doc-1');
    
    // Proxy should not be called since document was found in database
    expect(fetchDocumentViaProxy).not.toHaveBeenCalled();
    
    // Verify text extraction was called
    expect(extractPdfText).toHaveBeenCalled();
    
    // Verify state updates
    expect(result.current.extractedText).toBe('Test extracted content');
    expect(result.current.isExtracting).toBe(false);
    expect(result.current.extractionProgress).toBe(100);
  });

  test('should fall back to proxy when document not in database', async () => {
    // Mock that document does not exist in database
    (fetchDocumentFromDatabase as jest.Mock).mockResolvedValue(null);
    
    const { result } = renderHook(() => useTextExtraction());
    
    // Enable database storage
    act(() => {
      result.current.setStoreInDatabase(true);
    });
    
    // Extract text
    await act(async () => {
      await result.current.extractTextFromDocument('doc-1', mockDocuments);
    });
    
    // Verify database was checked first
    expect(fetchDocumentFromDatabase).toHaveBeenCalledWith('doc-1');
    
    // Proxy should be called as fallback
    expect(fetchDocumentViaProxy).toHaveBeenCalled();
    
    // Verify text extraction was called
    expect(extractPdfText).toHaveBeenCalled();
  });

  test('should handle extraction errors', async () => {
    // Mock extraction error
    (fetchDocumentViaProxy as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useTextExtraction());
    
    // Attempt extraction
    await act(async () => {
      await result.current.extractTextFromDocument('doc-1', mockDocuments);
    });
    
    // Verify error state
    expect(result.current.error).toBe('Network error');
    expect(result.current.isExtracting).toBe(false);
    expect(result.current.extractedText).toBe('');
  });

  test('should retry extraction when retry is called', async () => {
    const { result } = renderHook(() => useTextExtraction());
    
    // Set selected document ID
    act(() => {
      result.current.setSelectedDocumentId('doc-1');
    });
    
    // Call retry
    await act(async () => {
      result.current.retryExtraction();
    });
    
    // Verify extraction was attempted
    expect(fetchDocumentViaProxy).toHaveBeenCalled();
  });

  test('should handle invalid document ID', async () => {
    const { result } = renderHook(() => useTextExtraction());
    
    // Try to extract with empty document ID
    await act(async () => {
      await result.current.extractTextFromDocument('', mockDocuments);
    });
    
    // Verify no extraction was attempted
    expect(fetchDocumentViaProxy).not.toHaveBeenCalled();
    expect(extractPdfText).not.toHaveBeenCalled();
  });
});
