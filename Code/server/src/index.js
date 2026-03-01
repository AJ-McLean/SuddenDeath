import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Route imports
import chatRouter from './routes/chat.js';
import audioRouter from './routes/audio.js';
import outfitRouter from './routes/outfit.js';
import questionsRouter from './routes/questions.js';
import evaluationRouter from './routes/evaluation.js';

// Service imports for cleanup
import { elevenLabs } from './services/elevenlabs.js';
import { gameLogic } from './services/gameLogic.js';
import { audioCache } from './services/audioCache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'], // Support both Vite ports
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'wheatly-backend'
  });
});

// API routes
app.use('/api/chat', chatRouter);
app.use('/api/audio', audioRouter);
app.use('/api', outfitRouter);
app.use('/api', questionsRouter);
app.use('/api', evaluationRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Wheatly Backend Server',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat',
      chatStart: 'POST /api/chat/start',
      audioJob: 'GET /api/audio/job/:id',
      audioStart: 'POST /api/audio/start',
      staticPre: 'GET /api/audio/static/pre/:questionType',
      staticPost: 'GET /api/audio/static/post/:questionType',
      dynamicAudio: 'GET /api/audio/dynamic/:hash',
      generateQuestions: 'POST /api/generate-questions',
      questionTemplates: 'GET /api/question-templates'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Periodic cleanup
setInterval(() => {
  try {
    elevenLabs.cleanup();
    gameLogic.cleanup();
    audioCache.cleanup();
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 15 * 60 * 1000); // Every 15 minutes

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Wheatly Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 API Base: http://localhost:${PORT}/api`);
  
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not set - TTS will not work');
  }
});

export default app;