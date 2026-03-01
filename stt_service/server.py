"""
FastAPI Server for NVIDIA Canary STT Service
Provides endpoints for file and chunked transcription
"""

import asyncio
import base64
import logging
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from stt_canary import get_stt_instance

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NVIDIA Canary STT Service",
    description="Speech-to-Text service using NVIDIA Canary Qwen 2.5B",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global lock for model access
model_lock = asyncio.Lock()

# Session storage for chunked transcription
class ChunkSession:
    def __init__(self, session_id: str, window_seconds: float = 6.0):
        self.session_id = session_id
        self.window_seconds = window_seconds
        self.audio_buffer = deque()  # Store (timestamp, audio_chunk) tuples
        self.last_transcription = ""
        self.created_at = time.time()
    
    def add_chunk(self, audio_data: np.ndarray):
        """Add audio chunk with timestamp"""
        timestamp = time.time()
        self.audio_buffer.append((timestamp, audio_data))
        
        # Remove old chunks outside window
        cutoff_time = timestamp - self.window_seconds
        while self.audio_buffer and self.audio_buffer[0][0] < cutoff_time:
            self.audio_buffer.popleft()
    
    def get_window_audio(self) -> Optional[np.ndarray]:
        """Get current window audio as single array"""
        if not self.audio_buffer:
            return None
        
        # Concatenate all chunks in window
        audio_chunks = [chunk[1] for chunk in self.audio_buffer]
        return np.concatenate(audio_chunks)
    
    def has_activity(self, threshold: float = 0.01) -> bool:
        """Simple energy-based activity detection"""
        window_audio = self.get_window_audio()
        if window_audio is None:
            return False
        
        # Calculate RMS energy
        rms = np.sqrt(np.mean(window_audio ** 2))
        return rms > threshold

# Session storage
chunk_sessions: Dict[str, ChunkSession] = {}

# Cleanup old sessions periodically
async def cleanup_old_sessions():
    """Remove sessions older than 1 hour"""
    while True:
        try:
            current_time = time.time()
            expired_sessions = [
                session_id for session_id, session in chunk_sessions.items()
                if current_time - session.created_at > 3600  # 1 hour
            ]
            
            for session_id in expired_sessions:
                del chunk_sessions[session_id]
                logger.info(f"Cleaned up expired session: {session_id}")
            
            await asyncio.sleep(300)  # Check every 5 minutes
            
        except Exception as e:
            logger.error(f"Session cleanup error: {e}")
            await asyncio.sleep(60)

# Request/Response models
class TranscribePathRequest(BaseModel):
    path: str
    max_new_tokens: Optional[int] = 256
    prompt_override: Optional[str] = None

class TranscribeResponse(BaseModel):
    text: str
    latency_ms: float
    model: str
    device: str
    tokens_generated: Optional[int] = None

class ChunkRequest(BaseModel):
    session_id: str
    audio_base64: str
    window_seconds: Optional[float] = 6.0
    max_new_tokens: Optional[int] = 128
    force_transcribe: Optional[bool] = False

class ChunkResponse(BaseModel):
    session_id: str
    text: str
    is_interim: bool
    latency_ms: float
    has_activity: bool
    buffer_size_seconds: float

@app.on_event("startup")
async def startup_event():
    """Initialize model and start background tasks"""
    logger.info("Starting STT service...")
    
    # Initialize model (this will load and warm up)
    try:
        get_stt_instance()
        logger.info("STT model ready")
    except Exception as e:
        logger.error(f"Failed to initialize STT model: {e}")
        raise
    
    # Start cleanup task
    asyncio.create_task(cleanup_old_sessions())

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "nvidia/canary-qwen-2.5b",
        "active_sessions": len(chunk_sessions)
    }

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: Optional[UploadFile] = File(None),
    request_data: Optional[TranscribePathRequest] = None
):
    """
    Transcribe audio from uploaded file or local path
    
    Use either:
    - Multipart file upload with 'audio' field
    - JSON body with 'path' field for local files
    """
    
    if audio is None and request_data is None:
        raise HTTPException(
            status_code=400, 
            detail="Either upload a file or provide a JSON body with 'path'"
        )
    
    async with model_lock:
        try:
            stt = get_stt_instance()
            
            if audio is not None:
                # Handle file upload
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                    content = await audio.read()
                    tmp_file.write(content)
                    tmp_file.flush()
                    
                    result = stt.transcribe_file(tmp_file.name)
                    
                    # Clean up
                    Path(tmp_file.name).unlink(missing_ok=True)
            
            else:
                # Handle local path
                if not Path(request_data.path).exists():
                    raise HTTPException(status_code=404, detail="Audio file not found")
                
                result = stt.transcribe_file(
                    request_data.path,
                    max_new_tokens=request_data.max_new_tokens or 256,
                    prompt_override=request_data.prompt_override
                )
            
            return TranscribeResponse(**result)
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe_chunk", response_model=ChunkResponse)
async def transcribe_chunk(request: ChunkRequest):
    """
    Process audio chunk for near-realtime transcription
    
    Maintains rolling window per session and transcribes when activity detected
    """
    try:
        # Decode base64 audio
        try:
            audio_bytes = base64.b64decode(request.audio_base64)
            # Assume 16kHz mono float32
            audio_data = np.frombuffer(audio_bytes, dtype=np.float32)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid audio data: {e}")
        
        # Get or create session
        if request.session_id not in chunk_sessions:
            chunk_sessions[request.session_id] = ChunkSession(
                request.session_id, 
                request.window_seconds
            )
        
        session = chunk_sessions[request.session_id]
        
        # Add chunk to session
        session.add_chunk(audio_data)
        
        # Check if we should transcribe
        should_transcribe = (
            request.force_transcribe or 
            session.has_activity() or
            len(session.audio_buffer) > 50  # Transcribe if buffer gets large
        )
        
        text = ""
        latency_ms = 0.0
        
        if should_transcribe and session.audio_buffer:
            start_time = time.time()
            
            # Get window audio
            window_audio = session.get_window_audio()
            
            if window_audio is not None and len(window_audio) > 1600:  # At least 0.1 sec
                async with model_lock:
                    try:
                        # Save to temp file for transcription
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                            sf.write(tmp_file.name, window_audio, 16000)
                            
                            stt = get_stt_instance()
                            result = stt.transcribe_file(
                                tmp_file.name,
                                max_new_tokens=request.max_new_tokens
                            )
                            
                            text = result["text"]
                            session.last_transcription = text
                            
                            # Clean up
                            Path(tmp_file.name).unlink(missing_ok=True)
                            
                    except Exception as e:
                        logger.error(f"Chunk transcription error: {e}")
                        text = session.last_transcription  # Return last known transcription
            
            latency_ms = (time.time() - start_time) * 1000
        else:
            # Return last transcription if not transcribing
            text = session.last_transcription
        
        # Calculate buffer duration
        buffer_duration = (
            session.audio_buffer[-1][0] - session.audio_buffer[0][0] 
            if len(session.audio_buffer) > 1 else 0
        )
        
        return ChunkResponse(
            session_id=request.session_id,
            text=text,
            is_interim=not request.force_transcribe,
            latency_ms=round(latency_ms, 2),
            has_activity=session.has_activity(),
            buffer_size_seconds=round(buffer_duration, 2)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chunk processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific session"""
    if session_id in chunk_sessions:
        del chunk_sessions[session_id]
        return {"message": f"Session {session_id} cleared"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.get("/sessions")
async def list_sessions():
    """List active sessions"""
    return {
        "active_sessions": list(chunk_sessions.keys()),
        "count": len(chunk_sessions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)