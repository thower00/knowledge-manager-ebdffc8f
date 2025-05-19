
// Jest setup file

// Define global Jest types
import '@testing-library/jest-dom';

// Make Jest globals available
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Create a proper typing for mock fetch that returns a promise
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    text: () => Promise.resolve(''),
  })
) as jest.MockedFunction<typeof fetch>;

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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface MockedFunction<T extends (...args: any[]) => any> 
      extends Mock<ReturnType<T>, Parameters<T>> {}
      
    // Add mock interface to fix typescript errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Mock<TReturn = any, TArgs extends any[] = any[]> {
      new (...args: TArgs): TReturn;
      (...args: TArgs): TReturn;
      mockImplementation(fn: (...args: TArgs) => TReturn): this;
      mockReturnValue(value: TReturn): this;
      mockResolvedValue(value: Awaited<TReturn>): this;
      mockRejectedValue(error: unknown): this;
      mockReturnThis(): this;
      mockRestore(): void;
      mockReset(): this;
      mockClear(): this;
      getMockName(): string;
      mock: {
        calls: TArgs[];
        instances: TReturn[];
        invocationCallOrder: number[];
        results: { type: string; value: TReturn }[];
      };
    }
  }
}

// Export Jest globals to be used in test files
export { jest, describe, test, expect, beforeEach, afterEach };

// Export a resetMocks helper function for tests
export const resetMocks = () => {
  jest.clearAllMocks();
};
