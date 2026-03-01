import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from '../utils/crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../../../Audio/Cache');

// Ensure cache directory exists
await fs.mkdir(CACHE_DIR, { recursive: true });

export class AudioCache {
  constructor() {
    // In-memory tracking of cached files
    this.cache = new Map();
  }

  getCacheKey(text, voice, model, format) {
    return createHash(text, voice, model, format);
  }

  getCachePath(cacheKey) {
    return join(CACHE_DIR, `${cacheKey}.mp3`);
  }

  async exists(cacheKey) {
    if (this.cache.has(cacheKey)) {
      return true;
    }

    try {
      await fs.access(this.getCachePath(cacheKey));
      this.cache.set(cacheKey, true);
      return true;
    } catch {
      return false;
    }
  }

  async store(cacheKey, audioBuffer) {
    const filePath = this.getCachePath(cacheKey);
    await fs.writeFile(filePath, audioBuffer);
    this.cache.set(cacheKey, true);
    return filePath;
  }

  async get(cacheKey) {
    if (await this.exists(cacheKey)) {
      return this.getCachePath(cacheKey);
    }
    return null;
  }

  async delete(cacheKey) {
    const filePath = this.getCachePath(cacheKey);
    try {
      await fs.unlink(filePath);
      this.cache.delete(cacheKey);
      return true;
    } catch {
      return false;
    }
  }

  // Clean up old cache files (could be run periodically)
  async cleanup(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(CACHE_DIR);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = join(CACHE_DIR, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            const cacheKey = file.replace('.mp3', '');
            this.cache.delete(cacheKey);
          }
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}

// Create singleton instance
export const audioCache = new AudioCache();