import React, { useState, useEffect, useRef } from "react";
import { useFamily } from "../context/FamilyContext";
import { WaveformVisualizer } from "../components/WaveformVisualizer";
import { Mic, MicOff, Sparkles, Square, Pause, Play, Save, ChevronDown } from "lucide-react";


// Simple prompt list
const storyPrompts = [
  "What was their favorite childhood memory of the old country?",
  "Describe a lesson they taught you that you still use today.",
  "What was their favorite hobby or Sunday ritual?",
  "Tell a story about their wedding day or how they met.",
  "Describe their journey or migration story in their own words."
];

export const StorytellingHubView: React.FC = () => {
  const { individuals, updateIndividual, geminiApiKey } = useFamily();
  const [selectedIndiId, setSelectedIndiId] = useState<string>("");
  const [storyText, setStoryText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Voice Over states
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isPausedVoice, setIsPausedVoice] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const voiceRate = 1;

  // AI polishing styles
  const [aiStyle, setAiStyle] = useState<"nostalgic" | "epic" | "concise">("nostalgic");

  // Dictation/Speech recognition ref
  const recognitionRef = useRef<any>(null);

  // Load individuals lists
  const indiList = Object.values(individuals);

  useEffect(() => {
    if (indiList.length > 0 && !selectedIndiId) {
      // Pick first individual as default
      setSelectedIndiId(indiList[0].id);
      setStoryText(indiList[0].story || "");
    }
  }, [indiList, selectedIndiId]);

  // Load voice options for TTS
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Select a default English/Italian voice if available
      const defaultVoice = voices.find(v => v.lang.startsWith("en") || v.lang.startsWith("it")) || voices[0];
      if (defaultVoice) {
        setSelectedVoiceName(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleIndiChange = (id: string) => {
    setSelectedIndiId(id);
    const indi = individuals[id];
    setStoryText(indi?.story || "");
    
    // Stop voice playback if reading
    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);
    setIsPausedVoice(false);
  };

  const handleSave = () => {
    if (selectedIndiId) {
      updateIndividual(selectedIndiId, { story: storyText });
      alert("Story saved successfully!");
    }
  };

  // --- Dictation (Speech to Text) ---
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setStoryText(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // --- AI story polishing using Gemini or local simulation ---
  const handleAiPolish = async () => {
    if (!storyText.trim()) {
      alert("Please write or dictate some initial draft text first.");
      return;
    }

    setIsAiLoading(true);

    const styleInstructions = {
      nostalgic: "Write a warm, nostalgic, family-focused narrative rich in emotion and sensory details.",
      epic: "Write a grand, epic historical chronicle showing their resilience, struggles, and trials over time.",
      concise: "Write a clear, structured, and polished biographical chronology, preserving key facts in elegant language."
    };

    const targetIndi = individuals[selectedIndiId];
    const name = targetIndi ? `${targetIndi.firstName} ${targetIndi.lastName}` : "this family member";

    if (geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an expert biographer and heritage storyteller. 
                      Please polish the following oral history transcript draft about ${name} in a "${aiStyle}" writing style.
                      
                      Style instructions: ${styleInstructions[aiStyle]}
                      
                      Keep all facts, dates, and historical details exactly as mentioned.
                      Do not add fake historical facts, but feel free to expand descriptions and improve grammatical flow.
                      Output ONLY the polished story text without any commentary or headers.
                      
                      Draft text:
                      ${storyText}`
                    }
                  ]
                }
              ]
            })
          }
        );

        if (!response.ok) {
          throw new Error("Gemini API call failed");
        }

        const resData = await response.json();
        const outputText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) {
          animateTextReplacement(outputText.trim());
        } else {
          throw new Error("Could not parse AI output");
        }
      } catch (error) {
        console.error("AI Polish error:", error);
        alert("Gemini API call failed. Falling back to local simulation.");
        runSimulatedPolish();
      }
    } else {
      runSimulatedPolish();
    }
  };

  // Typewriter style animation replacement
  const animateTextReplacement = (newText: string) => {
    setStoryText("");
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < newText.length) {
        // Feed in blocks of 5 characters for speed
        const chunk = newText.substring(currentIdx, currentIdx + 5);
        setStoryText(prev => prev + chunk);
        currentIdx += 5;
      } else {
        clearInterval(interval);
        setIsAiLoading(false);
      }
    }, 15);
  };

  const runSimulatedPolish = () => {
    setTimeout(() => {
      const templateIntroduction = {
        nostalgic: "In the gentle warmth of memory, we recall the path of ",
        epic: "Through the winds of change and the crossings of oceans, the history of ",
        concise: "Biographical Record of "
      };
      
      const targetIndi = individuals[selectedIndiId];
      const name = targetIndi ? `${targetIndi.firstName} ${targetIndi.lastName}` : "our ancestor";
      
      const simulation = `${templateIntroduction[aiStyle]}${name}.

${storyText}

(Tip: Paste your own Gemini API Key in the top toolbar to get fully custom AI-polished historical stories that analyze and rewrite your transcript drafts in real-time!)`;
      
      animateTextReplacement(simulation);
    }, 2000);
  };

  // --- Voice Over (Text to Speech) ---
  const handleVoicePlay = () => {
    if (isPausedVoice) {
      window.speechSynthesis.resume();
      setIsPausedVoice(false);
      setIsPlayingVoice(true);
      return;
    }

    // Stop current speech
    window.speechSynthesis.cancel();

    if (!storyText) return;

    const utterance = new SpeechSynthesisUtterance(storyText);
    
    // Assign voice
    const voice = availableVoices.find(v => v.name === selectedVoiceName);
    if (voice) utterance.voice = voice;
    
    utterance.rate = voiceRate;

    utterance.onend = () => {
      setIsPlayingVoice(false);
      setIsPausedVoice(false);
    };

    utterance.onerror = () => {
      setIsPlayingVoice(false);
      setIsPausedVoice(false);
    };

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoicePause = () => {
    window.speechSynthesis.pause();
    setIsPausedVoice(true);
    setIsPlayingVoice(false);
  };

  const handleVoiceStop = () => {
    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);
    setIsPausedVoice(false);
  };

  // Cleanup voice synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const wordCount = storyText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-[calc(100vh-73px)] flex bg-background">
      {/* Left Sidebar: Inspiration & Prompts */}
      <aside className="w-[320px] bg-surface-low/30 border-r border-outline-variant/30 p-6 overflow-y-auto hidden lg:block shrink-0">
        <div className="mb-8 space-y-4">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            Contributor Details
          </h3>
          <div className="space-y-3 text-xs bg-surface-low border border-outline-variant/30 p-4 rounded-2xl">
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block">Contributor</span>
              <p className="font-semibold text-on-surface flex items-center gap-1.5 mt-0.5">
                You (Marco O.)
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block">Entry Date</span>
              <p className="font-semibold text-on-surface mt-0.5">May 21, 2026</p>
            </div>
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block">Sync Status</span>
              <p className="font-semibold text-primary/80 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                Autosave Enabled
              </p>
            </div>
          </div>
        </div>

        {/* Story Prompts */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={13} />
            Heritage Prompts
          </div>
          <div className="space-y-2.5">
            {storyPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setStoryText(prev => {
                    const sep = prev === "" ? "" : "\n\n";
                    return prev + sep + prompt + "\n";
                  });
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-surface-lowest border border-outline-variant/20 hover:border-primary/50 transition-all group"
              >
                <p className="text-[11px] font-semibold leading-relaxed text-on-surface-variant group-hover:text-on-surface">
                  {prompt}
                </p>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-center text-on-surface-variant/50 italic">
            Click prompts to append to writing canvas
          </p>
        </div>
      </aside>

      {/* Main Story Editor Panel */}
      <main className="flex-grow flex flex-col p-6 md:p-8 max-w-4xl mx-auto">
        {/* Hub Header & Dropdown Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-outline-variant/20 pb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
              🎙️ Oral History Studio
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Select a relative to dictate, polish, and synthesize their stories.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <select
              value={selectedIndiId}
              onChange={(e) => handleIndiChange(e.target.value)}
              className="w-full text-xs font-semibold bg-surface-lowest border border-outline-variant rounded-xl pl-4 pr-10 py-2.5 appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              {indiList.map(indi => (
                <option key={indi.id} value={indi.id}>
                  {indi.firstName} {indi.lastName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>

        {/* Studio Widget */}
        <section className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/25 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5 pb-4 border-b border-outline-variant/20">
            <div>
              <h2 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                Voice Dictation Recorder
              </h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Talk to narrate. Real-time browser speech recognition will write for you.
              </p>
            </div>
            {isRecording && (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full animate-pulse uppercase tracking-wider flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                Voice Recording Live
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Waveform renderer */}
            <div className="md:col-span-2">
              <WaveformVisualizer isRecording={isRecording} isPaused={false} />
            </div>

            {/* Mic trigger button */}
            <div className="flex justify-center">
              <button
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                  isRecording
                    ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
                    : "bg-primary text-on-primary hover:bg-primary-hover shadow-primary/10"
                }`}
              >
                {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
            </div>
          </div>
        </section>

        {/* Text Area & Formatting Tools */}
        <section className="flex-grow flex flex-col space-y-4">
          <div className="flex flex-wrap justify-between items-center bg-surface-low border border-outline-variant/30 px-4 py-2.5 rounded-xl gap-3">
            {/* AI Polish styling select */}
            <div className="flex items-center gap-2">
              <select
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold text-on-surface-variant uppercase tracking-wider appearance-none focus:outline-none pr-6 cursor-pointer"
              >
                <option value="nostalgic">Nostalgic Narrative</option>
                <option value="epic">Epic Chronicle</option>
                <option value="concise">Concise Chronology</option>
              </select>
              <button
                onClick={handleAiPolish}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-lg hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all"
              >
                <Sparkles size={11} className={isAiLoading ? "animate-spin" : ""} />
                {isAiLoading ? "Processing Draft..." : "AI Story Polish"}
              </button>
            </div>

            {/* Text to Speech synthesizer controls */}
            <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3">
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="bg-transparent text-[9px] font-semibold text-on-surface-variant max-w-[120px] truncate focus:outline-none cursor-pointer"
              >
                {availableVoices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              
              <div className="flex gap-1">
                {isPlayingVoice ? (
                  <button
                    onClick={handleVoicePause}
                    className="p-1 hover:text-primary hover:bg-surface-high/50 rounded"
                    title="Pause Voice-over"
                  >
                    <Pause size={13} />
                  </button>
                ) : (
                  <button
                    onClick={handleVoicePlay}
                    className="p-1 hover:text-primary hover:bg-surface-high/50 rounded"
                    title="Listen Voice-over"
                  >
                    <Play size={13} />
                  </button>
                )}
                <button
                  onClick={handleVoiceStop}
                  className="p-1 hover:text-primary hover:bg-surface-high/50 rounded"
                  title="Stop Audio"
                >
                  <Square size={11} />
                </button>
              </div>
            </div>
          </div>

          <textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="Dictate your stories using the microphone, or type your drafts here. Select 'AI Story Polish' above to convert your rough transcript drafts into beautiful biographical narratives..."
            className="w-full flex-grow min-h-[300px] bg-transparent text-sm leading-[1.8] font-serif italic text-on-surface border-none focus:ring-0 p-2 focus:outline-none resize-y"
          />

          <div className="flex justify-between items-center border-t border-outline-variant/20 pt-4 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
            <span>
              Words Preserved: <span className="text-on-surface">{wordCount}</span>
            </span>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold rounded-xl active:scale-95 transition-all shadow"
            >
              <Save size={13} />
              Save Story
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
