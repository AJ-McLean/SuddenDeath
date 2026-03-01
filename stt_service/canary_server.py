"""
FastAPI Server for NVIDIA Canary STT using your working NeMo SALM setup
Optimized for persistent model loading and multiple transcription calls per session
"""

import asyncio
import base64
import logging
import tempfile
import time
import os
from pathlib import Path
from typing import Dict, Any, Optional

import torch
import torchaudio
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NVIDIA Canary STT Service (Production)",
    description="Speech-to-Text service using NVIDIA Canary Qwen 2.5B with NeMo SALM",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for your frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance - loaded once on startup
global_model = None
model_lock = asyncio.Lock()

class TranscribeRequest(BaseModel):
    audio_base64: str
    max_new_tokens: Optional[int] = 256
    prompt_override: Optional[str] = None

class TranscribeFileRequest(BaseModel):
    file_path: str
    max_new_tokens: Optional[int] = 256
    prompt_override: Optional[str] = None

class TranscribeResponse(BaseModel):
    text: str
    latency_ms: float
    model: str
    device: str
    confidence: Optional[float] = None

class CanarySTTService:
    """NVIDIA Canary STT using your exact working setup"""
    
    def __init__(self):
        self.model = None
        self.device = self._get_device()
        
    def _get_device(self) -> str:
        """Get the best available device (MPS for Apple Silicon)"""
        if torch.backends.mps.is_available():
            logger.info("Using MPS (Apple Silicon) device")
            return "mps"
        elif torch.cuda.is_available():
            logger.info("Using CUDA device")
            return "cuda"
        else:
            logger.info("Using CPU device")
            return "cpu"
    
    async def load_model(self):
        """Load NVIDIA Canary model using your working setup"""
        if self.model is not None:
            logger.info("Model already loaded")
            return
            
        try:
            logger.info("Loading NVIDIA Canary Qwen 2.5B model...")
            start_time = time.time()
            
            # Import NeMo SALM - using your exact working import
            from nemo.collections.speechlm2.models import SALM
            
            # Load model using your exact working code
            self.model = SALM.from_pretrained("nvidia/canary-qwen-2.5b")
            self.model.eval()
            
            # Move to device if not CPU
            if self.device != "cpu":
                self.model = self.model.to(self.device)
            
            load_time = time.time() - start_time
            logger.info(f"✅ Model loaded successfully in {load_time:.2f}s on {self.device}")
            
            # Warmup with dummy inference
            await self._warmup()
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")
    
    async def _warmup(self):
        """Warm up model with dummy inference"""
        try:
            logger.info("Warming up model...")
            
            # Create dummy 1-second audio (16kHz mono)
            dummy_audio = np.zeros(16000, dtype=np.float32)
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                sf.write(tmp_file.name, dummy_audio, 16000)
                
                result = await self._transcribe_file_internal(tmp_file.name, max_new_tokens=32)
                logger.info(f"✅ Warmup completed in {result['latency_ms']}ms")
                
                # Clean up
                os.unlink(tmp_file.name)
                
        except Exception as e:
            logger.warning(f"⚠️ Warmup failed: {e}")
    
    def _ensure_audio_format(self, audio_path: str) -> str:
        """Ensure audio is 16kHz mono WAV as required by Canary"""
        try:
            # Read audio file
            data, sample_rate = sf.read(audio_path)
            
            # Convert to mono if stereo
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
            
            # Check if resampling needed
            needs_resample = sample_rate != 16000
            
            # If already correct format, return original
            if not needs_resample and audio_path.lower().endswith('.wav'):
                return audio_path
            
            # Create temporary converted file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                temp_path = tmp_file.name
            
            # Resample if needed
            if needs_resample:
                logger.debug(f"Resampling from {sample_rate}Hz to 16000Hz")
                audio_tensor = torch.from_numpy(data).float()
                if len(audio_tensor.shape) == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)
                
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sample_rate,
                    new_freq=16000
                )
                data_resampled = resampler(audio_tensor).squeeze(0).numpy()
            else:
                data_resampled = data
            
            # Save as WAV
            sf.write(temp_path, data_resampled, 16000)
            return temp_path
            
        except Exception as e:
            logger.error(f"Failed to process audio: {e}")
            raise
    
    async def _transcribe_file_internal(self, audio_path: str, max_new_tokens: int = 256, prompt_override: str = None) -> Dict[str, Any]:
        """Internal transcription using your exact working code"""
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        start_time = time.time()
        temp_file = None
        
        try:
            # Ensure proper audio format
            processed_path = self._ensure_audio_format(audio_path)
            temp_file = processed_path if processed_path != audio_path else None
            
            # Prepare prompt using your exact working format
            prompt_text = prompt_override or "Transcribe the following:"
            prompts = [[{
                "role": "user",
                "content": f"{prompt_text} {self.model.audio_locator_tag}",
                "audio": [processed_path]
            }]]
            
            # Run inference using your exact working code
            with torch.inference_mode():
                answer_ids = self.model.generate(
                    prompts=prompts, 
                    max_new_tokens=max_new_tokens
                )
            
            # Decode using your exact working code
            transcription = self.model.tokenizer.ids_to_text(answer_ids[0].cpu())
            
            # Clean up transcription (remove prompt echo)
            if prompt_text in transcription:
                transcription = transcription.replace(prompt_text, "").strip()
            
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "text": transcription,
                "latency_ms": round(latency_ms, 2),
                "model": "nvidia/canary-qwen-2.5b",
                "device": self.device,
                "tokens_generated": len(answer_ids[0]) if answer_ids else 0
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file: {e}")
    
    async def transcribe_audio_data(self, audio_base64: str, max_new_tokens: int = 256, prompt_override: str = None) -> Dict[str, Any]:
        """Transcribe base64 audio data"""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_base64)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_file.flush()
                
                result = await self._transcribe_file_internal(
                    tmp_file.name, 
                    max_new_tokens=max_new_tokens,
                    prompt_override=prompt_override
                )
                
                # Clean up
                os.unlink(tmp_file.name)
                
                return result
                
        except Exception as e:
            logger.error(f"Base64 transcription failed: {e}")
            raise
    
    async def transcribe_file(self, file_path: str, max_new_tokens: int = 256, prompt_override: str = None) -> Dict[str, Any]:
        """Transcribe audio file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        return await self._transcribe_file_internal(
            file_path,
            max_new_tokens=max_new_tokens,
            prompt_override=prompt_override
        )

# Global service instance
stt_service = CanarySTTService()

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    logger.info("🚀 Starting NVIDIA Canary STT Service...")
    try:
        await stt_service.load_model()
        logger.info("✅ STT service ready for transcription requests")
    except Exception as e:
        logger.error(f"❌ Failed to initialize STT service: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if stt_service.model is not None else "model_not_loaded",
        "model": "nvidia/canary-qwen-2.5b",
        "device": stt_service.device,
        "ready": stt_service.model is not None
    }

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    Transcribe base64 encoded audio data
    
    Perfect for your quiz answer transcription workflow
    """
    if stt_service.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    async with model_lock:
        try:
            result = await stt_service.transcribe_audio_data(
                request.audio_base64,
                max_new_tokens=request.max_new_tokens,
                prompt_override=request.prompt_override
            )
            
            return TranscribeResponse(**result)
            
        except Exception as e:
            logger.error(f"Transcription request failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe_file", response_model=TranscribeResponse)
async def transcribe_file(request: TranscribeFileRequest):
    """
    Transcribe audio file by path
    
    Useful for testing and development
    """
    if stt_service.model is not None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    async with model_lock:
        try:
            result = await stt_service.transcribe_file(
                request.file_path,
                max_new_tokens=request.max_new_tokens,
                prompt_override=request.prompt_override
            )
            
            return TranscribeResponse(**result)
            
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"File transcription failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/model_info")
async def model_info():
    """Get model information"""
    return {
        "model_name": "nvidia/canary-qwen-2.5b",
        "model_loaded": stt_service.model is not None,
        "device": stt_service.device,
        "framework": "NeMo SALM",
        "description": "Production STT service using your working Canary setup"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Run with optimal settings for production
    uvicorn.run(
        "canary_server:app",
        host="0.0.0.0",
        port=8000,
        workers=1,  # Single worker to maintain model in memory
        log_level="info"
    )