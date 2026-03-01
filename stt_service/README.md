# NVIDIA Canary STT Service

Speech-to-Text service using NVIDIA Canary Qwen 2.5B model, optimized for macOS Apple Silicon with MPS support.

## Features

- **File Transcription**: Upload audio files or specify local paths
- **Near-Realtime Transcription**: Chunked audio processing with rolling window
- **Apple Silicon Optimized**: Uses MPS acceleration when available
- **Automatic Audio Processing**: Handles format conversion and resampling to 16kHz mono
- **Session Management**: Maintains state for multi-chunk transcription sessions
- **Activity Detection**: Energy-based silence gating to avoid transcribing silence

## Quick Start

### 1. Environment Setup

Create a clean conda environment (Python 3.10 recommended):

```bash
conda create -n canary-stt python=3.10
conda activate canary-stt
```

### 2. Install Dependencies

```bash
# Install pinned dependencies
pip install -r requirements.txt

# Install NeMo toolkit from git (required for latest compatibility)
pip install git+https://github.com/NVIDIA/NeMo.git
```

### 3. Set Environment Variables

For faster model downloads from Hugging Face:

```bash
export HF_TOKEN=your_huggingface_token  # Optional but recommended
```

### 4. Start the Server

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

The server will:
- Load the NVIDIA Canary model (first run may take several minutes to download)
- Warm up with a dummy inference
- Start serving on `http://localhost:8000`

### 5. Test the Service

```bash
# Health check
curl http://localhost:8000/health

# Test file transcription (local path)
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/audio.wav"}'
```

## API Endpoints

### POST `/transcribe`

Transcribe audio from uploaded file or local path.

**Request Options:**

1. **File Upload** (multipart/form-data):
```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@your_file.wav"
```

2. **Local Path** (JSON):
```bash
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"path": "/absolute/path/to/audio.wav", "max_new_tokens": 256}'
```

**Response:**
```json
{
  "text": "Transcribed text here",
  "latency_ms": 1234.56,
  "model": "nvidia/canary-qwen-2.5b",
  "device": "mps",
  "tokens_generated": 42
}
```

### POST `/transcribe_chunk`

Process audio chunks for near-realtime transcription.

**Request:**
```json
{
  "session_id": "unique_session_id",
  "audio_base64": "base64_encoded_float32_audio",
  "window_seconds": 6.0,
  "max_new_tokens": 128,
  "force_transcribe": false
}
```

**Response:**
```json
{
  "session_id": "unique_session_id",
  "text": "Current transcription",
  "is_interim": true,
  "latency_ms": 567.89,
  "has_activity": true,
  "buffer_size_seconds": 4.2
}
```

### Other Endpoints

- `GET /health` - Service health and status
- `DELETE /session/{session_id}` - Clear specific session
- `GET /sessions` - List active sessions

## Client Usage

### Python Client Example

```python
from client_example import STTClient

client = STTClient("http://localhost:8000")

# File transcription
result = client.transcribe_file("audio.wav")
print(result['text'])

# Near-realtime transcription
import numpy as np
session_id = "my_session"

# Send 16kHz mono float32 audio chunks
audio_chunk = np.random.randn(4000).astype(np.float32)  # 250ms at 16kHz
result = client.send_chunk(session_id, audio_chunk)
print(result['text'])
```

### JavaScript/Web Integration

For your Wheatly app, you can integrate like this:

```javascript
// Record audio and send to STT service
const sendAudioChunk = async (audioBuffer, sessionId) => {
  // Convert Float32Array to base64
  const audioBytes = new Uint8Array(audioBuffer.buffer);
  const audioBase64 = btoa(String.fromCharCode(...audioBytes));
  
  const response = await fetch('http://localhost:8000/transcribe_chunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      audio_base64: audioBase64,
      window_seconds: 6.0
    })
  });
  
  const result = await response.json();
  return result.text;
};
```

## Performance Recommendations

### Chunk Size and Window Settings

- **Chunk Size**: 250ms chunks (4000 samples at 16kHz) work well
- **Window Size**: 6 seconds provides good context without excessive latency
- **Send Frequency**: Send chunks every 250ms, but transcription happens less frequently based on activity

### Model Performance

**First Run:**
- Model download: ~5-10 minutes (depends on connection)
- Model loading: ~30-60 seconds on Apple Silicon
- Warmup: ~2-5 seconds

**Runtime Performance:**
- File transcription: ~1-3 seconds for typical utterances
- Chunked transcription: ~500ms-2s depending on window size
- Memory usage: ~8-12GB on Apple Silicon

### Optimization Tips

1. **Keep Model Loaded**: Don't restart the service frequently
2. **Use Activity Detection**: Let the service filter silence automatically
3. **Reasonable Windows**: 4-8 second windows balance latency vs. accuracy
4. **Session Management**: Clear old sessions to prevent memory leaks

## Limitations

- **Not True Streaming**: This is rolling window transcription, not token streaming
- **Memory Usage**: Model requires significant GPU/unified memory
- **Latency**: ~0.5-2s per transcription depending on audio length
- **macOS Focus**: Optimized for Apple Silicon, may need adjustments for other platforms

## Troubleshooting

### Common Issues

**Model Loading Fails:**
```
ImportError: Failed to import NeMo
```
- Install NeMo from git: `pip install git+https://github.com/NVIDIA/NeMo.git`

**Out of Memory:**
```
torch.cuda.OutOfMemoryError
```
- Reduce `max_new_tokens` 
- Use smaller window sizes
- Ensure no other ML models are loaded

**Audio Format Issues:**
```
Audio file not found / Invalid audio data
```
- Ensure audio is accessible and valid
- Service automatically converts to 16kHz mono WAV

**MPS Not Available:**
```
Using CPU device
```
- Check that you're on Apple Silicon with macOS 12.3+
- Verify PyTorch MPS support: `torch.backends.mps.is_available()`

### Debug Mode

Enable debug logging by setting:
```bash
export PYTHONPATH=/path/to/stt_service
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
uvicorn server:app --log-level debug
```

## Integration with Wheatly

To integrate with your Wheatly application after "What Topic.mp3":

1. **Start STT Service**: Boot the service during app startup
2. **Listen for Speech**: After What Topic.mp3 ends, start recording microphone
3. **Send Chunks**: Send 250ms audio chunks to `/transcribe_chunk`
4. **Handle Response**: Use transcribed text as topic selection for quiz logic
5. **Session Management**: Use unique session IDs per evaluation session

This service provides the core STT functionality that can be reused throughout your quiz system for all speech input.