import React, { useState, useRef } from 'react';

export function SpeechTest() {
  const [log, setLog] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const recognitionRef = useRef<any>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSpeechRecognition = () => {
    addLog('🎤 Testing Speech Recognition...');
    
    // Check if APIs exist
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    addLog(`🌍 Environment Check:`);
    addLog(`  - SpeechRecognition: ${!!(window as any).SpeechRecognition}`);
    addLog(`  - webkitSpeechRecognition: ${!!(window as any).webkitSpeechRecognition}`);
    addLog(`  - Browser: ${navigator.userAgent}`);
    addLog(`  - Protocol: ${window.location.protocol}`);
    addLog(`  - Host: ${window.location.host}`);
    addLog(`  - HTTPS: ${window.location.protocol === 'https:'}`);
    
    if (!SpeechRecognition) {
      addLog('❌ Speech Recognition API not available');
      addLog('💡 Web Speech API requires HTTPS or localhost in Chrome/Edge');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      addLog('✅ Speech Recognition instance created');
      addLog(`🎯 Settings: continuous=${recognition.continuous}, interimResults=${recognition.interimResults}, lang=${recognition.lang}`);
      
      recognition.onstart = () => {
        addLog('🟢 Speech recognition started');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        addLog('🔴 Speech recognition ended');
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        addLog(`❌ Speech recognition error: ${event.error} - ${event.message || 'No message'}`);
        setIsListening(false);
      };
      
      recognition.onsoundstart = () => {
        addLog('🔊 Sound detected');
      };
      
      recognition.onsoundend = () => {
        addLog('🔇 Sound ended');
      };
      
      recognition.onspeechstart = () => {
        addLog('🗣️ Speech detected!');
      };
      
      recognition.onspeechend = () => {
        addLog('🛑 Speech ended');
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          addLog(`✅ Final result: "${finalTranscript}"`);
          setRecognizedText(finalTranscript);
        }
        
        if (interimTranscript) {
          addLog(`🔄 Interim result: "${interimTranscript}"`);
        }
      };
      
      recognition.start();
      addLog('▶️ Starting speech recognition...');
      
    } catch (error) {
      addLog(`❌ Failed to start speech recognition: ${error}`);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      addLog('⏹️ Manually stopped speech recognition');
    }
  };

  const clearLog = () => {
    setLog([]);
    setRecognizedText('');
  };

  const testMicrophone = async () => {
    addLog('🎙️ Testing microphone access...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('✅ Microphone access granted');
      addLog(`🎙️ Audio tracks: ${stream.getAudioTracks().length}`);
      
      stream.getAudioTracks().forEach(track => {
        addLog(`  - Track: ${track.label}, enabled: ${track.enabled}, ready: ${track.readyState}`);
        track.stop();
      });
      
    } catch (error) {
      addLog(`❌ Microphone access denied: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-6">🎤 Speech Recognition Test Suite</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Controls</h2>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={testSpeechRecognition}
              disabled={isListening}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
            >
              {isListening ? '🎙️ Listening...' : '▶️ Start Speech Test'}
            </button>
            
            <button 
              onClick={stopListening}
              disabled={!isListening}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
            >
              ⏹️ Stop Listening
            </button>
            
            <button 
              onClick={testMicrophone}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              🎙️ Test Microphone
            </button>
            
            <button 
              onClick={clearLog}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              🗑️ Clear Log
            </button>
          </div>

          {/* Recognition Status */}
          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold mb-2">Recognition Status</h3>
            <p>Status: {isListening ? '🟢 Listening' : '🔴 Stopped'}</p>
            {recognizedText && (
              <div className="mt-2">
                <p className="text-yellow-400">Last Result:</p>
                <p className="bg-black p-2 rounded">"{recognizedText}"</p>
              </div>
            )}
          </div>

          {/* Quick Test Instructions */}
          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Start Speech Test"</li>
              <li>Grant microphone permission if prompted</li>
              <li>Speak clearly: "cooking" or "physics"</li>
              <li>Watch the logs for detection events</li>
              <li>Check if speech is recognized</li>
            </ol>
          </div>
        </div>

        {/* Logs */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 p-4 rounded h-96 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Start Speech Test" to begin.</p>
            ) : (
              <div className="space-y-1">
                {log.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`text-sm ${
                      entry.includes('❌') ? 'text-red-400' : 
                      entry.includes('✅') ? 'text-green-400' :
                      entry.includes('🗣️') ? 'text-yellow-400' :
                      entry.includes('🔊') ? 'text-blue-400' :
                      'text-gray-300'
                    }`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return to main app */}
      <div className="mt-8">
        <a 
          href="/" 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded inline-block"
        >
          ← Back to Wheatly
        </a>
      </div>
    </div>
  );
}