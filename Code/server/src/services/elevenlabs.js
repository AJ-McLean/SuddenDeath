import fetch from 'node-fetch';
import { audioCache } from './audioCache.js';
import { generateJobId } from '../utils/crypto.js';

// ElevenLabs configuration from CLAUDE.md
const ELEVENLABS_CONFIG = {
  voiceId: 'Zs6wtWIJi6OPcz243n9Z',
  modelId: 'eleven_v3',
  outputFormat: 'mp3_44100_128'
};

export class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.pendingJobs = new Map(); // Track ongoing generation jobs
  }

  validateConfig() {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }

  async generateSpeech(text) {
    this.validateConfig();
    
    const { voiceId, modelId, outputFormat } = ELEVENLABS_CONFIG;
    const cacheKey = audioCache.getCacheKey(text, voiceId, modelId, outputFormat);
    
    // Check if already cached
    const cachedPath = await audioCache.get(cacheKey);
    if (cachedPath) {
      return {
        audioUrl: `/api/audio/dynamic/${cacheKey}`,
        cached: true
      };
    }
    
    // Start generation
    const jobId = generateJobId();
    this.startGeneration(jobId, text, cacheKey);
    
    return {
      jobId,
      pollUrl: `/api/audio/job/${jobId}`,
      cached: false
    };
  }

  async startGeneration(jobId, text, cacheKey) {
    try {
      this.pendingJobs.set(jobId, { 
        status: 'generating', 
        progress: 0, 
        cacheKey,
        text 
      });

      const response = await fetch(`${this.baseUrl}/text-to-speech/${ELEVENLABS_CONFIG.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_CONFIG.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          output_format: ELEVENLABS_CONFIG.outputFormat
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Store in cache
      await audioCache.store(cacheKey, audioBuffer);
      
      // Update job status
      this.pendingJobs.set(jobId, {
        status: 'completed',
        progress: 100,
        cacheKey,
        audioUrl: `/api/audio/dynamic/${cacheKey}`,
        text
      });

    } catch (error) {
      console.error('TTS generation failed:', error);
      this.pendingJobs.set(jobId, {
        status: 'failed',
        error: error.message,
        cacheKey,
        text
      });
    }
  }

  getJobStatus(jobId) {
    return this.pendingJobs.get(jobId) || null;
  }

  cleanup() {
    // Remove completed/failed jobs older than 5 minutes
    const cutoff = Date.now() - (5 * 60 * 1000);
    for (const [jobId, job] of this.pendingJobs.entries()) {
      if (job.status !== 'generating' && (job.completedAt || 0) < cutoff) {
        this.pendingJobs.delete(jobId);
      }
    }
  }
}

// Create singleton instance  
export const elevenLabs = new ElevenLabsService();