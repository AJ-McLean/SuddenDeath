"""
Example client for NVIDIA Canary STT Service
Demonstrates both file transcription and near-realtime chunked transcription
"""

import asyncio
import base64
import json
import time
from pathlib import Path
from typing import Optional

import numpy as np
import requests
import sounddevice as sd

# Configuration
STT_SERVER_URL = "http://localhost:8000"
SAMPLE_RATE = 16000
CHUNK_SIZE_MS = 250  # Send 250ms chunks
CHUNK_SIZE_SAMPLES = int(SAMPLE_RATE * CHUNK_SIZE_MS / 1000)
WINDOW_SECONDS = 6.0  # Rolling window size

class STTClient:
    """Client for interacting with the STT service"""
    
    def __init__(self, base_url: str = STT_SERVER_URL):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def transcribe_file(self, audio_path: str, max_new_tokens: int = 256) -> dict:
        """Transcribe an audio file
        
        Args:
            audio_path: Path to audio file
            max_new_tokens: Maximum tokens to generate
            
        Returns:
            Transcription response
        """
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        with open(audio_path, 'rb') as f:
            files = {'audio': f}
            response = self.session.post(f"{self.base_url}/transcribe", files=files)
        
        response.raise_for_status()
        return response.json()
    
    def transcribe_file_by_path(self, audio_path: str, max_new_tokens: int = 256) -> dict:
        """Transcribe using file path (for local files on server)
        
        Args:
            audio_path: Path to audio file on server
            max_new_tokens: Maximum tokens to generate
            
        Returns:
            Transcription response
        """
        data = {
            "path": audio_path,
            "max_new_tokens": max_new_tokens
        }
        response = self.session.post(
            f"{self.base_url}/transcribe",
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def send_chunk(
        self, 
        session_id: str, 
        audio_chunk: np.ndarray, 
        force_transcribe: bool = False,
        window_seconds: float = WINDOW_SECONDS
    ) -> dict:
        """Send audio chunk for processing
        
        Args:
            session_id: Unique session identifier
            audio_chunk: Audio data (float32, 16kHz mono)
            force_transcribe: Force transcription even without activity
            window_seconds: Rolling window size
            
        Returns:
            Chunk response
        """
        # Convert to bytes and base64 encode
        audio_bytes = audio_chunk.astype(np.float32).tobytes()
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        data = {
            "session_id": session_id,
            "audio_base64": audio_base64,
            "window_seconds": window_seconds,
            "force_transcribe": force_transcribe
        }
        
        response = self.session.post(f"{self.base_url}/transcribe_chunk", json=data)
        response.raise_for_status()
        return response.json()
    
    def clear_session(self, session_id: str):
        """Clear a transcription session"""
        response = self.session.delete(f"{self.base_url}/session/{session_id}")
        response.raise_for_status()
        return response.json()
    
    def get_health(self) -> dict:
        """Get service health status"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

def example_file_transcription():
    """Example: Transcribe a file"""
    client = STTClient()
    
    # Check if service is healthy
    health = client.get_health()
    print(f"STT Service Status: {health}")
    
    # Example file transcription (replace with your audio file)
    audio_file = "example_audio.wav"  # You need to provide this
    
    if Path(audio_file).exists():
        print(f"\nTranscribing file: {audio_file}")
        start_time = time.time()
        
        result = client.transcribe_file(audio_file)
        
        print(f"Transcription: {result['text']}")
        print(f"Latency: {result['latency_ms']}ms")
        print(f"Model: {result['model']}")
        print(f"Device: {result['device']}")
    else:
        print(f"Example audio file not found: {audio_file}")

def example_realtime_transcription(duration_seconds: int = 30):
    """Example: Near-realtime microphone transcription
    
    Args:
        duration_seconds: How long to record for
    """
    client = STTClient()
    session_id = f"mic_session_{int(time.time())}"
    
    print(f"\n=== Starting near-realtime transcription ===")
    print(f"Session ID: {session_id}")
    print(f"Recording for {duration_seconds} seconds...")
    print("Speak into your microphone...\n")
    
    # Audio recording setup
    audio_buffer = []
    
    def audio_callback(indata, frames, time, status):
        """Callback for audio recording"""
        if status:
            print(f"Audio callback status: {status}")
        # Convert to mono and add to buffer
        mono_audio = np.mean(indata, axis=1) if indata.shape[1] > 1 else indata[:, 0]
        audio_buffer.append(mono_audio.copy())
    
    try:
        # Start recording
        with sd.InputStream(
            callback=audio_callback,
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=CHUNK_SIZE_SAMPLES,
            dtype=np.float32
        ):
            
            start_time = time.time()
            last_transcription = ""
            
            while time.time() - start_time < duration_seconds:
                # Check if we have chunks to process
                if audio_buffer:
                    # Get and clear buffer
                    chunks = audio_buffer[:]
                    audio_buffer.clear()
                    
                    # Concatenate chunks
                    if chunks:
                        audio_chunk = np.concatenate(chunks)
                        
                        try:
                            # Send to STT service
                            result = client.send_chunk(session_id, audio_chunk)
                            
                            # Print new transcriptions
                            if result['text'] and result['text'] != last_transcription:
                                prefix = "[INTERIM]" if result['is_interim'] else "[FINAL]"
                                print(f"{prefix} {result['text']}")
                                last_transcription = result['text']
                                
                                # Show additional info occasionally
                                if result['has_activity']:
                                    print(f"  → Activity detected, buffer: {result['buffer_size_seconds']}s")
                        
                        except requests.exceptions.RequestException as e:
                            print(f"STT request failed: {e}")
                
                # Sleep a bit
                time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("\nRecording stopped by user")
    
    except Exception as e:
        print(f"Recording error: {e}")
    
    finally:
        # Force final transcription
        if audio_buffer:
            try:
                audio_chunk = np.concatenate(audio_buffer)
                result = client.send_chunk(session_id, audio_chunk, force_transcribe=True)
                if result['text']:
                    print(f"[FINAL] {result['text']}")
            except:
                pass
        
        # Clean up session
        try:
            client.clear_session(session_id)
            print(f"\nSession {session_id} cleared")
        except:
            pass

def main():
    """Main example function"""
    print("NVIDIA Canary STT Client Examples")
    print("=" * 40)
    
    try:
        # Test file transcription
        example_file_transcription()
        
        # Test realtime transcription
        import sounddevice as sd
        
        # Check if microphone is available
        devices = sd.query_devices()
        input_device = sd.default.device[0]
        
        if input_device is not None:
            print(f"\nMicrophone available: {devices[input_device]['name']}")
            
            user_input = input("\nTest realtime transcription? (y/N): ")
            if user_input.lower().startswith('y'):
                example_realtime_transcription(duration_seconds=15)
        else:
            print("\nNo microphone found, skipping realtime test")
            
    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        print(f"Example error: {e}")

if __name__ == "__main__":
    main()