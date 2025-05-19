import { validatePdfUrl, convertGoogleDriveUrl } from '../urlUtils';
import { jest, describe, test, expect } from '../../../../../setupTests';

describe('urlUtils', () => {
  describe('validatePdfUrl', () => {
    test('should validate empty URL', () => {
      const result = validatePdfUrl('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('empty');
    });

    test('should reject invalid URL format', () => {
      const result = validatePdfUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid URL format');
    });

    test('should validate direct PDF URL', () => {
      const result = validatePdfUrl('https://example.com/document.pdf');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeNull();
    });

    test('should validate Google Drive URL with alt=media', () => {
      const url = 'https://drive.google.com/uc?export=download&id=ABC123&alt=media';
      const result = validatePdfUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.message).toBeNull();
    });

    test('should reject Google Drive URL without alt=media', () => {
      const url = 'https://drive.google.com/file/d/ABC123/view';
      const result = validatePdfUrl(url);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('alt=media');
    });

    test('should reject non-PDF URL', () => {
      const result = validatePdfUrl('https://example.com/document.docx');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('PDF');
    });
  });

  describe('convertGoogleDriveUrl', () => {
    test('should not modify non-Google Drive URLs', () => {
      const url = 'https://example.com/file.pdf';
      const result = convertGoogleDriveUrl(url);
      expect(result.url).toBe(url);
      expect(result.wasConverted).toBe(false);
    });

    test('should not modify Google Drive URLs already in direct download format', () => {
      const url = 'https://drive.google.com/uc?export=download&id=ABC123&alt=media';
      const result = convertGoogleDriveUrl(url);
      expect(result.url).toBe(url);
      expect(result.wasConverted).toBe(false);
    });

    test('should convert file/d format Google Drive URLs', () => {
      const url = 'https://drive.google.com/file/d/ABC123/view';
      const result = convertGoogleDriveUrl(url);
      expect(result.url).toContain('uc?export=download&id=ABC123&alt=media');
      expect(result.wasConverted).toBe(true);
    });

    test('should convert open?id format Google Drive URLs', () => {
      const url = 'https://drive.google.com/open?id=ABC123';
      const result = convertGoogleDriveUrl(url);
      expect(result.url).toContain('uc?export=download&id=ABC123&alt=media');
      expect(result.wasConverted).toBe(true);
    });

    test('should handle unrecognized Google Drive URL formats', () => {
      const url = 'https://drive.google.com/unknown/format';
      const result = convertGoogleDriveUrl(url);
      expect(result.url).toBe(url);
      expect(result.wasConverted).toBe(false);
    });
  });
});
