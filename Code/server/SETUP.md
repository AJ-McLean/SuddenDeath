# Wheatly Backend Server Setup Guide

Voice-orchestrated AI interrogation backend server for the Wheatly project.

## Overview

This backend server provides the API for the Wheatly voice-driven questioning system. It integrates with ElevenLabs TTS to generate dynamic audio responses while serving pre-generated static audio assets.

## Features

- **Voice-only interaction**: Complete API for voice-driven quiz experience
- **Latency masking**: Pre/live/post audio sequencing to hide TTS generation time
- **ElevenLabs integration**: Dynamic TTS generation with Wheatley's voice
- **Audio caching**: Intelligent caching by content hash to reduce API calls
- **Session management**: In-memory session tracking for quiz progress
- **Template-driven**: Uses existing `/Context/templates.mjs` as source of truth

## Architecture

```
/Code/server/
├── src/
│   ├── index.js                    # Main Express server
│   ├── routes/
│   │   ├── chat.js                # POST /api/chat endpoint  
│   │   └── audio.js               # Audio-related endpoints
│   ├── services/
│   │   ├── elevenlabs.js          # ElevenLabs TTS integration
│   │   ├── gameLogic.js           # Session management & game logic
│   │   ├── audioCache.js          # Audio caching by hash
│   │   └── templateLoader.js      # Load templates from Context/
│   └── utils/
│       └── crypto.js              # Hashing utilities
└── package.json
```

## API Endpoints

### Chat API
- `POST /api/chat` - Main chat endpoint (frontend contract)
- `POST /api/chat/start` - Trigger dynamic TTS generation

### Audio API  
- `GET /api/audio/job/:id` - Poll TTS job status
- `POST /api/audio/start` - Start audio generation
- `GET /api/audio/static/pre/:questionType` - Serve pre-question audio
- `GET /api/audio/static/post/:questionType` - Serve post-question audio  
- `GET /api/audio/dynamic/:hash` - Serve cached dynamic audio

### Health & Info
- `GET /health` - Health check
- `GET /` - API documentation

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Code/server
npm install
```

### 2. Environment Variables

Create a `.env` file in `/Code/server/`:

```env
# Required
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3001` by default.

## Frontend Integration

Update your frontend environment variables:

```env
# In frontend/.env
VITE_API_BASE=http://localhost:3001
```

## Audio Flow

The system implements a "latency masking" approach:

1. **Frontend sends message** → `POST /api/chat`
2. **Backend responds** with:
   - `preUrl`: Pre-question audio (plays immediately)
   - `pollUrl`: URL to poll for live audio readiness
   - `postUrl`: Post-question audio (plays after live)
3. **Frontend starts pre-audio** and polls `pollUrl`
4. **Backend generates TTS** while pre-audio plays
5. **Frontend plays sequence**: pre → live → post

## Development Notes

### Templates
- Templates are loaded from `/Context/templates.mjs` 
- No dialogue should be hardcoded in backend logic
- Templates define the pre/post segments and placeholders for dynamic content

### Audio Assets
- Static audio: `/Audio/Pre-Audio/` and `/Audio/Post-Audio/`
- Dynamic cache: `/Audio/Cache/`
- All TTS uses consistent voice/model/format settings

### Session Management
- Sessions tracked in-memory (suitable for hackathon/demo)
- Automatic cleanup of old sessions and TTS jobs
- 10 questions per session, simple evaluation logic

## ElevenLabs Configuration

Voice settings used:
- **Voice ID**: `dTtuO9q1gaF6JeIDjwri`
- **Model**: `eleven_v3`  
- **Format**: `mp3_44100_128`
- **Stability**: 0.5
- **Similarity Boost**: 0.75

## Troubleshooting

### Common Issues

1. **TTS not working**: Check `ELEVENLABS_API_KEY` is set correctly
2. **Audio files not found**: Ensure pre/post audio exists in `/Audio/` directories
3. **CORS errors**: Check `FRONTEND_URL` environment variable
4. **Templates not loading**: Verify `/Context/templates.mjs` path is correct

### Debug Endpoints

```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/

# Test static audio
curl http://localhost:3001/api/audio/static/pre/rapid_fire_recall
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Configure reverse proxy (nginx)
4. Set up proper HTTPS
5. Consider Redis for session storage
6. Set up audio CDN for better performance

## Future Enhancements

- [ ] Real-time streaming TTS
- [ ] Redis session storage
- [ ] Audio CDN integration
- [ ] WebSocket support for real-time updates
- [ ] LLM evaluation integration
- [ ] Research agent for dynamic questions