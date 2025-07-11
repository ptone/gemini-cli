/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { ChatHistoryService } from './ChatHistoryService.js';

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi
      .fn()
      .mockResolvedValue(
        JSON.stringify([{ role: 'user', parts: [{ text: 'hello' }] }]),
      ),
    readdir: vi.fn(),
    access: vi.fn().mockResolvedValue(undefined), // Mock fs.access to resolve for valid paths
  },
}));

describe('ChatHistoryService', () => {
  it('should save and load chat history', async () => {
    const service = new ChatHistoryService();
    await service.initialize();
    const conversation = [{ role: 'user', parts: [{ text: 'hello' }] }];
    await service.save(conversation, 'test');
    const loaded = await service.load('test');
    expect(loaded).toEqual(conversation);
  });

  it('should load chat history from a full path', async () => {
    const service = new ChatHistoryService();
    await service.initialize();
    const mockConversation = [{ role: 'model', parts: [{ text: 'hi' }] }];
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify(mockConversation),
    );

    const loaded = await service.load('/some/full/path/to/chat.json');
    expect(loaded).toEqual(mockConversation);
    expect(fs.readFile).toHaveBeenCalledWith(
      '/some/full/path/to/chat.json',
      'utf-8',
    );
  });
});
