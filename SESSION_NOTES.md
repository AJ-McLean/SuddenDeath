# Wheatly Backend Integration - Session Notes

## 🎉 COMPLETED: Full Backend-Frontend Integration

### What We Built
- **Complete Node.js backend server** with Express
- **ElevenLabs TTS integration** using Wheatley's voice
- **Voice-only API** following your frontend contract
- **Latency masking architecture** (critical requirement implemented)
- **Audio caching system** for performance
- **Full frontend integration** with AudioPlayer component

### Current Status: ✅ WORKING
- **Backend**: http://localhost:3001 (running)
- **Frontend**: http://localhost:8080 (running) 
- **Integration**: Fully connected and tested
- **TTS**: Working with your ElevenLabs API key
- **Audio Files**: All pre/post audio serving correctly

---

## 🔧 Critical Fixes Applied

### 1. **Latency Masking Violation - FIXED**
**Problem**: Backend was generating TTS inside `/api/chat` endpoint, violating your core architectural requirement.

**Fix**: 
- `/api/chat` now returns immediately with `startAudioEndpoint`
- TTS generation only starts when frontend calls `/api/audio/start` 
- Frontend triggers this when pre-audio playback begins
- **Location**: `/Code/server/src/routes/chat.js` lines 25-47

### 2. **Path Resolution Issues - FIXED**
**Problem**: Server couldn't find templates and audio files.

**Fix**: Corrected all relative paths in:
- `/Code/server/src/services/templateLoader.js` (templates path)
- `/Code/server/src/routes/audio.js` (audio file paths)
- `/Code/server/src/services/audioCache.js` (cache directory)

### 3. **Environment Variables - FIXED**
**Problem**: Server not reading `.env` file with ElevenLabs API key.

**Fix**: Added `dotenv/config` to `/Code/server/src/index.js`

### 4. **Frontend Integration - IMPLEMENTED**
**Added**:
- `AudioPlayer` component (`/frontend/src/components/portal/AudioPlayer.tsx`)
- Updated backend API service (`/frontend/src/services/backendApi.ts`)
- Session-based audio generation workflow

---

## 📁 Key Files & Architecture

### Backend Structure
```
/Code/server/
├── src/
│   ├── index.js              # Main server (port 3001)
│   ├── routes/
│   │   ├── chat.js          # POST /api/chat endpoint
│   │   └── audio.js         # Audio serving & generation
│   ├── services/
│   │   ├── elevenlabs.js    # TTS integration
│   │   ├── gameLogic.js     # Session management  
│   │   ├── audioCache.js    # Caching system
│   │   └── templateLoader.js # Loads /Context/templates.mjs
│   └── utils/
│       └── crypto.js        # Hashing for cache keys
├── package.json
├── .env                     # Your ElevenLabs API key
└── SETUP.md                 # Full documentation
```

### API Endpoints (All Working)
- `POST /api/chat` - Main chat endpoint (matches your contract)
- `POST /api/audio/start` - Triggers TTS generation (latency masking)
- `GET /api/audio/job/:id` - Poll TTS status
- `GET /api/audio/static/pre/:type` - Serve pre-audio
- `GET /api/audio/static/post/:type` - Serve post-audio
- `GET /api/audio/dynamic/:hash` - Serve cached TTS
- `GET /health` - Health check

### Frontend Integration
- **AudioPlayer**: `/frontend/src/components/portal/AudioPlayer.tsx`
- **Backend API**: `/frontend/src/services/backendApi.ts`
- **Environment**: `/frontend/.env` (VITE_API_BASE=http://localhost:3001)

---

## 🚀 How to Start Everything

### Backend
```bash
cd /Code/server
npm start  # Runs on port 3001
```

### Frontend  
```bash
cd frontend
npm run dev  # Runs on port 8080
```

### Test Integration
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "message": "Hello", "clientMeta": {"cameraEnabled": true, "viewport": "1920x1080"}}'
```

---

## 🎯 Audio Flow (Latency Masking)

**Correct Implementation**:
1. Frontend calls `/api/chat` → Returns `preUrl`, `postUrl`, `startAudioEndpoint`
2. Frontend starts playing pre-audio
3. **When pre-audio playback starts**, frontend calls `/api/audio/start`
4. Backend begins TTS generation (while pre-audio plays)
5. Frontend polls for completion or gets immediate `audioUrl` if cached
6. Frontend plays: pre → live → post

**Critical**: TTS generation never blocks the `/api/chat` response.

---

## 📋 Verification Checklist (All ✅)

- ✅ Templates loaded from `/Context/templates.mjs`
- ✅ Pre/post audio served from `/Audio/Pre-Audio/` and `/Audio/Post-Audio/`
- ✅ TTS caching working in `/Audio/Cache/`
- ✅ ElevenLabs integration with your API key
- ✅ CORS configured for frontend ports
- ✅ Latency masking architecture implemented
- ✅ Frontend AudioPlayer component working
- ✅ Session management for 10-question format

---

## 🔍 Debug & Troubleshooting

### Common Issues
1. **"TTS will not work"**: Check `.env` file has `ELEVENLABS_API_KEY=your_key`
2. **Audio files not found**: Verify files exist in `/Audio/Pre-Audio/` and `/Audio/Post-Audio/`
3. **CORS errors**: Check backend allows your frontend port in `/Code/server/src/index.js`
4. **Templates not loading**: Check path in `/Code/server/src/services/templateLoader.js`

### Logs
- Backend logs: Check the running `npm start` terminal
- Frontend logs: Check browser console at http://localhost:8080

### Test Endpoints
```bash
curl http://localhost:3001/health                                    # Health check
curl http://localhost:3001/api/audio/static/pre/rapid_fire_recall   # Static audio
```

---

## 📚 Documentation Locations

- **Backend Setup**: `/Code/server/SETUP.md` (comprehensive guide)
- **Architecture**: `/CLAUDE.md` (your original design document)  
- **API Contract**: This file + `/frontend/src/types/portal.ts`
- **Templates**: `/Context/templates.mjs` (source of truth for dialogue)

---

## 🎮 Ready for Voice Testing

Your system is now fully functional for voice-only interaction:

1. Open **http://localhost:8080**
2. Navigate to quiz interface
3. Test voice input → Should hear Wheatley's voice with proper pre/live/post sequence
4. System maintains `assistantState` (thinking/speaking/idle) throughout

**Note**: Question progression logic was partially implemented but conversation flow still needs your research agent integration for dynamic questions.

---

*Session completed: 2026-02-28*  
*Next session: Everything is running and ready for voice testing!*