#!/usr/bin/env python3
"""
Quick test script for NVIDIA Canary STT service
Tests if the service is responding and can handle basic requests
"""

import requests
import json
import base64
import time

def test_stt_service():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing NVIDIA Canary STT Service")
    print(f"📡 Service URL: {base_url}")
    print("-" * 50)
    
    # Test 1: Health Check
    print("1️⃣ Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: Model Info
    print("\n2️⃣ Testing model info endpoint...")
    try:
        response = requests.get(f"{base_url}/model_info", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model info: {data}")
        else:
            print(f"⚠️ Model info unavailable: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Model info error: {e}")
    
    # Test 3: Transcription with dummy data
    print("\n3️⃣ Testing transcription endpoint...")
    try:
        # Create minimal base64 audio data (just for API testing)
        dummy_audio = b"dummy audio data for API testing"
        audio_base64 = base64.b64encode(dummy_audio).decode()
        
        payload = {
            "audio_base64": audio_base64,
            "max_new_tokens": 64
        }
        
        start_time = time.time()
        response = requests.post(
            f"{base_url}/transcribe", 
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        end_time = time.time()
        
        print(f"⏱️ Request took {end_time - start_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Transcription API responded: {data}")
        else:
            print(f"❌ Transcription failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Transcription error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 STT Service Test Complete")
    print("\n📝 Next Steps:")
    print("1. Visit http://localhost:8080/speech-test")
    print("2. Test speech recognition in browser")
    print("3. Check browser console for detailed logs")
    print("4. Grant microphone permission if prompted")
    
    return True

if __name__ == "__main__":
    test_stt_service()