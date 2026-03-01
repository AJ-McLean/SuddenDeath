"""
NVIDIA Canary Qwen 2.5B Speech-to-Text Module
Optimized for macOS Apple Silicon with MPS support
"""

import os
import logging
import tempfile
import time
from pathlib import Path
from typing import Optional, Dict, Any

import torch
import torchaudio
import soundfile as sf
import numpy as np

logger = logging.getLogger(__name__)

class CanarySTT:
    """Speech-to-Text using NVIDIA Canary Qwen 2.5B model"""
    
    def __init__(self, model_name: str = "nvidia/canary-qwen-2.5b"):
        """Initialize the STT model
        
        Args:
            model_name: Hugging Face model identifier
        """
        self.model_name = model_name
        self.model = None
        self.device = self._get_device()
        self._load_model()
        
    def _get_device(self) -> str:
        """Determine the best available device"""
        if torch.backends.mps.is_available():
            logger.info("Using MPS (Apple Silicon) device")
            return "mps"
        elif torch.cuda.is_available():
            logger.info("Using CUDA device")
            return "cuda"
        else:
            logger.info("Using CPU device")
            return "cpu"
    
    def _load_model(self):
        """Load the NVIDIA Canary model"""
        try:
            logger.info(f"Loading model {self.model_name}...")
            start_time = time.time()
            
            # Import here to give better error messages
            from nemo.collections.speechlm2.models import SALM
            
            # Load model
            self.model = SALM.from_pretrained(self.model_name)
            self.model.eval()
            
            # Move to device if not CPU
            if self.device != "cpu":
                self.model = self.model.to(self.device)
            
            load_time = time.time() - start_time
            logger.info(f"Model loaded successfully in {load_time:.2f}s on {self.device}")
            
        except ImportError as e:
            raise ImportError(
                "Failed to import NeMo. Make sure nemo_toolkit is installed:\n"
                "pip install git+https://github.com/NVIDIA/NeMo.git"
            ) from e
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def _ensure_wav_format(self, audio_path: str) -> str:
        """Ensure audio is in 16kHz mono WAV format
        
        Args:
            audio_path: Path to input audio file
            
        Returns:
            Path to properly formatted WAV file (may be original or converted)
        """
        try:
            # Read audio file
            data, sample_rate = sf.read(audio_path)
            
            # Convert to mono if stereo
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
            
            # Check if resampling is needed
            needs_resample = sample_rate != 16000
            
            # If already correct format, return original path
            if not needs_resample and audio_path.lower().endswith('.wav'):
                return audio_path
            
            # Create temporary file for converted audio
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                temp_path = tmp_file.name
            
            # Resample if needed
            if needs_resample:
                logger.debug(f"Resampling from {sample_rate}Hz to 16000Hz")
                # Convert to torch tensor for resampling
                audio_tensor = torch.from_numpy(data).float()
                if len(audio_tensor.shape) == 1:
                    audio_tensor = audio_tensor.unsqueeze(0)  # Add channel dimension
                
                # Resample
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sample_rate,
                    new_freq=16000
                )
                data_resampled = resampler(audio_tensor).squeeze(0).numpy()
            else:
                data_resampled = data
            
            # Save as WAV
            sf.write(temp_path, data_resampled, 16000)
            logger.debug(f"Audio converted and saved to {temp_path}")
            
            return temp_path
            
        except Exception as e:
            logger.error(f"Failed to process audio file {audio_path}: {e}")
            raise
    
    def transcribe_file(
        self, 
        audio_path: str, 
        max_new_tokens: int = 256,
        prompt_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transcribe an audio file
        
        Args:
            audio_path: Path to audio file
            max_new_tokens: Maximum tokens to generate
            prompt_override: Custom prompt (default: "Transcribe the following:")
            
        Returns:
            Dictionary with transcription results
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        start_time = time.time()
        temp_file = None
        
        try:
            # Ensure proper audio format
            processed_path = self._ensure_wav_format(audio_path)
            temp_file = processed_path if processed_path != audio_path else None
            
            # Prepare prompt
            prompt_text = prompt_override or "Transcribe the following:"
            prompts = [[{
                "role": "user", 
                "content": f"{prompt_text} {self.model.audio_locator_tag}",
                "audio": [processed_path]
            }]]
            
            # Run inference
            with torch.inference_mode():
                answer_ids = self.model.generate(
                    prompts=prompts, 
                    max_new_tokens=max_new_tokens
                )
            
            # Decode text
            transcription = self.model.tokenizer.ids_to_text(answer_ids[0].cpu())
            
            # Clean up transcription (remove prompt echo)
            if prompt_text in transcription:
                transcription = transcription.replace(prompt_text, "").strip()
            
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "text": transcription,
                "latency_ms": round(latency_ms, 2),
                "model": self.model_name,
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
                    logger.debug(f"Cleaned up temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_file}: {e}")
    
    def warmup(self):
        """Warm up the model with a dummy inference"""
        logger.info("Warming up model...")
        
        try:
            # Create a short dummy audio file (1 second of silence)
            dummy_audio = np.zeros(16000, dtype=np.float32)  # 1 sec at 16kHz
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                sf.write(tmp_file.name, dummy_audio, 16000)
                
                # Run dummy transcription
                result = self.transcribe_file(tmp_file.name, max_new_tokens=32)
                logger.info(f"Warmup completed in {result['latency_ms']}ms")
                
                # Clean up
                os.unlink(tmp_file.name)
                
        except Exception as e:
            logger.warning(f"Warmup failed: {e}")

# Global instance for reuse
_global_stt_instance: Optional[CanarySTT] = None

def get_stt_instance() -> CanarySTT:
    """Get or create global STT instance"""
    global _global_stt_instance
    
    if _global_stt_instance is None:
        _global_stt_instance = CanarySTT()
        _global_stt_instance.warmup()
    
    return _global_stt_instance

def transcribe_file(audio_path: str, **kwargs) -> Dict[str, Any]:
    """Convenience function for file transcription"""
    stt = get_stt_instance()
    return stt.transcribe_file(audio_path, **kwargs)