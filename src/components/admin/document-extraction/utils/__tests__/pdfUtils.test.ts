
import { extractPdfText } from '../pdfUtils';
import { createMockPdfArrayBuffer } from './testUtils';
import * as pdfjs from 'pdfjs-dist';
import { jest, describe, test, expect, beforeEach, resetMocks } from '../../../../../setupTests';

// Mock the PDF.js library
jest.mock('pdfjs-dist', () => {
  return {
    getDocument: jest.fn(),
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  };
});

describe('pdfUtils', () => {
  // Define mockPdfDoc outside beforeEach so it's accessible in all tests
  const mockPdfDoc = {
    numPages: 2,
    getPage: jest.fn(),
  };

  const mockPage = {
    getTextContent: jest.fn(),
  };

  // Define mockProgressUpdate function
  const mockProgressUpdate = jest.fn();

  beforeEach(() => {
    resetMocks();
    
    // Setup PDF.js mock with proper type assertions
    mockPage.getTextContent.mockResolvedValue({
      items: [
        { str: 'Test ' },
        { str: 'content ' },
        { str: 'page ' },
      ],
    } as any);

    mockPdfDoc.getPage.mockResolvedValue(mockPage as any);
    
    // Use proper type assertion for the mock
    (pdfjs.getDocument as jest.Mock).mockReturnValue({
      promise: Promise.resolve(mockPdfDoc as any)
    });
  });

  test('should reject non-PDF data', async () => {
    const nonPdfData = createMockPdfArrayBuffer();
    
    await expect(extractPdfText(nonPdfData, mockProgressUpdate))
      .rejects
      .toThrow(/not a valid PDF/);
  });

  test('should extract text from valid PDF', async () => {
    const pdfData = createMockPdfArrayBuffer();
    
    const result = await extractPdfText(pdfData, mockProgressUpdate);
    
    // Verify progress updates
    expect(mockProgressUpdate).toHaveBeenCalledWith(expect.any(Number));
    
    // Verify content extraction
    expect(result).toContain('PDF document loaded');
    expect(result).toContain('Page 1');
    expect(result).toContain('Test content page');
  });

  test('should handle empty PDF pages', async () => {
    const pdfData = createMockPdfArrayBuffer();
    
    // Mock empty page content
    mockPage.getTextContent.mockResolvedValue({ items: [] } as any);
    
    const result = await extractPdfText(pdfData, mockProgressUpdate);
    
    expect(result).toContain('PDF document loaded');
    expect(result).toContain('Page 1');
    // Should contain empty page markers but not actual content
    expect(result).not.toContain('Test content');
  });

  test('should update progress during extraction', async () => {
    const pdfData = createMockPdfArrayBuffer();
    
    await extractPdfText(pdfData, mockProgressUpdate);
    
    // Check progress was updated multiple times (at least for start, pdf load, and each page)
    expect(mockProgressUpdate).toHaveBeenCalledTimes(expect.anything() as unknown as number);
    expect(mockProgressUpdate.mock.calls.length).toBeGreaterThan(3);
  });
});
