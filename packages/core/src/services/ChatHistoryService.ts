/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Content } from '@google/genai';
import { getProjectTempDir } from '../utils/paths.js';

export class ChatHistoryService {
  private geminiDir: string | undefined;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.geminiDir = getProjectTempDir(process.cwd());
    if (!this.geminiDir) {
      return;
    }

    await fs.mkdir(this.geminiDir, { recursive: true });
    this.initialized = true;
  }

  private _checkpointPath(tag: string): string {
    if (!tag.length) {
      throw new Error('No checkpoint tag specified.');
    }
    if (!this.geminiDir) {
      throw new Error('Checkpoint file path not set.');
    }
    return path.join(this.geminiDir, `checkpoint-${tag}.json`);
  }

  async save(conversation: Content[], tag: string): Promise<void> {
    await this.initialize();
    if (!this.initialized) {
      console.error(
        'ChatHistoryService not initialized. Cannot save a checkpoint.',
      );
      return;
    }
    const path = this._checkpointPath(tag);
    try {
      await fs.writeFile(path, JSON.stringify(conversation, null, 2), 'utf-8');
    } catch (_error) {
      console.error('Error writing to checkpoint file:', _error);
    }
  }

  async load(tagOrPath: string): Promise<Content[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    let pathToLoad: string;
    if (path.isAbsolute(tagOrPath)) {
      pathToLoad = tagOrPath;
    } else {
      pathToLoad = this._checkpointPath(tagOrPath);
    }

    try {
      const fileContent = await fs.readFile(pathToLoad, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      if (!Array.isArray(parsedContent)) {
        console.warn(
          `Checkpoint file at ${pathToLoad} is not a valid JSON array. Returning empty checkpoint.`,
        );
        return [];
      }
      return parsedContent as Content[];
    } catch (_error) {
      const nodeError = _error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        console.error(
          `Failed to read or parse checkpoint file ${pathToLoad}:`,
          _error,
        );
      }
      return [];
    }
  }

  async list(): Promise<string[]> {
    if (!this.geminiDir) {
      return [];
    }
    try {
      const files = await fs.readdir(this.geminiDir);
      return files
        .filter(
          (file) => file.startsWith('checkpoint-') && file.endsWith('.json'),
        )
        .map((file) => file.replace('checkpoint-', '').replace('.json', ''));
    } catch (_err) {
      return [];
    }
  }
}
