/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Config } from '../config/config.js';
import { createSimulated429Error, resetRequestCounter } from './testUtils.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { retryWithBackoff } from './retry.js';
import { AuthType } from '../core/contentGenerator.js';

describe('Flash Fallback Integration', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config({
      sessionId: 'test-session',
      targetDir: '/test',
      debugMode: false,
      cwd: '/test',
      model: 'gemini-2.5-pro',
    });

    resetRequestCounter();
  });

  it('should automatically accept fallback', async () => {
    const flashFallbackHandler = async (): Promise<boolean> => true;

    config.setFlashFallbackHandler(flashFallbackHandler);

    const result = await config.flashFallbackHandler!(
      'gemini-2.5-pro',
      DEFAULT_GEMINI_FLASH_MODEL,
      undefined,
    );

    expect(result).toBe(true);
  });

  it('should trigger fallback after 2 consecutive 429 errors for OAuth users', async () => {
    let fallbackCalled = false;
    let fallbackModel = '';

    const mockApiCall = vi
      .fn()
      .mockRejectedValueOnce(createSimulated429Error())
      .mockRejectedValueOnce(createSimulated429Error())
      .mockResolvedValueOnce('success after fallback');

    const mockFallbackHandler = vi.fn(
      async (_authType?: string, _error?: Error) => {
        fallbackCalled = true;
        fallbackModel = DEFAULT_GEMINI_FLASH_MODEL;
        return fallbackModel;
      },
    );

    const result = await retryWithBackoff(mockApiCall, {
      maxAttempts: 2,
      initialDelayMs: 1,
      maxDelayMs: 10,
      onPersistent429: mockFallbackHandler,
      authType: AuthType.LOGIN_WITH_GOOGLE,
    });

    expect(fallbackCalled).toBe(true);
    expect(fallbackModel).toBe(DEFAULT_GEMINI_FLASH_MODEL);
    expect(mockFallbackHandler).toHaveBeenCalledWith(
      AuthType.LOGIN_WITH_GOOGLE,
      expect.any(Error),
    );
    expect(result).toBe('success after fallback');
    // 2 failures, then fallback triggered, then 1 success after retry reset
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });

  it('should not trigger fallback for API key users', async () => {
    const mockFallbackHandler = vi.fn();
    const mockApiCall = vi.fn().mockRejectedValue(createSimulated429Error());

    await expect(
      retryWithBackoff(mockApiCall, {
        maxAttempts: 5,
        initialDelayMs: 10,
        maxDelayMs: 100,
        onPersistent429: mockFallbackHandler,
        authType: AuthType.USE_GEMINI, // API key auth type
      }),
    ).rejects.toThrow('Rate limit exceeded');

    expect(mockFallbackHandler).not.toHaveBeenCalled();
  });
});
