
// Jest setup file

// Define global Jest types
import '@testing-library/jest-dom';

// Mock fetch globally if needed
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    text: () => Promise.resolve(''),
  }) as unknown as Response
);

// Mock URL class if needed for Node.js environment
if (typeof window === 'undefined') {
  global.URL = class URL {
    constructor(url: string) {
      if (!url.includes('http')) {
        throw new Error('Invalid URL');
      }
    }
  } as any;
}
