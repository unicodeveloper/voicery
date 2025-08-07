'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('tts');
  const [text, setText] = useState('Transform your ideas into spoken words with our advanced voice synthesis technology.');
  const [selectedVoice, setSelectedVoice] = useState('Rachel');
  const [voices, setVoices] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTargetVoice, setSelectedTargetVoice] = useState('Rachel');
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [processedAudio, setProcessedAudio] = useState(null);
  
  // Voice settings
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.5);
  const [style, setStyle] = useState(0.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  
  // Voice filtering
  const [voiceCategory, setVoiceCategory] = useState('all');
  const [voiceLanguage, setVoiceLanguage] = useState('all');
  
  // Voice generation
  const [voiceDescription, setVoiceDescription] = useState('');
  const [generatedVoices, setGeneratedVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [finalVoiceDescription, setFinalVoiceDescription] = useState('');
  
  // Sound effects
  const [soundEffectText, setSoundEffectText] = useState('');
  const [soundEffectDuration, setSoundEffectDuration] = useState(10);
  const [soundEffectAudio, setSoundEffectAudio] = useState(null);
  
  // Streaming
  const [useStreaming, setUseStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('eleven_multilingual_v2');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.language && filters.language !== 'all') params.append('language', filters.language);
      
      const voicesResponse = await fetch(`/api/voices?${params}`);
      const voicesData = await voicesResponse.json();
      const loadedVoices = voicesData.voices || [];
      setVoices(loadedVoices);
      
      // Set the first available voice as selected if current selection is not in the list
      if (loadedVoices.length > 0 && !loadedVoices.some(voice => voice.voiceId === selectedVoice)) {
        setSelectedVoice(loadedVoices[0].voiceId);
      }
      
      // Also update target voice for cloning if it's not in the list
      if (loadedVoices.length > 0 && !loadedVoices.some(voice => voice.voiceId === selectedTargetVoice)) {
        setSelectedTargetVoice(loadedVoices[0].voiceId);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      // Fallback voices
      setVoices([]);
    }
  };

  // Filter voices when filters change
  useEffect(() => {
    loadVoices({
      category: voiceCategory,
      language: voiceLanguage
    });
  }, [voiceCategory, voiceLanguage]);

  // Auto-play audio when new audioUrl is set
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load(); // Reload the audio element
      audioRef.current.play().catch(error => {
        console.log('Auto-play prevented by browser:', error);
      });
    }
  }, [audioUrl]);

  // Cleanup generated voice URLs when component unmounts or voices change
  useEffect(() => {
    return () => {
      generatedVoices.forEach(voice => {
        if (voice.audioUrl) {
          URL.revokeObjectURL(voice.audioUrl);
        }
      });
    };
  }, [generatedVoices]);

  const generateSpeech = async () => {
    setIsGenerating(true);
    
    try {
      const endpoint = useStreaming ? '/api/streaming-tts' : '/api/text-to-speech';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice_id: selectedVoice,
          model_id: selectedModel,
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost,
            style: style,
            use_speaker_boost: useSpeakerBoost,
            speed: speed
          },
          streaming: useStreaming,
          optimize_streaming_latency: useStreaming ? 4 : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsGenerating(false);
      setShowNotification(true);
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setIsGenerating(false);
    }
  };

  const generateVoice = async () => {
    if (!voiceDescription.trim()) return;
    
    // Clear previous generated voices and their URLs
    generatedVoices.forEach(voice => {
      if (voice.audioUrl) {
        URL.revokeObjectURL(voice.audioUrl);
      }
    });
    setGeneratedVoices([]);
    setSelectedVoiceIndex(null);
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/voice-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_description: voiceDescription,
          text: text
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate voice');
      }
      
      const data = await response.json();
      
      // Process the previews to create audio URLs from base64 data
      const processedPreviews = (data.previews || []).map((voice, index) => {
        if (voice.audioBase64) {
          // Convert base64 to blob and create URL
          const binaryString = atob(voice.audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: voice.mediaType || 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          
          return {
            ...voice,
            audioUrl,
            blob
          };
        }
        return voice;
      });
      
      setGeneratedVoices(processedPreviews);
      setShowNotification(true);
    } catch (error) {
      console.error('Voice generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVoice = () => {
    if (selectedVoiceIndex === null) return;
    setFinalVoiceDescription(voiceDescription);
    setShowVoiceModal(true);
  };

  const saveGeneratedVoice = async () => {
    if (selectedVoiceIndex === null || !voiceName.trim()) return;
    
    const selectedVoice = generatedVoices[selectedVoiceIndex];

    console.log("Selected Voice ", selectedVoice);
    console.log("Selected Voice ID", selectedVoice.generatedVoiceId);

    if (!selectedVoice) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/voice-generation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generatedVoiceId: selectedVoice.generatedVoiceId,
          voiceName: voiceName.trim(),
          voiceDescription: finalVoiceDescription.trim()
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save voice: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Voice saved successfully:', data);
      
      // Close modal and reset state
      setShowVoiceModal(false);
      setVoiceName('');
      setSelectedVoiceIndex(null);
      setShowNotification(true);
      
      // Optionally reload voices to show the new saved voice
      loadVoices({
        category: voiceCategory,
        language: voiceLanguage
      });
      
    } catch (error) {
      console.error('Failed to save voice:', error);
      // Show error to user
      alert(`Error saving voice: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSoundEffect = async () => {
    if (!soundEffectText.trim()) return;
    
    // Clear previous sound effect audio
    setSoundEffectAudio(null);
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/sound-effects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: soundEffectText,
          duration_seconds: soundEffectDuration
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate sound effect');
      }
      
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setSoundEffectAudio({ blob: audioBlob, url });
      setShowNotification(true);
    } catch (error) {
      console.error('Sound effect generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopSpeech = () => {
    setIsGenerating(false);
    setIsPlaying(false);
  };

  const startRecording = async () => {
    try {
      // Clear previous recorded audio
      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url);
      }
      setRecordedAudio(null);
      
      // Clear previous processed audio
      if (processedAudio?.url) {
        URL.revokeObjectURL(processedAudio.url);
      }
      setProcessedAudio(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url });
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes limit
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const processVoiceCloning = async () => {
    if (!recordedAudio) return;
    
    // Clear previous cloned voice cache
    if (processedAudio?.url) {
      URL.revokeObjectURL(processedAudio.url);
    }
    setProcessedAudio(null);
    
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('audio', recordedAudio.blob, 'recording.wav');
      formData.append('target_voice_id', selectedTargetVoice);
      
      const response = await fetch('/api/voice-clone', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process voice cloning');
      }
      
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setProcessedAudio({ blob: audioBlob, url });
      setShowNotification(true);
    } catch (error) {
      console.error('Voice cloning failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const processTranslation = async () => {
    if (!recordedAudio) return;
    
    // Clear previous translated audio cache
    if (processedAudio?.url) {
      URL.revokeObjectURL(processedAudio.url);
    }
    setProcessedAudio(null);
    
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('audio', recordedAudio.blob, 'recording.wav');
      formData.append('target_language', selectedLanguage);
      
      const response = await fetch('/api/translate-audio', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to translate audio');
      }
      
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setProcessedAudio({ blob: audioBlob, url });
      setShowNotification(true);
    } catch (error) {
      console.error('Audio translation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = (audioData, filename) => {
    if (!audioData) return;
    
    const link = document.createElement('a');
    link.href = audioData.url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'ru', name: 'Russian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'cs', name: 'Czech' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese (Mandarin)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'ko', name: 'Korean' },
    { code: 'hi', name: 'Hindi' },
    { code: 'fi', name: 'Finnish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'da', name: 'Danish' },
    { code: 'ta', name: 'Tamil' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'el', name: 'Greek' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl mb-4 sm:mb-6 shadow-sm border border-border">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-2 sm:mb-4">
              Voicery
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
              Sound like anyone. Speak any language. Clone your Vibe 🔉
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="bg-card border border-border rounded-xl p-1 flex flex-wrap gap-1 w-full sm:w-auto max-w-full overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveTab('tts')}
                className={'px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none min-w-0 ' + (
                  activeTab === 'tts'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className="sm:hidden">TTS</span>
                <span className="hidden sm:inline">Text to Speech</span>
              </button>
              <button
                onClick={() => setActiveTab('clone')}
                className={'px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none min-w-0 ' + (
                  activeTab === 'clone'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className="sm:hidden">Clone</span>
                <span className="hidden sm:inline">Voice Cloning</span>
              </button>
              <button
                onClick={() => setActiveTab('translate')}
                className={'px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none min-w-0 ' + (
                  activeTab === 'translate'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className="sm:hidden">Translate</span>
                <span className="hidden sm:inline">Audio Translation</span>
              </button>
              <button
                onClick={() => setActiveTab('voice-gen')}
                className={'px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none min-w-0 ' + (
                  activeTab === 'voice-gen'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className="sm:hidden">Generate</span>
                <span className="hidden sm:inline">Voice Generation</span>
              </button>
              <button
                onClick={() => setActiveTab('sound-fx')}
                className={'px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none min-w-0 ' + (
                  activeTab === 'sound-fx'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className="sm:hidden">SFX</span>
                <span className="hidden sm:inline">Sound Effects</span>
              </button>
            </div>
          </div>

          {/* Notification */}
          {showNotification && (
            <div className="fixed top-4 left-4 right-4 sm:top-6 sm:right-6 sm:left-auto bg-card text-card-foreground px-4 py-3 sm:px-6 rounded-lg shadow-lg border border-border animate-in slide-in-from-top-2 duration-300 z-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></div>
                <span className="font-medium text-sm sm:text-base text-foreground">Voice synthesis complete!</span>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm p-4 sm:p-6 lg:p-8">
            {activeTab === 'tts' && (
              <div>
                <div className="mb-6 sm:mb-8">
                <label className="block text-foreground font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
                  Your Text
                </label>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-4 sm:p-6 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    rows={4}
                    placeholder="Enter the text you want to convert to speech..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs sm:text-sm text-muted-foreground">
                    {text.length} characters
                  </div>
                </div>
              </div>

              {/* Voice Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                <div>
                  <label className="block text-foreground font-semibold mb-2 text-sm sm:text-base">Category</label>
                  <select
                    value={voiceCategory}
                    onChange={(e) => setVoiceCategory(e.target.value)}
                    className="w-full p-3 sm:p-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm sm:text-base appearance-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="premade">Premade</option>
                    <option value="cloned">Cloned</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-2 text-sm sm:text-base">Language</label>
                  <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    className="w-full p-3 sm:p-3 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm sm:text-base appearance-none cursor-pointer"
                  >
                    <option value="all">All Languages</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                  </select>
                </div>
              </div>

              {/* Voice Selection & AI Model */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div>
                  <label className="block text-foreground font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
                    Select Voice ({voices.length} available)
                  </label>
                  {voices.length > 0 ? (
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full p-3 sm:p-4 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm sm:text-base appearance-none cursor-pointer"
                    >
                      { voices.map((voice) => (
                        <option key={voice.voiceId} value={voice.voiceId}>
                          {voice.name} {voice.category ? `(${voice.category})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full p-4 sm:p-6 bg-muted border border-border rounded-xl text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <div>
                          <h3 className="font-medium text-foreground mb-1">No voices found</h3>
                          <p className="text-sm text-muted-foreground">
                            No voices match your current filter selection. Try adjusting your category or language filters.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-foreground font-semibold mb-2 sm:mb-3 text-base sm:text-lg">AI Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 sm:p-4 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm sm:text-base appearance-none cursor-pointer"
                  >
                    <option value="eleven_multilingual_v2">Best Quality</option>
                    <option value="eleven_flash_v2_5">Ultra Fast</option>
                    <option value="eleven_turbo_v2_5">Balanced</option>
                  </select>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-foreground font-semibold mb-3 text-sm sm:text-base">
                      Style: {style.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={style}
                      onChange={(e) => setStyle(parseFloat(e.target.value))}
                      className="w-full h-6 sm:h-3 bg-muted rounded-full appearance-none cursor-pointer slider-thumb touch-manipulation"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>None</span>
                      <span>Exaggerated</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-foreground font-semibold mb-3 text-sm sm:text-base">
                      Speed: {speed.toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min="0.7"
                      max="1.2"
                      step="0.01"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-6 sm:h-3 bg-muted rounded-full appearance-none cursor-pointer slider-thumb touch-manipulation"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>0.7x</span>
                      <span>1.2x</span>
                    </div>
                  </div>
                  
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button
                  onClick={generateSpeech}
                  disabled={isGenerating || !text.trim() || voices.length === 0}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground disabled:text-muted-foreground font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 shadow-sm disabled:cursor-not-allowed text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                  </svg>
                  <span className="truncate">
                    {isGenerating ? 'Synthesizing...' : 
                     voices.length === 0 ? 'No voices available' : 
                     'Generate Voice'}
                  </span>
                </button>
                
                {audioUrl && (
                  <button
                    onClick={() => downloadAudio({ url: audioUrl }, 'speech.mp3')}
                    className="sm:flex-shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 shadow-sm text-sm sm:text-base min-h-[48px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download MP3</span>
                  </button>
                )}
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={'w-2 h-2 sm:w-3 sm:h-3 rounded-full ' + (isPlaying ? 'bg-accent animate-pulse' : 'bg-muted-foreground')}></div>
                      <span className="text-foreground font-medium text-sm sm:text-base">
                        {isPlaying ? 'Playing' : 'Ready'}
                      </span>
                    </div>
                  </div>
                  <audio 
                    ref={audioRef}
                    controls 
                    className="w-full h-12"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src={audioUrl} type="audio/mpeg"></source>
                  </audio>
                </div>
              )}
            </div>
            )}

            {activeTab === 'clone' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Voice Cloning</h2>
                  <p className="text-muted-foreground">Record your voice and transform it into any of the target voices </p>
                </div>

                {/* Recording Controls */}
                <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={'w-4 h-4 rounded-full ' + (isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground')}></div>
                      <span className="text-foreground font-medium">
                        {isRecording ? ('Recording: ' + formatTime(recordingTime)) : 'Ready to record'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Max: 3:00
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={'flex-1 ' + (isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700') + ' text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg'}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        {isRecording ? (
                          <path d="M6 6h12v12H6z"/>
                        ) : (
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                        )}
                      </svg>
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                  </div>
                </div>

                {recordedAudio && (
                  <>
                    <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                      <h3 className="text-foreground font-semibold mb-4">Your Recording</h3>
                      <audio controls className="w-full h-12 mb-4">
                        <source src={recordedAudio.url} type="audio/wav" />
                      </audio>
                    </div>

                    <div className="mb-6">
                      <label className="block text-foreground font-semibold mb-3 text-lg">
                        Select Target Voice
                      </label>
                      <select
                        value={selectedTargetVoice}
                        onChange={(e) => setSelectedTargetVoice(e.target.value)}
                        className="w-full p-4 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {voices.map((voice) => (
                          <option key={voice.voiceId} value={voice.voiceId}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={processVoiceCloning}
                        disabled={isGenerating}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed"
                      >
                        {isGenerating ? 'Processing...' : 'Clone Voice'}
                      </button>
                      
                      {processedAudio && (
                        <button
                          onClick={() => downloadAudio(processedAudio, 'cloned-voice.mp3')}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download MP3
                        </button>
                      )}
                    </div>
                  </>
                )}

                {processedAudio && (
                  <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                    <h3 className="text-foreground font-semibold mb-4">Cloned Voice Result</h3>
                    <audio controls className="w-full h-12">
                      <source src={processedAudio.url} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'translate' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Audio Translation</h2>
                  <p className="text-muted-foreground">Record audio and translate it to any of 32 languages</p>
                </div>

                {/* Recording Controls */}
                <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={'w-4 h-4 rounded-full ' + (isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground')}></div>
                      <span className="text-foreground font-medium">
                        {isRecording ? ('Recording: ' + formatTime(recordingTime)) : 'Ready to record'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Max: 3:00
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={'flex-1 ' + (isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700') + ' text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg'}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        {isRecording ? (
                          <path d="M6 6h12v12H6z"/>
                        ) : (
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                        )}
                      </svg>
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                  </div>
                </div>

                {recordedAudio && !processedAudio && (
                  <>
                    <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                      <h3 className="text-foreground font-semibold mb-4">Your Recording</h3>
                      <audio controls className="w-full h-12 mb-4">
                        <source src={recordedAudio.url} type="audio/wav" />
                      </audio>
                    </div>

                    <div className="mb-6">
                      <label className="block text-foreground font-semibold mb-3 text-lg">
                        Select Target Language
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full p-4 bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={processTranslation}
                        disabled={isGenerating}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed"
                      >
                        {isGenerating ? 'Translating...' : 'Translate Audio'}
                      </button>
                    </div>
                  </>
                )}

                {recordedAudio && processedAudio && !isGenerating && (
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => {
                        // Clear processed audio to go back to recording view
                        if (processedAudio?.url) {
                          URL.revokeObjectURL(processedAudio.url);
                        }
                        setProcessedAudio(null);
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Translate Another Audio
                    </button>
                    
                    <button
                      onClick={() => downloadAudio(processedAudio, 'translated-audio.mp3')}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download MP3
                    </button>
                  </div>
                )}

                {processedAudio && (
                  <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                    <h3 className="text-foreground font-semibold mb-4">Translated Audio Result</h3>
                    <audio controls className="w-full h-12">
                      <source src={processedAudio.url} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'voice-gen' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Voice Generation</h2>
                  <p className="text-muted-foreground">Create custom voices from text descriptions</p>
                </div>

                <div className="mb-6">
                  <label className="block text-foreground font-semibold mb-3 text-lg">
                    Voice Description
                  </label>
                  <textarea
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    className="w-full p-4 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                    rows={4}
                    placeholder="Describe the voice you want to create in detail. Be specific about tone, accent, age, style, and personality. For example: 'A calm, professional female voice with a slight British accent, aged around 30, speaking with confidence and warmth, perfect for educational content'..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-foreground font-semibold mb-3 text-lg">
                    Your Text
                  </label>
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className={`w-full p-4 bg-input border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                        text.length < 100 
                          ? 'border-red-400 focus:ring-red-500' 
                          : 'border-border focus:ring-ring'
                      }`}
                      rows={3}
                      placeholder="Enter the text you want the generated voice to speak (minimum 100 characters)..."
                    />
                    <div className={`absolute bottom-3 right-3 text-sm font-medium ${
                      text.length < 100 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      {text.length}/100 min
                      {text.length < 100 && (
                        <span className="ml-2 text-xs">
                          ({100 - text.length} more needed)
                        </span>
                      )}
                    </div>
                  </div>
                  {text.length < 100 && text.length > 0 && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                      Please provide more text (at least 100 characters) for voice generation.
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={generateVoice}
                    disabled={isGenerating || !voiceDescription.trim() || text.length < 100}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {isGenerating 
                      ? 'Generating Voice...' 
                      : !voiceDescription.trim()
                        ? 'Enter voice description'
                        : text.length < 100
                          ? `Text needs ${100 - text.length} more characters`
                          : 'Generate Voice'
                    }
                  </button>
                </div>

                {generatedVoices.length > 0 && (
                  <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                    <h3 className="text-foreground font-semibold mb-4">Generated Voice Previews - Select Your Favorite</h3>
                    <div className="space-y-4">
                      {generatedVoices.map((voice, index) => (
                        <div 
                          key={voice.generatedVoiceId || index} 
                          className={`bg-card rounded-lg p-4 border transition-all cursor-pointer ${
                            selectedVoiceIndex === index 
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/20' 
                              : 'border-border hover:border-accent/50'
                          }`}
                          onClick={() => setSelectedVoiceIndex(index)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                                selectedVoiceIndex === index 
                                  ? 'bg-accent border-accent' 
                                  : 'border-muted-foreground'
                              }`}>
                                {selectedVoiceIndex === index && (
                                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                )}
                              </div>
                              <span className="text-foreground font-medium">Preview {index + 1}</span>
                            </div>
                            <div className="text-right">
                              {voice.durationSecs && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(voice.durationSecs)}s
                                </span>
                              )}
                            </div>
                          </div>
                          {voice.audioUrl && (
                            <div className="space-y-2">
                              <audio controls className="w-full h-12" onClick={(e) => e.stopPropagation()}>
                                <source src={voice.audioUrl} type={voice.mediaType || 'audio/mpeg'} />
                              </audio>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAudio(voice, `generated-voice-${index + 1}.${voice.mediaType?.split('/')[1] || 'mp3'}`);
                                  }}
                                  className="text-xs bg-accent hover:bg-accent/90 text-accent-foreground px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Select Voice Button */}
                    <div className="mt-6 pt-4 border-t border-border">
                      <button
                        onClick={handleSelectVoice}
                        disabled={selectedVoiceIndex === null}
                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground disabled:text-muted-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-sm disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        {selectedVoiceIndex !== null ? `Select Preview ${selectedVoiceIndex + 1}` : 'Choose a Preview First'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sound-fx' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Sound Effects Generator</h2>
                  <p className="text-muted-foreground">Create realistic sound effects from text descriptions</p>
                </div>

                <div className="mb-6">
                  <label className="block text-foreground font-semibold mb-3 text-lg">
                    Sound Effect Description
                  </label>
                  <textarea
                    value={soundEffectText}
                    onChange={(e) => setSoundEffectText(e.target.value)}
                    className="w-full p-4 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                    rows={3}
                    placeholder="Describe the sound effect you want (e.g., 'Rain falling on a roof', 'Birds chirping in a forest', 'Car engine starting')..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-foreground font-semibold mb-3">
                    Duration: {soundEffectDuration} seconds
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="22"
                    value={soundEffectDuration}
                    onChange={(e) => setSoundEffectDuration(parseInt(e.target.value))}
                    className="w-full h-6 sm:h-3 bg-muted rounded-full appearance-none cursor-pointer slider-thumb touch-manipulation"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1s</span>
                    <span>22s</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={generateSoundEffect}
                    disabled={isGenerating || !soundEffectText.trim()}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    {isGenerating ? 'Generating Sound...' : 'Generate Sound Effect'}
                  </button>
                  
                  {soundEffectAudio && (
                    <button
                      onClick={() => downloadAudio(soundEffectAudio, 'sound-effect.mp3')}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download MP3
                    </button>
                  )}
                </div>

                {soundEffectAudio && (
                  <div className="bg-muted rounded-xl p-4 sm:p-6 border border-border">
                    <h3 className="text-foreground font-semibold mb-4">Generated Sound Effect</h3>
                    <audio controls className="w-full h-12">
                      <source src={soundEffectAudio.url} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Naming Modal */}
          {showVoiceModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-foreground">Save Your Voice</h3>
                    <button
                      onClick={() => setShowVoiceModal(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Voice Name *
                      </label>
                      <input
                        type="text"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        placeholder="Enter a name for your voice..."
                        className="w-full p-3 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {voiceName.length}/50 characters
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Description
                      </label>
                      <textarea
                        value={finalVoiceDescription}
                        onChange={(e) => setFinalVoiceDescription(e.target.value)}
                        placeholder="Describe your voice..."
                        className="w-full p-3 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {finalVoiceDescription.length}/500 characters
                      </p>
                    </div>
                    
                    {selectedVoiceIndex !== null && (
                      <div className="bg-muted rounded-lg p-3 border border-border">
                        <p className="text-sm text-foreground font-medium mb-1">
                          Selected: Preview {selectedVoiceIndex + 1}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This voice will be saved to your voice library
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowVoiceModal(false)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveGeneratedVoice}
                      disabled={!voiceName.trim() || isGenerating}
                      className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground disabled:text-muted-foreground font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                          </svg>
                          Save Voice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8">
            <p className="text-muted-foreground text-xs sm:text-sm px-4">
              Made with <span role="img" aria-label="love" className="text-red-500">❤️</span> by <a href='https://x.com/unicodeveloper' target="_blank" className="hover:text-foreground transition-colors">unicodeveloper</a> • Powered by <a href="https://elevenlabs.io/" target="_blank" className="hover:text-foreground transition-colors">ElevenLabs</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
