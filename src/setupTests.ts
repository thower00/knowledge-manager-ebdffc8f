
// Jest setup file

// Define global Jest types
import '@testing-library/jest-dom';

// Make Jest globals available
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

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

// TypeScript augmentations to make jest.MockedFunction available
declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface MockedFunction<T extends (...args: any[]) => any> 
      extends jest.Mock<ReturnType<T>, Parameters<T>> {}
  }
}

// Export Jest globals to be used in test files
export { jest, describe, test, expect, beforeEach, afterEach };
