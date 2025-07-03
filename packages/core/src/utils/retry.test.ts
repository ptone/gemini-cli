/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from './retry.js';

// Helper to create a mock function that fails a certain number of times
const createFailingFunction = (
  failures: number,
  successValue: string = 'success',
  status = 500,
) => {
  let attempts = 0;
  return vi.fn(async () => {
    attempts++;
    if (attempts <= failures) {
      // Simulate a retryable error
      const error = new Error(
        `Simulated error attempt ${attempts}`,
      ) as Error & { status: number };
      error.status = status;
      throw error;
    }
    return successValue;
  });
};

// Custom error for testing non-retryable conditions
class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Suppress unhandled promise rejection warnings for tests that expect errors
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return the result on the first attempt if successful', async () => {
    const mockFn = createFailingFunction(0);
    const result = await retryWithBackoff(mockFn);
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed if failures are within maxAttempts', async () => {
    const mockFn = createFailingFunction(2);
    const promise = retryWithBackoff(mockFn, {
      maxAttempts: 3,
      initialDelayMs: 10,
    });

    await vi.runAllTimersAsync(); // Ensure all delays and retries complete

    const result = await promise;
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should throw an error if all attempts fail', async () => {
    const mockFn = createFailingFunction(3);

    const promise = retryWithBackoff(mockFn, {
      maxAttempts: 3,
      initialDelayMs: 10,
    });

    // Attach the rejection expectation to the promise *before* it can reject.
    const assertionPromise = expect(promise).rejects.toThrow(
      'Simulated error attempt 3',
    );

    // Advance timers to trigger retries and the eventual rejection.
    await vi.runAllTimersAsync();

    // Await the assertion to confirm the test was successful.
    await assertionPromise;

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not retry if shouldRetry returns false', async () => {
    const mockFn = vi.fn(async () => {
      throw new NonRetryableError('Non-retryable error');
    });
    const shouldRetry = (error: Error) => !(error instanceof NonRetryableError);

    const promise = retryWithBackoff(mockFn, {
      shouldRetry,
      initialDelayMs: 10,
    });

    await expect(promise).rejects.toThrow('Non-retryable error');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should use default shouldRetry if not provided, retrying on 429', async () => {
    const mockFn = createFailingFunction(2, 'success', 429);

    const promise = retryWithBackoff(mockFn, {
      maxAttempts: 2,
      initialDelayMs: 10,
    });

    const assertionPromise = expect(promise).rejects.toThrow(
      'Simulated error attempt 2',
    );

    await vi.runAllTimersAsync();

    await assertionPromise;

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should use default shouldRetry if not provided, not retrying on 400', async () => {
    const mockFn = createFailingFunction(1, 'success', 400);

    const promise = retryWithBackoff(mockFn, {
      maxAttempts: 2,
      initialDelayMs: 10,
    });
    await expect(promise).rejects.toThrow('Simulated error attempt 1');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxDelayMs', async () => {
    const mockFn = createFailingFunction(3);
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const promise = retryWithBackoff(mockFn, {
      maxAttempts: 4,
      initialDelayMs: 100,
      maxDelayMs: 250, // Max delay is less than 100 * 2 * 2 = 400
    });

    await vi.advanceTimersByTimeAsync(1000); // Advance well past all delays
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1] as number);

    // Delays should be around initial, initial*2, maxDelay (due to cap)
    // Jitter makes exact assertion hard, so we check ranges / caps
    expect(delays.length).toBe(3);
    expect(delays[0]).toBeGreaterThanOrEqual(100 * 0.7);
    expect(delays[0]).toBeLessThanOrEqual(100 * 1.3);
    expect(delays[1]).toBeGreaterThanOrEqual(200 * 0.7);
    expect(delays[1]).toBeLessThanOrEqual(200 * 1.3);
    // The third delay should be capped by maxDelayMs (250ms), accounting for jitter
    expect(delays[2]).toBeGreaterThanOrEqual(250 * 0.7);
    expect(delays[2]).toBeLessThanOrEqual(250 * 1.3);
  });

  it('should handle jitter correctly, ensuring varied delays', async () => {
    let mockFn = createFailingFunction(5);
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    // Run retryWithBackoff multiple times to observe jitter
    const runRetry = () =>
      retryWithBackoff(mockFn, {
        maxAttempts: 2, // Only one retry, so one delay
        initialDelayMs: 100,
        maxDelayMs: 1000,
      });

    // We expect rejections as mockFn fails 5 times
    const promise1 = runRetry();
    const assertionPromise1 = expect(promise1).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertionPromise1;

    const firstDelaySet = setTimeoutSpy.mock.calls.map(
      (call) => call[1] as number,
    );
    setTimeoutSpy.mockClear();

    mockFn = createFailingFunction(5);

    const promise2 = runRetry();
    const assertionPromise2 = expect(promise2).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertionPromise2;

    const secondDelaySet = setTimeoutSpy.mock.calls.map(
      (call) => call[1] as number,
    );

    // Check that the delays are not exactly the same due to jitter
    if (firstDelaySet.length > 0 && secondDelaySet.length > 0) {
      expect(firstDelaySet[0]).not.toBe(secondDelaySet[0]);
    } else {
      throw new Error('Delays were not captured for jitter test');
    }

    // Ensure delays are within the expected jitter range [70, 130] for initialDelayMs = 100
    [...firstDelaySet, ...secondDelaySet].forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(100 * 0.7);
      expect(d).toBeLessThanOrEqual(100 * 1.3);
    });
  });

  describe('Flash model fallback for OAuth users', () => {
    it('should trigger fallback for OAuth personal users after persistent 429 errors', async () => {
      const fallbackCallback = vi.fn().mockResolvedValue('gemini-2.5-flash');
      const mockFn = createFailingFunction(2, 'success', 429);

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        onPersistent429: fallbackCallback,
        authType: 'oauth-personal',
      });

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('success');

      expect(fallbackCallback).toHaveBeenCalledWith(
        'oauth-personal',
        expect.any(Error),
      );

      // 2 initial attempts + 1 after fallback
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should NOT trigger fallback for API key users', async () => {
      const fallbackCallback = vi.fn();
      const mockFn = createFailingFunction(3, 'success', 429);

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        onPersistent429: fallbackCallback,
        authType: 'gemini-api-key',
      });

      const assertionPromise = expect(promise).rejects.toThrow(
        'Simulated error attempt 3',
      );

      await vi.runAllTimersAsync();

      await assertionPromise;

      expect(fallbackCallback).not.toHaveBeenCalled();
    });

    it('should reset attempt counter and continue after successful fallback', async () => {
      let fallbackCalled = false;
      const fallbackCallback = vi.fn().mockImplementation(async () => {
        fallbackCalled = true;
        return 'gemini-2.5-flash';
      });

      const mockFn = vi.fn().mockImplementation(async () => {
        if (!fallbackCalled) {
          const error = new Error('Rate limit exceeded') as Error & {
            status: number;
          };
          error.status = 429;
          throw error;
        }
        return 'success';
      });

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        onPersistent429: fallbackCallback,
        authType: 'oauth-personal',
      });

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('success');
      expect(fallbackCallback).toHaveBeenCalledOnce();
    });

    it('should continue with original error if fallback is rejected', async () => {
      const fallbackCallback = vi.fn().mockResolvedValue(null); // User rejected fallback
      const mockFn = createFailingFunction(3, 'success', 429);

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        onPersistent429: fallbackCallback,
        authType: 'oauth-personal',
      });

      const assertionPromise = expect(promise).rejects.toThrow(
        'Simulated error attempt 3',
      );

      await vi.runAllTimersAsync();

      await assertionPromise;

      expect(fallbackCallback).toHaveBeenCalledWith(
        'oauth-personal',
        expect.any(Error),
      );
    });

    it('should handle mixed error types (only count consecutive 429s)', async () => {
      const fallbackCallback = vi.fn().mockResolvedValue('gemini-2.5-flash');
      let attempts = 0;
      let fallbackOccurred = false;

      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (fallbackOccurred) {
          return 'success';
        }
        if (attempts === 1) {
          // First attempt: 500 error (resets consecutive count)
          const error = new Error('Server error') as Error & { status: number };
          error.status = 500;
          throw error;
        } else {
          // Remaining attempts: 429 errors
          const error = new Error('Rate limit exceeded') as Error & {
            status: number;
          };
          error.status = 429;
          throw error;
        }
      });

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 5,
        initialDelayMs: 100,
        onPersistent429: async (authType?: string, error?: Error) => {
          fallbackOccurred = true;
          return await fallbackCallback(authType, error);
        },
        authType: 'oauth-personal',
      });

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('success');

      // Should trigger fallback after 2 consecutive 429s (attempts 2-3)
      expect(fallbackCallback).toHaveBeenCalledWith(
        'oauth-personal',
        expect.any(Error),
      );
    });
  });
});
