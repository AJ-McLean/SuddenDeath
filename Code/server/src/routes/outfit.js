import express from 'express';
import { geminiService } from '../services/gemini.js';
import { elevenLabs } from '../services/elevenlabs.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// POST /api/analyze-outfit - Analyze outfit from camera capture
router.post('/analyze-outfit', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        error: 'Image data is required'
      });
    }

    console.log('📸 Analyzing outfit...');
    
    // Cache the image for debugging
    try {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const imagePath = join(__dirname, `../../../../Audio/Cache/captured_image_${timestamp}.jpg`);
      writeFileSync(imagePath, imageBuffer);
      console.log(`💾 Image cached at: ${imagePath}`);
      console.log(`📊 Image size: ${imageBuffer.length} bytes`);
    } catch (cacheError) {
      console.error('Failed to cache image:', cacheError);
    }
    
    const geminiResult = await geminiService.analyzeOutfit(image);
    
    console.log('🤖 Wheatley says:', geminiResult.wittyOneLiner);
    console.log('🎙️ Converting to speech...');
    
    // Send Wheatley's response to ElevenLabs TTS
    const ttsResult = await elevenLabs.generateSpeech(geminiResult.wittyOneLiner);
    
    res.json({
      wittyOneLiner: geminiResult.wittyOneLiner,
      audioUrl: ttsResult.audioUrl,
      jobId: ttsResult.jobId,
      pollUrl: ttsResult.pollUrl,
      cached: ttsResult.cached
    });
    
  } catch (error) {
    console.error('Outfit analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze outfit',
      message: error.message
    });
  }
});

export default router;