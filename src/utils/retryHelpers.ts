import { RETRY_CONFIG, TIMEOUTS } from '@/config/constants';

/**
 * Utility functions for handling retries and backoff strategies
 */

export interface RetryOptions {
  maxRetries?: number;
  backoffIntervals?: readonly number[];
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Executes a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.MAX_RETRIES,
    backoffIntervals = RETRY_CONFIG.BACKOFF_INTERVALS,
    timeoutMs = TIMEOUTS.API_REQUEST,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply timeout to the operation
      if (timeoutMs > 0) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
          })
        ]);
      } else {
        return await operation();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate wait time for backoff
      const waitTime = backoffIntervals[attempt] || 
        (RETRY_CONFIG.BACKOFF_MULTIPLIER * Math.pow(2, attempt));
      
      // Call retry callback if provided
      onRetry?.(attempt + 1, lastError);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

/**
 * Creates a delay for the specified duration
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
}