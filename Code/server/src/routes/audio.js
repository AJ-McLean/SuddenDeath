import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { elevenLabs } from '../services/elevenlabs.js';
import { audioCache } from '../services/audioCache.js';
import { gameLogic } from '../services/gameLogic.js';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// GET /api/audio/job/:id - Poll TTS job status
router.get('/job/:id', (req, res) => {
  try {
    const { id } = req.params;
    const jobStatus = elevenLabs.getJobStatus(id);
    
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(jobStatus);
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/audio/start - Trigger dynamic TTS generation (when pre audio starts)
router.post('/start', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    // Get the session to retrieve pending dynamic text
    const session = await gameLogic.getOrCreateSession(sessionId);
    
    if (!session.pendingDynamicText) {
      return res.status(400).json({
        error: 'No pending dynamic text for this session'
      });
    }

    // Now generate TTS for the pending text
    const result = await elevenLabs.generateSpeech(session.pendingDynamicText);
    
    // Clear the pending text since we've started generation
    session.pendingDynamicText = null;
    
    return res.json(result);
    
  } catch (error) {
    console.error('Audio start error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/audio/generate - Direct TTS generation without sessions
router.post('/generate', async (req, res) => {
  try {
    const { text, voice_id } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'text is required'
      });
    }

    console.log(`🎙️ Generating direct TTS for: "${text}"`);
    
    // Generate TTS directly
    const result = await elevenLabs.generateSpeech(text);
    
    return res.json(result);
    
  } catch (error) {
    console.error('Direct TTS generation error:', error);
    res.status(500).json({
      error: 'Failed to generate TTS',
      message: error.message
    });
  }
});

// GET /api/audio/intro - Serve intro audio
router.get('/intro', (req, res) => {
  try {
    const audioPath = join(__dirname, '../../../../Audio/Intro/Weatly Intro.mp3');
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.sendFile(audioPath, (err) => {
      if (err) {
        console.error('Intro audio serve error:', err);
        res.status(404).json({ error: 'Intro audio file not found' });
      }
    });
  } catch (error) {
    console.error('Intro audio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/audio/static/intro/:introType - Serve specific intro audio files  
router.get('/static/intro/:introType', (req, res) => {
  try {
    const { introType } = req.params;
    let fileName;
    
    switch (introType) {
      case 'second-intro':
        fileName = 'Second Intro.mp3';
        break;
      case 'weatly-intro':
        fileName = 'Weatly Intro.mp3';
        break;
      case 'weatly-intro-long':
        fileName = 'Weatly Intro_Long.mp3';
        break;
      case 'what-topic':
        fileName = 'What Topic.mp3';
        break;
      case 'waiting':
        fileName = 'Waiting.mp3';
        break;
      case 'topic-filler':
        fileName = 'Topic Filler.mp3';
        break;
      default:
        return res.status(404).json({ error: 'Unknown intro type' });
    }
    
    const audioPath = join(__dirname, `../../../../Audio/Intro/${fileName}`);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.sendFile(audioPath, (err) => {
      if (err) {
        console.error('Intro audio serve error:', err);
        res.status(404).json({ error: 'Intro audio file not found' });
      }
    });
  } catch (error) {
    console.error('Intro audio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/audio/static/pre/:questionType - Serve pre-question audio
router.get('/static/pre/:questionType', (req, res) => {
  try {
    const { questionType } = req.params;
    const audioPath = join(__dirname, `../../../../Audio/Pre-Audio/${questionType}_pre.mp3`);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.sendFile(audioPath, (err) => {
      if (err) {
        console.error('Pre-audio serve error:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  } catch (error) {
    console.error('Static pre audio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/audio/static/post/:questionType - Serve post-question audio
router.get('/static/post/:questionType', (req, res) => {
  try {
    const { questionType } = req.params;
    const audioPath = join(__dirname, `../../../../Audio/Post-Audio/${questionType}_post.mp3`);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.sendFile(audioPath, (err) => {
      if (err) {
        console.error('Post-audio serve error:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  } catch (error) {
    console.error('Static post audio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/audio/dynamic/:hash - Serve dynamically generated audio
router.get('/dynamic/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const audioPath = await audioCache.get(hash);
    
    if (!audioPath) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(audioPath, (err) => {
      if (err) {
        console.error('Dynamic audio serve error:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  } catch (error) {
    console.error('Dynamic audio error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;