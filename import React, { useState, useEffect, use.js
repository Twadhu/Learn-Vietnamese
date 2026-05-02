import React, { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  ChevronDown,
  Check,
  Download,
  Globe,
  Info,
  KeyRound,
  Languages,
  Loader2,
  Mic2,
  Pause,
  Play,
  RefreshCw,
  Repeat2,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Split,
  Trash2,
  Volume2,
  Wand2,
  Waves,
} from "lucide-react";

const API_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_multilingual_v2";

const LANGUAGE_OPTIONS = [
  {
    code: "auto",
    label: "Auto / Best Match",
    hint: "Let the app rank voices for your script",
    keywords: [],
  },
  {
    code: "en",
    label: "English",
    hint: "US, UK, AU, CA",
    keywords: ["english", "american", "british", "australian", "canadian", "us", "uk", "en"],
  },
  {
    code: "es",
    label: "Spanish",
    hint: "ES, LATAM",
    keywords: ["spanish", "espanol", "castilian", "latam", "mexican", "es"],
  },
  {
    code: "fr",
    label: "French",
    hint: "France, Quebec",
    keywords: ["french", "francais", "français", "fr"],
  },
  {
    code: "de",
    label: "German",
    hint: "DE, AT, CH",
    keywords: ["german", "deutsch", "de"],
  },
  {
    code: "ja",
    label: "Japanese",
    hint: "JP",
    keywords: ["japanese", "nihongo", "jp", "ja"],
  },
  {
    code: "ko",
    label: "Korean",
    hint: "KR",
    keywords: ["korean", "hangul", "kr", "ko"],
  },
  {
    code: "zh",
    label: "Chinese",
    hint: "Mandarin / Chinese",
    keywords: ["chinese", "mandarin", "zh", "cn", "mandarin chinese"],
  },
  {
    code: "vi",
    label: "Vietnamese",
    hint: "Tiếng Việt",
    keywords: ["vietnamese", "vietnam", "viet", "việt", "vi"],
  },
  {
    code: "ar",
    label: "Arabic",
    hint: "Modern Standard / regional",
    keywords: ["arabic", "arab", "ar", "msa"],
  },
  {
    code: "pt",
    label: "Portuguese",
    hint: "BR, PT",
    keywords: ["portuguese", "brazilian portuguese", "brazilian", "pt", "br"],
  },
  {
    code: "it",
    label: "Italian",
    hint: "IT",
    keywords: ["italian", "italiano", "it"],
  },
  {
    code: "nl",
    label: "Dutch",
    hint: "NL",
    keywords: ["dutch", "nederlands", "nl"],
  },
  {
    code: "tr",
    label: "Turkish",
    hint: "TR",
    keywords: ["turkish", "turkce", "türkçe", "tr"],
  },
];

const DEFAULT_SCRIPT = `A: Welcome to OmniShadow AI. Today we will practice a natural story with fast feedback.

B: I am ready. Please speak slowly and clearly at first.

A: Perfect. Listen carefully, then shadow each sentence with confidence.

B: Let's start.`;

function App() {
  const textAreaRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const activeQueueRef = useRef([]);
  const currentTrackIndexRef = useRef(0);

  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("elevenlabs_api_key") || "";
  });

  const [language, setLanguage] = useState("auto");
  const [voices, setVoices] = useState([]);
  const [voiceAId, setVoiceAId] = useState("");
  const [voiceBId, setVoiceBId] = useState("");
  const [dialogueMode, setDialogueMode] = useState(true);
  const [text, setText] = useState(DEFAULT_SCRIPT);

  const [stability, setStability] = useState(55);
  const [clarity, setClarity] = useState(85);
  const [style, setStyle] = useState(20);

  const [voiceTuningOpen, setVoiceTuningOpen] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackItems, setTrackItems] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
  });
  const [loopA, setLoopA] = useState(null);
  const [loopB, setLoopB] = useState(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [status, setStatus] = useState("Connect your ElevenLabs API key to load voices.");
  const [error, setError] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");

  const selectedLanguage = LANGUAGE_OPTIONS.find((item) => item.code === language) || LANGUAGE_OPTIONS[0];
  const selectedVoiceA = voices.find((voice) => voice.voice_id === voiceAId) || null;
  const selectedVoiceB = voices.find((voice) => voice.voice_id === voiceBId) || null;

  const rankedVoices = [...voices]
    .map((voice) => ({
      ...voice,
      matchScore: scoreVoiceForLanguage(voice, selectedLanguage),
    }))
    .sort((left, right) => {
      const scoreDelta = (right.matchScore || 0) - (left.matchScore || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return (left.name || "").localeCompare(right.name || "");
    });

  const visibleVoices = rankedVoices.filter((voice) => {
    const query = voiceSearch.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      voice.name,
      voice.description,
      voice.labels ? Object.values(voice.labels).join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const selectedTrack =
    trackItems[Math.min(currentTrackIndex, Math.max(trackItems.length - 1, 0))] || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (apiKey) {
      localStorage.setItem("elevenlabs_api_key", apiKey);
    } else {
      localStorage.removeItem("elevenlabs_api_key");
    }
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;

    async function fetchVoices() {
      if (!apiKey) {
        setVoices([]);
        setStatus("Add your ElevenLabs API key to fetch voices.");
        return;
      }

      setLoadingVoices(true);
      setError("");
      setStatus("Loading voices from ElevenLabs...");
      try {
        const response = await fetch(`${API_BASE}/voices`, {
          headers: {
            "xi-api-key": apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Voice fetch failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fetchedVoices = Array.isArray(data.voices) ? data.voices : [];

        if (!cancelled) {
          setVoices(fetchedVoices);
          setStatus(
            fetchedVoices.length
              ? "Voices loaded. Pick a language and start building your lesson."
              : "No voices were returned from the API."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setVoices([]);
          setError(err.message || "Unable to fetch voices.");
          setStatus("Voice loading failed.");
        }
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    }

    fetchVoices();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!voices.length || !visibleVoices.length) return;

    setVoiceAId((current) => {
      if (current && visibleVoices.some((voice) => voice.voice_id === current)) return current;
      return visibleVoices[0]?.voice_id || current || "";
    });
  }, [language, voices.length, visibleVoices.length]);

  useEffect(() => {
    if (!voices.length || !visibleVoices.length) return;

    setVoiceBId((current) => {
      const selectedA = visibleVoices.find((voice) => voice.voice_id === voiceAId) || visibleVoices[0];
      const fallbackB =
        visibleVoices.find((voice) => voice.voice_id !== selectedA?.voice_id) || selectedA || null;

      if (current && current !== selectedA?.voice_id && visibleVoices.some((voice) => voice.voice_id === current)) {
        return current;
      }

      return fallbackB?.voice_id || current || "";
    });
  }, [language, voices.length, voiceAId, visibleVoices.length]);

  useEffect(() => {
    return () => {
      stopAudio();
      revokeObjectUrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function revokeObjectUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }

  function stopAudio() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onloadedmetadata = null;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.src = "";
      audioRef.current = null;
    }

    activeQueueRef.current = [];
    setPlaying(false);
    setAudioState({ currentTime: 0, duration: 0 });
  }

  function resetGeneratedState() {
    stopAudio();
    revokeObjectUrls();
    setTrackItems([]);
    setCurrentTrackIndex(0);
    currentTrackIndexRef.current = 0;
    setLoopA(null);
    setLoopB(null);
    setLoopEnabled(false);
  }

  function insertAtCursor(before, after = "", placeholder = "") {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const selected = text.slice(start, end) || placeholder;
    const nextValue = `${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`;

    setText(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const caretStart = start + before.length;
      const caretEnd = caretStart + selected.length;
      textarea.setSelectionRange(caretStart, caretEnd);
    });
  }

  function applyVoiceMatching(voice, selectedLanguageMeta) {
    const haystack = [
      voice?.name,
      voice?.description,
      voice?.labels ? Object.values(voice.labels).join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!selectedLanguageMeta || selectedLanguageMeta.code === "auto") {
      return 1;
    }

    let score = 0;
    const keywords = selectedLanguageMeta.keywords || [];

    keywords.forEach((keyword) => {
      if (!keyword) return;
      if (haystack.includes(keyword.toLowerCase())) score += 6;
    });

    const labels = voice?.labels || {};
    Object.entries(labels).forEach(([key, value]) => {
      const normalized = `${key}:${String(value)}`.toLowerCase();
      keywords.forEach((keyword) => {
        if (normalized.includes(keyword.toLowerCase())) score += 4;
      });
    });

    if (selectedLanguageMeta.code && haystack.includes(selectedLanguageMeta.code)) {
      score += 3;
    }

    if (score === 0) {
      score = 1;
    }

    return score;
  }

  function scoreVoiceForLanguage(voice, selectedLanguageMeta) {
    return applyVoiceMatching(voice, selectedLanguageMeta);
  }

  function getVoiceTags(voice) {
    const labels = voice?.labels || {};
    const preferredKeys = ["language", "accent", "gender", "use_case", "age"];
    const tags = [];

    preferredKeys.forEach((key) => {
      if (labels[key]) {
        tags.push(String(labels[key]));
      }
    });

    return tags.slice(0, 3);
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function createTitleFromText(value) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return "OmniShadow AI";
    return cleaned.length > 44 ? `${cleaned.slice(0, 44)}...` : cleaned;
  }

  function parseDialogueScript(value) {
    const lines = value.split(/\r?\n/);
    const segments = [];
    let currentSpeaker = "A";

    const resolveSpeaker = (raw) => {
      const normalized = String(raw || "")
        .trim()
        .toLowerCase();

      if (["a", "speaker a", "tutor", "teacher", "narrator", "guide"].includes(normalized)) return "A";
      if (["b", "speaker b", "student", "learner", "character", "pupil"].includes(normalized)) return "B";
      if (normalized === "a" || normalized === "b") return normalized.toUpperCase();
      return currentSpeaker;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^([A-Za-z][A-Za-z\s]*?)\s*[:\-]\s*(.+)$/);
      if (match) {
        const speaker = resolveSpeaker(match[1]);
        const content = match[2].trim();
        currentSpeaker = speaker;
        segments.push({
          speaker,
          text: content,
        });
        return;
      }

      if (!segments.length) {
        segments.push({
          speaker: currentSpeaker,
          text: trimmed,
        });
      } else {
        segments[segments.length - 1].text = `${segments[segments.length - 1].text} ${trimmed}`.trim();
      }
    });

    return segments.filter((segment) => segment.text.trim().length > 0);
  }

  function buildVoiceSettings() {
    return {
      stability: Number((stability / 100).toFixed(2)),
      similarity_boost: Number((clarity / 100).toFixed(2)),
      style: Number((style / 100).toFixed(2)),
      use_speaker_boost: true,
    };
  }

  async function generateSpeechBlob({ text: segmentText, voiceId }) {
    const response = await fetch(
      `${API_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: segmentText,
          model_id: DEFAULT_MODEL,
          voice_settings: buildVoiceSettings(),
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(details || `Speech generation failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportAudio() {
    if (!trackItems.length) {
      setError("Generate audio first before exporting.");
      return;
    }

    setError("");

    const fileName = `${createTitleFromText(text)}.mp3`;

    // Best effort:
    // - If there is a single generated track, export that exact MP3 blob.
    // - For dialogue playlists, try an optional backend merge endpoint first.
    // - Fall back to the current generated segment if no merger exists.
    if (trackItems.length === 1) {
      downloadBlob(trackItems[0].blob, fileName);
      setStatus("Downloaded MP3.");
      return;
    }

    try {
      setStatus("Merging dialogue clips for export...");
      const response = await fetch("/api/merge-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracks: trackItems.map((item) => ({
            speaker: item.speaker,
            text: item.text,
            voiceId: item.voiceId,
            voiceName: item.voiceName,
          })),
        }),
      });

      if (response.ok) {
        const mergedBlob = await response.blob();
        downloadBlob(mergedBlob, fileName);
        setStatus("Merged MP3 downloaded.");
        return;
      }
    } catch (mergeError) {
      // Silent fallback to local segment export.
    }

    const fallbackItem = trackItems[currentTrackIndex] || trackItems[0];
    if (fallbackItem?.blob) {
      downloadBlob(fallbackItem.blob, fileName);
      setStatus("Downloaded the current generated segment.");
      return;
    }

    setError("Unable to export audio.");
  }

  function playItemAtIndex(items, startIndex = 0, seekTime = 0) {
    const index = Math.max(0, Math.min(startIndex, items.length - 1));
    const item = items[index];
    if (!item) return;

    stopAudio();

    const audio = new Audio(item.url);
    audioRef.current = audio;
    currentTrackIndexRef.current = index;
    setCurrentTrackIndex(index);
    setPlaying(true);
    setError("");
    setStatus(`Playing ${item.speaker} using ${item.voiceName || "selected voice"}...`);

    audio.onloadedmetadata = () => {
      const duration = audio.duration || 0;
      const nextSeek = Math.max(0, Math.min(seekTime, duration || seekTime));
      if (nextSeek > 0) {
        audio.currentTime = nextSeek;
      }
      setAudioState({
        currentTime: audio.currentTime || 0,
        duration,
      });
    };

    audio.ontimeupdate = () => {
      const duration = audio.duration || 0;
      const currentTime = audio.currentTime || 0;

      setAudioState({
        currentTime,
        duration,
      });

      const hasLoop = loopEnabled && loopA !== null && loopB !== null;
      if (hasLoop) {
        const start = Math.min(loopA, loopB);
        const end = Math.max(loopA, loopB);

        if (currentTime >= end && end > start) {
          audio.currentTime = start;
        }
      }
    };

    audio.onended = () => {
      const hasLoop = loopEnabled && loopA !== null && loopB !== null;

      if (hasLoop) {
        const start = Math.min(loopA, loopB);
        playItemAtIndex(items, index, start);
        return;
      }

      const nextIndex = index + 1;
      if (nextIndex < items.length) {
        playItemAtIndex(items, nextIndex, 0);
        return;
      }

      setPlaying(false);
      setStatus("Playback complete.");
    };

    audio
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch((err) => {
        setPlaying(false);
        setError(err.message || "Unable to start playback.");
      });
  }

  async function generateAndPlay() {
    if (!apiKey) {
      setError("Add your ElevenLabs API key first.");
      return;
    }

    if (!text.trim()) {
      setError("Add a lesson script before generating audio.");
      return;
    }

    if (!selectedVoiceA) {
      setError("Select a Voice A before generating.");
      return;
    }

    if (dialogueMode && !selectedVoiceB) {
      setError("Select a Voice B for dialogue mode.");
      return;
    }

    const segments = dialogueMode ? parseDialogueScript(text) : [{ speaker: "A", text: text.trim() }];

    if (!segments.length) {
      setError("No usable text segments were detected.");
      return;
    }

    resetGeneratedState();
    setGenerating(true);
    setError("");
    setStatus("Building your audio playlist...");

    const generatedItems = [];

    try {
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const voiceId =
          segment.speaker === "B" ? selectedVoiceB?.voice_id || selectedVoiceA?.voice_id : selectedVoiceA?.voice_id;

        const voiceName =
          segment.speaker === "B"
            ? selectedVoiceB?.name || selectedVoiceA?.name || "Voice B"
            : selectedVoiceA?.name || "Voice A";

        setStatus(`Generating segment ${index + 1} of ${segments.length}...`);
        const blob = await generateSpeechBlob({
          text: segment.text,
          voiceId,
        });

        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);

        generatedItems.push({
          speaker: segment.speaker,
          text: segment.text,
          voiceId,
          voiceName,
          url,
          blob,
          title: `${segment.speaker}: ${segment.text.slice(0, 60)}${segment.text.length > 60 ? "..." : ""}`,
        });
      }

      setTrackItems(generatedItems);

      const activeBlob = generatedItems[0]?.blob || null;
      activeQueueRef.current = generatedItems;
      if (activeBlob) {
        setStatus("Audio generated. Starting playback...");
        playItemAtIndex(generatedItems, 0, 0);
        if (generatedItems[0]) {
          setStatus(`Now playing: ${generatedItems[0].speaker} / ${generatedItems[0].voiceName}`);
        }
      } else {
        setStatus("Audio generated.");
      }
    } catch (generateError) {
      setError(generateError.message || "Audio generation failed.");
      setStatus("Generation failed.");
      resetGeneratedState();
    } finally {
      setGenerating(false);
    }
  }

  function handlePlayPause() {
    if (!trackItems.length) {
      generateAndPlay();
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      playItemAtIndex(trackItems, currentTrackIndex, 0);
      return;
    }

    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
      return;
    }

    audio.pause();
    setPlaying(false);
    setStatus("Playback paused.");
  }

  function handleStop() {
    stopAudio();
    setStatus("Playback stopped.");
  }

  function handleSetLoopPoint(which) {
    if (!audioRef.current) {
      setError("Start playback before setting loop points.");
      return;
    }

    const currentTime = audioRef.current.currentTime || 0;

    if (which === "A") {
      setLoopA(currentTime);
      setStatus(`Loop A set at ${formatDuration(currentTime)}.`);
    } else {
      setLoopB(currentTime);
      setStatus(`Loop B set at ${formatDuration(currentTime)}.`);
    }
  }

  function handleJumpToLoopPoint(which) {
    const audio = audioRef.current;
    if (!audio) return;

    const target = which === "A" ? loopA : loopB;
    if (target === null || target === undefined) return;

    audio.currentTime = target;
    setAudioState((prev) => ({
      ...prev,
      currentTime: target,
    }));
  }

  function clearLoopPoints() {
    setLoopA(null);
    setLoopB(null);
    setLoopEnabled(false);
    setStatus("Loop points cleared.");
  }

  function insertPause() {
    insertAtCursor('<break time="1.0s" />');
  }

  function insertEmphasis() {
    insertAtCursor("<emphasis>", "</emphasis>", "important phrase");
  }

  function autoPickVoices() {
    if (!visibleVoices.length) return;

    const first = visibleVoices[0];
    const second = visibleVoices.find((voice) => voice.voice_id !== first.voice_id) || first;

    setVoiceAId(first.voice_id);
    setVoiceBId(second.voice_id);
    setStatus("Voices auto-selected based on language matching.");
  }

  function playTrackFromList(index) {
    if (!trackItems[index]) return;
    playItemAtIndex(trackItems, index, 0);
  }

  const waveformBars = Array.from({ length: 30 });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`
        @keyframes omni-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes omni-glow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }

        @keyframes omni-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-32 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              OmniShadow AI
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Global TPRS + Voice Shadowing Studio
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Multi-language voice matching, dual-speaker dialogue, SSML-friendly TPRS tools, advanced
              ElevenLabs tuning, and a premium shadowing player built for standout EdTech demos.
            </p>
          </div>

          <div className="grid gap-3 md:min-w-[360px]">
            <label className="grid gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <KeyRound className="h-3.5 w-3.5" />
                ElevenLabs API Key
              </span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value.trim())}
                placeholder="xi-api-key"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="h-4 w-4" />
              API key is stored locally in your browser for convenience.
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Global Language Support</h2>
                  <p className="text-sm text-slate-400">
                    Select a language and the voice list re-ranks to surface the best matching voices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={autoPickVoices}
                  disabled={!visibleVoices.length}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wand2 className="h-4 w-4" />
                  Auto-pick voices
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Globe className="mr-2 inline h-3.5 w-3.5" />
                    Language
                  </span>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-400">{selectedLanguage.hint}</span>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Languages className="mr-2 inline h-3.5 w-3.5" />
                    Voice Search
                  </span>
                  <input
                    value={voiceSearch}
                    onChange={(event) => setVoiceSearch(event.target.value)}
                    placeholder="Search voice names, accents, labels..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <span className="text-xs text-slate-400">
                    {visibleVoices.length} matching voice{visibleVoices.length === 1 ? "" : "s"}.
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Multi-Speaker Dialogue Mode</h2>
                  <p className="text-sm text-slate-400">
                    Assign Voice A for the tutor/narrator and Voice B for the student/character. The app
                    parses A:/B: dialogue automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogueMode((current) => !current)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    dialogueMode
                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                      : "border border-white/10 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <Split className="h-4 w-4" />
                  {dialogueMode ? "Dialogue On" : "Dialogue Off"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Mic2 className="mr-2 inline h-3.5 w-3.5" />
                    Voice A - Tutor / Narrator
                  </span>
                  <div className="relative">
                    <select
                      value={voiceAId}
                      onChange={(event) => setVoiceAId(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    >
                      {visibleVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {formatVoiceOptionLabel(voice)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <Volume2 className="mr-2 inline h-3.5 w-3.5" />
                    Voice B - Student / Character
                  </span>
                  <div className="relative">
                    <select
                      value={voiceBId}
                      onChange={(event) => setVoiceBId(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    >
                      {visibleVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {formatVoiceOptionLabel(voice)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <VoiceSummaryCard label="Selected Voice A" voice={selectedVoiceA} />
                <VoiceSummaryCard label="Selected Voice B" voice={selectedVoiceB} />
              </div>

              {dialogueMode && (
                <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-cyan-50/90">
                  Tip: format your lesson with lines like <span className="font-semibold">A: Hello</span> and
                  <span className="font-semibold">B: Hi there</span>. The app will generate a sequential dialogue
                  playlist automatically.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Smart TPRS Formatting Tools</h2>
                  <p className="text-sm text-slate-400">
                    Quick-insert tools for pauses and emphasis.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3">
                <ToolbarButton icon={Waves} onClick={insertPause} label="Add Pause (1s)" />
                <ToolbarButton icon={Sparkles} onClick={insertEmphasis} label="Emphasize" />
                <ToolbarButton icon={Trash2} onClick={() => setText("")} label="Clear Script" />
                <ToolbarButton
                  icon={RefreshCw}
                  onClick={() => setText(DEFAULT_SCRIPT)}
                  label="Load Sample"
                />
              </div>

              <textarea
                ref={textAreaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                placeholder="Write your TPRS story or shadowing script here..."
                className="min-h-[420px] w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Pro Shadowing Player</h2>
                  <p className="text-sm text-slate-400">
                    Playback, looping, export, and performance visualizer.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    disabled={generating || loadingVoices || !apiKey}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {playing ? "Pause" : trackItems.length ? "Play" : "Generate"}
                  </button>

                  <button
                    type="button"
                    onClick={handleStop}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Waveform</span>
                  <span>{playing ? "Live" : "Idle"}</span>
                </div>
                <div className="flex h-24 items-end gap-1 overflow-hidden">
                  {waveformBars.map((_, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-full bg-gradient-to-t from-cyan-500 via-teal-300 to-emerald-200"
                      style={{
                        height: `${28 + ((index * 11) % 54)}%`,
                        transformOrigin: "bottom",
                        animation: playing
                          ? `omni-wave ${0.85 + (index % 5) * 0.12}s ease-in-out ${(index % 7) * 60}ms infinite`
                          : "none",
                        opacity: playing ? 1 : 0.28,
                        filter: "drop-shadow(0 0 10px rgba(45, 212, 191, 0.2))",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleSetLoopPoint("A")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  <Repeat2 className="h-4 w-4" />
                  Set A
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLoopPoint("B")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  <Repeat2 className="h-4 w-4" />
                  Set B
                </button>
                <button
                  type="button"
                  onClick={clearLoopPoints}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white transition hover:border-rose-400/30 hover:bg-rose-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Loop
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleJumpToLoopPoint("A")}
                  disabled={loopA === null}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Jump to A {loopA !== null ? `(${formatDuration(loopA)})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleJumpToLoopPoint("B")}
                  disabled={loopB === null}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Jump to B {loopB !== null ? `(${formatDuration(loopB)})` : ""}
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {selectedTrack?.speaker ? `Current: ${selectedTrack.speaker} / ${selectedTrack.voiceName}` : "No track yet"}
                  </span>
                  <span>
                    {formatDuration(audioState.currentTime)} / {formatDuration(audioState.duration)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 transition-all"
                    style={{
                      width:
                        audioState.duration > 0
                          ? `${Math.min(100, (audioState.currentTime / audioState.duration) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={loopEnabled}
                    onChange={(event) => setLoopEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                  />
                  A/B Loop enabled
                </label>

                <button
                  type="button"
                  onClick={exportAudio}
                  disabled={!trackItems.length}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download MP3
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Voice Tuning</h2>
                  <p className="text-sm text-slate-400">
                    Pass advanced tuning into the ElevenLabs payload.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setVoiceTuningOpen((current) => !current)}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>

              {voiceTuningOpen && (
                <div className="space-y-5">
                  <Slider
                    label="Stability"
                    value={stability}
                    onChange={setStability}
                    helper="Keeps delivery steady and less expressive."
                  />
                  <Slider
                    label="Clarity / Similarity Boost"
                    value={clarity}
                    onChange={setClarity}
                    helper="Improves voice likeness and articulation."
                  />
                  <Slider
                    label="Style Exaggeration"
                    value={style}
                    onChange={setStyle}
                    helper="Adds more personality, emotion, and drama."
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Generated Playlist</h2>
                  <p className="text-sm text-slate-400">
                    Click any segment to replay it instantly.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-400">
                  {trackItems.length} segment{trackItems.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="space-y-3">
                {!trackItems.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                    Generate audio to see the dialogue playlist here.
                  </div>
                )}

                {trackItems.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => playTrackFromList(index)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      index === currentTrackIndex && playing
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-slate-950/60 hover:border-cyan-400/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                            {item.speaker}
                          </span>
                          <span className="text-sm font-medium text-white">{item.voiceName}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                          {item.text}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-slate-400">
                        {index === currentTrackIndex && playing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Status</h2>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
                  <Info className="h-3.5 w-3.5" />
                  Live
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  {status}
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-xs leading-6 text-cyan-50/90">
                  <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    <BookOpenText className="h-3.5 w-3.5" />
                    Notes
                  </div>
                  <div className="mt-2 space-y-1">
                    <p>1. Best results come from clean A:/B: dialogue formatting.</p>
                    <p>2. The export button downloads the raw ElevenLabs MP3 for single clips and uses a merge endpoint when available for playlists.</p>
                    <p>3. If you already have a backend, wire it to /api/merge-audio for true stitched dialogue MP3s.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-400 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>
              OmniShadow AI turns TPRS reading, storytelling, and voice shadowing into a premium multilingual learning flow.
            </span>
            <span className="flex items-center gap-2 text-cyan-200">
              <Check className="h-4 w-4" />
              ElevenLabs-powered
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center pb-4 text-xs text-slate-500">
          Designed for hackathon-grade presentation and classroom-grade repeatability.
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={generateAndPlay}
            disabled={generating || loadingVoices || !apiKey}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate and Play Lesson
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Slider({ label, value, onChange, helper }) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-300">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
      />
      <p className="text-xs leading-5 text-slate-400">{helper}</p>
    </label>
  );
}

function VoiceSummaryCard({ label, voice }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      {voice ? (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-white">{voice.name}</div>
          <div className="flex flex-wrap gap-2">
            {(voice.labels ? Object.values(voice.labels) : [])
              .filter(Boolean)
              .slice(0, 3)
              .map((value) => (
                <span
                  key={String(value)}
                  className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-200"
                >
                  {String(value)}
                </span>
              ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-500">No voice selected.</div>
      )}
    </div>
  );
}

function formatVoiceOptionLabel(voice) {
  const tags = (voice?.labels ? Object.values(voice.labels) : [])
    .filter(Boolean)
    .slice(0, 2);

  if (!tags.length) return voice?.name || "Unnamed voice";
  return `${voice?.name || "Unnamed voice"} — ${tags.join(" / ")}`;
}

export default App;