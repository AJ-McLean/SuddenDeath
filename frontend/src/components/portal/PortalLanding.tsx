import { motion } from "framer-motion";
import { PortalRing } from "@/components/portal/PortalRing";
import { GlitchText } from "@/components/portal/GlitchText";
import { usePortal } from "@/context/PortalContext";
import { AudioPlayer } from "@/components/portal/AudioPlayer";
import { useState, useEffect } from "react";

export function PortalLanding() {
  const { setState, setCameraEnabled } = usePortal();

  const startTopicListening = () => {
    let speechDetected = false;
    let listeningTimeout: NodeJS.Timeout;
    
    console.log('🎤 Starting fresh speech recognition for topic detection');
    console.log('🌍 Environment check:', {
      SpeechRecognition: !!(window as any).SpeechRecognition,
      webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
      userAgent: navigator.userAgent.substring(0, 50),
      protocol: window.location.protocol,
      host: window.location.host
    });
    
    // Create completely fresh speech recognition instance
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ CRITICAL: Speech recognition API not available in main app!');
      console.error('❌ This explains the immediate Topic Filler playback!');
      console.warn('🚫 Speech recognition not available - going straight to Topic Filler');
      // If no speech recognition, immediately play Topic Filler and proceed
      const topicFillerAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/topic-filler?t=${Date.now()}`);
      topicFillerAudio.play().catch(console.error);
      
      // Start recording audio while Topic Filler plays (for STT)
      startTopicRecording(topicFillerAudio);
      return;
    }
    
    console.log('✅ Speech Recognition API is available - proceeding with setup');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // ✅ Fixed: Match test settings
    recognition.lang = "en-US";
    
    // Set up 30-second timeout for no speech (increased from 15s)
    listeningTimeout = setTimeout(() => {
      if (!speechDetected) {
        console.log('⏰ No speech detected after 30 seconds - playing Waiting.mp3');
        recognition.stop();
        
        const waitingAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/waiting?t=${Date.now()}`);
        waitingAudio.play().catch(console.error);
        
        // After waiting audio, restart listening
        waitingAudio.addEventListener('ended', () => {
          console.log('🔄 Waiting.mp3 finished - restarting speech recognition');
          startTopicListening();
        }, { once: true });
      }
    }, 30000);
    
    const handleSpeechResult = (event: any) => {
      console.log('🎯 Speech result received:', event.results.length, 'results');
      
      // Only process if we have a final result
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript && !speechDetected) {
        console.log('🗣️ FINAL SPEECH RESULT! Playing Topic Filler.mp3 and using transcribed topic');
        console.log('📝 Transcribed topic:', finalTranscript);
        speechDetected = true;
        clearTimeout(listeningTimeout);
        recognition.stop();
        
        const topicFillerAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/topic-filler?t=${Date.now()}`);
        topicFillerAudio.play().catch(console.error);
        
        // 🚀 IMMEDIATE: Start question generation WHILE Topic Filler plays (parallel processing)
        const questionGenerationPromise = processTopicAndStartQuiz(null, finalTranscript);
        
        // When Topic Filler ends, the first question should be ready
        topicFillerAudio.addEventListener('ended', async () => {
          console.log('🎵 Topic Filler finished - waiting for first question to be ready...');
          await questionGenerationPromise;
          console.log('✅ First question should now be playing');
        }, { once: true });
      }
    };
    
    const handleError = (event: any) => {
      console.error('🚫 Speech recognition error:', event.error, event.message || 'No message');
      console.error('🚫 Full error event:', event);
      if (!speechDetected) {
        clearTimeout(listeningTimeout);
        
        // On error, immediately play Topic Filler (don't wait for Waiting.mp3)
        console.log('🔄 Error fallback: Playing Topic Filler immediately');
        const topicFillerAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/topic-filler?t=${Date.now()}`);
        topicFillerAudio.play().catch(console.error);
        startTopicRecording(topicFillerAudio);
      }
    };
    
    const handleEnd = () => {
      console.log('🛑 Speech recognition ended - speechDetected:', speechDetected);
      // If recognition ended but no speech was detected, this might indicate an error
      if (!speechDetected) {
        console.warn('⚠️ Recognition ended unexpectedly without detecting speech');
      }
    };
    
    // ✅ Add ALL debugging events like the test
    recognition.addEventListener('start', () => {
      console.log('🟢 Speech recognition started');
    });
    
    recognition.addEventListener('end', handleEnd);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('result', handleSpeechResult);
    
    recognition.addEventListener('soundstart', () => {
      console.log('🔊 Sound detected by speech recognition');
    });
    
    recognition.addEventListener('soundend', () => {
      console.log('🔇 Sound ended');
    });
    
    recognition.addEventListener('audiostart', () => {
      console.log('🎙️ Audio input started');
    });
    
    recognition.addEventListener('audioend', () => {
      console.log('🎙️ Audio input ended');
    });
    
    
    // Start listening immediately
    try {
      recognition.start();
      console.log('▶️ Speech recognition started - listening for topic...');
      console.log('🎯 Recognition settings:', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang
      });
      console.log('🌐 Browser:', navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other');
      console.log('🔒 Protocol:', window.location.protocol);
    } catch (error) {
      console.error('🚫 Failed to start speech recognition:', error);
      clearTimeout(listeningTimeout);
      
      // If recognition fails to start, go straight to Topic Filler
      console.log('🔄 Fallback: Playing Topic Filler immediately');
      const topicFillerAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/topic-filler?t=${Date.now()}`);
      topicFillerAudio.play().catch(console.error);
      
      // Start recording audio while Topic Filler plays (for STT)
      startTopicRecording(topicFillerAudio);
    }
  };

  const startTopicRecording = async (topicFillerAudio: HTMLAudioElement) => {
    console.log('🎤 Starting audio recording for topic transcription');
    
    try {
      // Get microphone stream (reuse existing or request new)
      const existingStream = (window as any).__portalStream;
      let audioStream = existingStream;
      
      if (!audioStream || !audioStream.active) {
        console.log('📡 Requesting fresh microphone access for recording');
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000  // Canary requires 16kHz
          } 
        });
      }
      
      // Set up MediaRecorder for audio capture with fallback formats
      let mediaRecorder;
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        '' // No explicit format - let browser decide
      ];
      
      for (const mimeType of supportedTypes) {
        try {
          if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
            mediaRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : {});
            console.log(`✅ Using MediaRecorder with: ${mimeType || 'default format'}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Format ${mimeType} not supported:`, error);
        }
      }
      
      if (!mediaRecorder) {
        throw new Error('No supported MediaRecorder format found');
      }
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎙️ Recording stopped, processing audio...');
        
        try {
          // Create audio blob and convert to WAV
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioBase64 = await convertAudioToBase64WAV(audioBlob);
          
          // Send to STT service and start quiz
          processTopicAndStartQuiz(audioBase64);
          
        } catch (error) {
          console.error('❌ Failed to process recorded audio:', error);
          // Fallback to placeholder
          processTopicAndStartQuiz();
        }
      };
      
      // Start recording when Topic Filler starts
      mediaRecorder.start();
      console.log('▶️ Audio recording started');
      
      // Stop recording when Topic Filler ends (+ 1 second buffer)
      topicFillerAudio.addEventListener('ended', () => {
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log('⏹️ Audio recording stopped');
          }
        }, 1000); // 1 second buffer after audio ends
      }, { once: true });
      
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      // Fallback to placeholder if recording fails
      topicFillerAudio.addEventListener('ended', () => {
        processTopicAndStartQuiz();
      }, { once: true });
    }
  };
  
  const convertAudioToBase64WAV = async (audioBlob: Blob): Promise<string> => {
    // Convert WebM to WAV format for Canary STT
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // For now, convert to base64 (browser-compatible approach)
    // In production, you'd want proper WebM->WAV conversion
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = String.fromCharCode.apply(null, Array.from(uint8Array));
    return btoa(binaryString);
  };

  const processTopicAndStartQuiz = async (audioBase64?: string | null, directTopic?: string) => {
    try {
      let detectedTopic = "artificial intelligence"; // Fallback
      
      // If we have a direct topic from Web Speech API, use it
      if (directTopic) {
        detectedTopic = directTopic.trim();
        console.log(`✅ Using direct speech transcription: "${detectedTopic}"`);
      } else if (audioBase64) {
        console.log('🎯 Sending audio to NVIDIA Canary STT service...');
        
        try {
          // Call STT service
          const sttResponse = await fetch('http://localhost:8000/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_base64: audioBase64,
              max_new_tokens: 128,
              prompt_override: "Transcribe the following spoken topic:"
            }),
          });
          
          if (sttResponse.ok) {
            const sttResult = await sttResponse.json();
            detectedTopic = sttResult.text.trim() || detectedTopic;
            console.log(`✅ STT Success: "${detectedTopic}" (${sttResult.latency_ms}ms on ${sttResult.device})`);
          } else {
            console.error('❌ STT service error:', await sttResponse.text());
            console.log('🔄 Falling back to placeholder topic');
          }
          
        } catch (sttError) {
          console.error('❌ STT request failed:', sttError);
          console.log('🔄 Falling back to placeholder topic');
        }
      } else {
        console.log('⚠️ No audio recorded, using placeholder topic');
      }
      
      console.log(`🎯 Using topic: "${detectedTopic}"`);
      
      // Generate questions with immediate first question
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: detectedTopic }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Generated questions:', result);
      
      // Store questions for later use
      (window as any).__quizQuestions = result.questions;
      (window as any).__currentQuestionIndex = 0;
      
      // Play the first question immediately
      playQuestionSequence(result.firstQuestion);
      
    } catch (error) {
      console.error('Failed to process topic and generate questions:', error);
      // Fallback: play a default message or restart the flow
    }
  };

  const playQuestionSequence = (question: any) => {
    console.log(`Playing question: ${question.filled_question}`);
    
    // Play live TTS question directly → start listening (no pre/post audio needed)
    const liveTTS = question.template.live_tts;
    
    if (liveTTS.audioUrl) {
      // Direct audio URL
      playLiveQuestionOnly(liveTTS.audioUrl, question);
    } else if (liveTTS.pollUrl) {
      // Poll for TTS completion
      pollAndPlayLiveTTS(liveTTS.pollUrl, question);
    } else {
      console.error('No audio URL or poll URL for live TTS');
    }
  };

  const playLiveQuestionOnly = (liveAudioUrl: string, question: any) => {
    console.log(`🎵 Playing question audio: ${liveAudioUrl}`);
    const liveAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${liveAudioUrl}`);
    
    liveAudio.play().catch(console.error);
    
    // After question finishes, start listening for answer
    liveAudio.addEventListener('ended', () => {
      console.log('✅ Question audio complete, starting answer listening');
      startAnswerListening(question);
    }, { once: true });
  };

  const pollAndPlayLiveTTS = async (pollUrl: string, question: any) => {
    try {
      const pollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${pollUrl}`);
      const pollResult = await pollResponse.json();
      
      if (pollResult.status === 'completed' && pollResult.audioUrl) {
        playLiveQuestionOnly(pollResult.audioUrl, question);
      } else if (pollResult.status === 'generating') {
        // Keep polling
        setTimeout(() => pollAndPlayLiveTTS(pollUrl, question), 500);
      } else {
        console.error('TTS generation failed:', pollResult);
      }
    } catch (error) {
      console.error('Failed to poll for TTS:', error);
    }
  };

  const startAnswerListening = (question: any) => {
    console.log(`🎤 Starting answer listening for: ${question.filled_question}`);
    
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      console.error('Speech Recognition API not available');
      setTimeout(() => moveToNextQuestion(), 3000);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let answerDetected = false;
    let answerTimeout: NodeJS.Timeout;

    // Set 30-second timeout for answer
    answerTimeout = setTimeout(() => {
      if (!answerDetected) {
        console.log('⏰ Answer timeout - playing "thinking too long" response');
        recognition.stop();
        playThinkingTooLongResponse();
      }
    }, 30000);

    recognition.addEventListener('result', (event) => {
      console.log(`🎯 Answer result received: ${event.results.length} results`);
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const userAnswer = event.results[i][0].transcript.trim();
          
          if (userAnswer && !answerDetected) {
            answerDetected = true;
            clearTimeout(answerTimeout);
            console.log(`✅ Answer captured: "${userAnswer}"`);
            
            recognition.stop();
            
            // Process the answer with Gemini evaluation
            processAnswerWithFeedback(question, userAnswer);
            
            break;
          }
        }
      }
    });

    recognition.addEventListener('error', (event) => {
      console.error('❌ Answer recognition error:', event.error);
      clearTimeout(answerTimeout);
      moveToNextQuestion();
    });

    recognition.addEventListener('start', () => {
      console.log('🟢 Answer recognition started');
    });

    recognition.addEventListener('end', () => {
      console.log('🛑 Answer recognition ended');
    });

    try {
      recognition.start();
      console.log('▶️ Answer recognition listening...');
    } catch (error) {
      console.error('Failed to start answer recognition:', error);
      clearTimeout(answerTimeout);
      moveToNextQuestion();
    }
  };

  const moveToNextQuestion = () => {
    const questions = (window as any).__quizQuestions || [];
    const currentIndex = (window as any).__currentQuestionIndex || 0;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < questions.length) {
      console.log(`➡️ Moving to question ${nextIndex + 1}/${questions.length}`);
      (window as any).__currentQuestionIndex = nextIndex;
      
      // Play the next question
      const nextQuestion = questions[nextIndex];
      playQuestionSequence(nextQuestion);
    } else {
      console.log('🏁 Quiz completed!');
      console.log('🎉 All questions finished! Great job!');
      // Quiz is complete - could trigger completion UI here
    }
  };

  const processAnswerWithFeedback = async (question: any, userAnswer: string) => {
    try {
      console.log(`🧠 Evaluating answer: "${userAnswer}"`);
      
      // Send answer to evaluation endpoint
      const evaluationResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/evaluate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.filled_question,
          userAnswer: userAnswer,
          expectedKeywords: question.expected_keywords
        })
      });

      const evaluation = await evaluationResponse.json();
      console.log(`📊 Evaluation result:`, evaluation);

      // Generate TTS for pre-recorded response
      const ttsResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: evaluation.preRecordedResponse,
          voice_id: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'dTtuO9q1gaF6JeIDjwri'
        })
      });

      const ttsResult = await ttsResponse.json();
      console.log(`🎵 Feedback TTS job created:`, ttsResult.jobId);

      // Play feedback audio sequence
      await playFeedbackSequence(ttsResult.jobId, evaluation);

    } catch (error) {
      console.error('❌ Error processing answer:', error);
      // Fallback: just move to next question
      setTimeout(() => moveToNextQuestion(), 1000);
    }
  };

  const playFeedbackSequence = async (feedbackJobId: string, evaluation: any) => {
    try {
      // Poll for feedback TTS completion
      console.log(`⏰ Polling for feedback TTS: ${feedbackJobId}`);
      
      const pollFeedback = async (): Promise<void> => {
        const pollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/job/${feedbackJobId}`);
        const pollResult = await pollResponse.json();
        
        if (pollResult.status === 'completed' && pollResult.audioUrl) {
          // Play feedback audio
          const feedbackAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${pollResult.audioUrl}`);
          feedbackAudio.play().catch(console.error);
          
          feedbackAudio.addEventListener('ended', async () => {
            console.log(`✅ Feedback complete. Answer was ${evaluation.isCorrect ? 'CORRECT' : 'WRONG'}`);
            
            // If wrong and there's an explanation, generate and play it
            if (!evaluation.isCorrect && evaluation.liveExplanation) {
              console.log(`💡 Playing explanation: "${evaluation.liveExplanation}"`);
              
              const explanationResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: evaluation.liveExplanation,
                  voice_id: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'dTtuO9q1gaF6JeIDjwri'
                })
              });
              
              const explanationTTS = await explanationResponse.json();
              
              // Poll and play explanation
              const pollExplanation = async (): Promise<void> => {
                const explPollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/job/${explanationTTS.jobId}`);
                const explPollResult = await explPollResponse.json();
                
                if (explPollResult.status === 'completed' && explPollResult.audioUrl) {
                  const explanationAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${explPollResult.audioUrl}`);
                  explanationAudio.play().catch(console.error);
                  
                  explanationAudio.addEventListener('ended', () => {
                    console.log('📚 Explanation complete, moving to next question');
                    setTimeout(() => moveToNextQuestion(), 1000);
                  }, { once: true });
                  
                } else if (explPollResult.status === 'generating') {
                  setTimeout(pollExplanation, 500);
                } else {
                  console.error('Explanation TTS failed');
                  setTimeout(() => moveToNextQuestion(), 1000);
                }
              };
              
              pollExplanation();
              
            } else {
              // No explanation needed, move to next question
              setTimeout(() => moveToNextQuestion(), 1000);
            }
          }, { once: true });
          
        } else if (pollResult.status === 'generating') {
          setTimeout(pollFeedback, 500);
        } else {
          console.error('Feedback TTS failed');
          setTimeout(() => moveToNextQuestion(), 1000);
        }
      };
      
      pollFeedback();
      
    } catch (error) {
      console.error('❌ Error playing feedback:', error);
      setTimeout(() => moveToNextQuestion(), 1000);
    }
  };

  const playThinkingTooLongResponse = async () => {
    try {
      console.log('⏰ Getting "thinking too long" response');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/thinking-too-long`);
      const result = await response.json();
      
      console.log(`🤔 Thinking response: "${result.response}"`);
      
      // Generate TTS for thinking response
      const ttsResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.response,
          voice_id: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'dTtuO9q1gaF6JeIDjwri'
        })
      });

      const ttsResult = await ttsResponse.json();
      
      // Poll and play thinking response
      const pollThinking = async (): Promise<void> => {
        const pollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/job/${ttsResult.jobId}`);
        const pollResult = await pollResponse.json();
        
        if (pollResult.status === 'completed' && pollResult.audioUrl) {
          const thinkingAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${pollResult.audioUrl}`);
          thinkingAudio.play().catch(console.error);
          
          thinkingAudio.addEventListener('ended', () => {
            console.log('⏰ Thinking response complete, moving to next question');
            setTimeout(() => moveToNextQuestion(), 1000);
          }, { once: true });
          
        } else if (pollResult.status === 'generating') {
          setTimeout(pollThinking, 500);
        } else {
          console.error('Thinking TTS failed');
          setTimeout(() => moveToNextQuestion(), 1000);
        }
      };
      
      pollThinking();
      
    } catch (error) {
      console.error('❌ Error playing thinking response:', error);
      setTimeout(() => moveToNextQuestion(), 1000);
    }
  };

  const captureAndAnalyzeOutfit = async (stream: MediaStream) => {
    try {
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true; // CRITICAL: Mute to prevent microphone feedback!
      video.play();

      // Wait for video to be ready and playing
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
      });
      
      // Wait a bit more for the camera to actually start showing video
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Send to backend for Gemini analysis
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/analyze-outfit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();
      console.log('Wheatley says:', result.wittyOneLiner);
      
      // Store the TTS result and coordinate with Second Intro timing
      const playWheatleyWhenIntroEnds = (audioUrl: string) => {
        const introAudio = (window as any).__introAudio;
        
        const playWheatleyThenWhatTopic = () => {
          const wheatleyAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${audioUrl}`);
          wheatleyAudio.play().catch(console.error);
          
          // After Wheatley's TTS finishes, play "What Topic.mp3"
          wheatleyAudio.addEventListener('ended', () => {
            const whatTopicAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/what-topic?t=${Date.now()}`);
            whatTopicAudio.play().catch(console.error);
            
            // IMMEDIATELY after What Topic finishes, start fresh speech recognition
            whatTopicAudio.addEventListener('ended', () => {
              console.log('🎤 What Topic.mp3 finished - starting speech recognition NOW');
              console.log('🔥 CALLING startTopicListening() function now...');
              startTopicListening();
            }, { once: true });
            
            // DEBUG: Also add direct debugging for What Topic audio
            whatTopicAudio.addEventListener('loadstart', () => {
              console.log('📥 What Topic.mp3 loading started');
            });
            
            whatTopicAudio.addEventListener('canplay', () => {
              console.log('▶️ What Topic.mp3 can play');
            });
            
            whatTopicAudio.addEventListener('play', () => {
              console.log('🎵 What Topic.mp3 started playing');
            });
          }, { once: true });
        };
        
        if (introAudio && !introAudio.ended && !introAudio.paused) {
          // Second Intro is still playing, wait for it to finish
          introAudio.addEventListener('ended', playWheatleyThenWhatTopic, { once: true });
        } else {
          // Second Intro already finished, play immediately
          playWheatleyThenWhatTopic();
        }
      };

      // Handle TTS response - either direct URL or polling
      if (result.audioUrl) {
        playWheatleyWhenIntroEnds(result.audioUrl);
      } else if (result.pollUrl) {
        // Poll for TTS completion and play when ready
        const pollForAudio = async () => {
          try {
            const pollResponse = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${result.pollUrl}`);
            const pollResult = await pollResponse.json();
            
            if (pollResult.status === 'completed' && pollResult.audioUrl) {
              playWheatleyWhenIntroEnds(pollResult.audioUrl);
            } else if (pollResult.status === 'generating') {
              // Keep polling
              setTimeout(pollForAudio, 500);
            }
          } catch (error) {
            console.error('Failed to poll for TTS:', error);
          }
        };
        pollForAudio();
      }
      
    } catch (error) {
      console.error('Failed to capture and analyze outfit:', error);
    }
  };


  const handleStart = async () => {
    // Mute any currently playing audio (intro)
    const audioPlayer = (window as any).__audioPlayer;
    if (audioPlayer && audioPlayer.audioRef && audioPlayer.audioRef.current) {
      audioPlayer.audioRef.current.pause();
    }

    // Play "Second Intro.mp3" as latency buffer (cache-bust to get updated version)
    const secondIntroAudio = new Audio(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/static/intro/second-intro?t=${Date.now()}`);
    (window as any).__introAudio = secondIntroAudio;
    
    try {
      await secondIntroAudio.play();
    } catch (error) {
      console.error('Failed to play second intro audio:', error);
    }

    // Request permissions directly in the click handler (user gesture context)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }, 
        video: true 
      });
      (window as any).__portalStream = stream;
      setCameraEnabled(true);
      
      // Wait for camera stream to initialize, then capture
      setTimeout(() => {
        captureAndAnalyzeOutfit(stream);
      }, 1000);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
        (window as any).__portalStream = stream;
      } catch {
        console.warn("No media permissions granted");
      }
    }

    // Start speech recognition in user gesture context
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      (window as any).__portalRecognition = recognition;
      recognition.start();
    }

    setState("transitioning");
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      <AudioPlayer playIntroOnMount={true} />
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--chamber-bg)) 80%)",
        }}
      />

      {/* Portal ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 mb-10"
      >
        <PortalRing />
      </motion.div>

      {/* Title */}
      <div className="relative z-10 text-center space-y-3 mb-10">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-wider text-glow">
          <GlitchText text="APERTURE TESTING" delay={500} />
        </h1>
        <p className="text-sm md:text-base font-mono text-muted-foreground max-w-md mx-auto">
          <GlitchText
            text="Observation Protocol v2.4 — Cognitive Evaluation Chamber"
            delay={1800}
          />
        </p>
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 0.5 }}
        onClick={handleStart}
        className="relative z-10 group px-8 py-3 bg-primary/10 border border-primary/40 rounded-sm font-display text-sm tracking-[0.2em] uppercase text-primary transition-all hover:bg-primary/20 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background"
        style={{
          boxShadow: "0 0 20px hsl(var(--glow-primary) / 0.1)",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.boxShadow =
            "0 0 30px hsl(var(--glow-primary) / 0.3), 0 0 60px hsl(var(--glow-primary) / 0.1)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.boxShadow =
            "0 0 20px hsl(var(--glow-primary) / 0.1)";
        }}
      >
        Begin Evaluation
      </motion.button>

      {/* Bottom console text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="absolute bottom-6 text-[10px] font-mono text-muted-foreground/40 tracking-wider"
      >
        APERTURE SCIENCE ENRICHMENT CENTER — ALL RIGHTS RESERVED
      </motion.div>
    </div>
  );
}
