import React, { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Check,
  Download,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Repeat2,
  Sparkles,
  Square,
  Split,
  Trash2,
  Waves,
} from "./icons";

const FPT_TTS_ENDPOINT = "https://api.fpt.ai/hmi/tts/v5";
const FPT_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FPT_API_KEY) || "";

const VOICE_OPTIONS = [
  {
    id: "banmai",
    label: "banmai",
    description: "Female Northern Vietnamese",
  },
  {
    id: "leminh",
    label: "leminh",
    description: "Male Northern Vietnamese",
  },
];

const DEFAULT_SCRIPT = `A: Xin chao, hom nay chung ta se luyen nghe noi tieng Viet.
B: Tuyet voi, minh san sang roi.
A: Hay shadow tung cau ngan va ro rang.
B: Bat dau thoi!`;

function App() {
  const textAreaRef = useRef(null);
  const audioRef = useRef(null);

  const [dialogueMode, setDialogueMode] = useState(true);
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [voiceAId, setVoiceAId] = useState("banmai");
  const [voiceBId, setVoiceBId] = useState("leminh");

  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackItems, setTrackItems] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [audioState, setAudioState] = useState({ currentTime: 0, duration: 0 });
  const [loopA, setLoopA] = useState(null);
  const [loopB, setLoopB] = useState(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [status, setStatus] = useState("Ready to generate speech with FPT.AI voices.");
  const [error, setError] = useState("");

  const selectedVoiceA = VOICE_OPTIONS.find((voice) => voice.id === voiceAId) || VOICE_OPTIONS[0];
  const selectedVoiceB = VOICE_OPTIONS.find((voice) => voice.id === voiceBId) || VOICE_OPTIONS[1];
  const selectedTrack =
    trackItems[Math.min(currentTrackIndex, Math.max(trackItems.length - 1, 0))] || null;

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function createTitleFromText(value) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return "fpt-vietnamese-lesson";
    const safe = cleaned
      .slice(0, 44)
      .replace(/[^a-zA-Z0-9\s\-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    return safe || "fpt-vietnamese-lesson";
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

  function parseDialogueScript(value) {
    const lines = value.split(/\r?\n/);
    const segments = [];
    let currentSpeaker = "A";

    const resolveSpeaker = (raw) => {
      const normalized = String(raw || "").trim().toLowerCase();
      if (["a", "speaker a", "tutor", "teacher", "narrator", "guide"].includes(normalized)) {
        return "A";
      }
      if (["b", "speaker b", "student", "learner", "character", "pupil"].includes(normalized)) {
        return "B";
      }
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
        segments.push({ speaker, text: content });
        return;
      }

      if (!segments.length) {
        segments.push({ speaker: currentSpeaker, text: trimmed });
      } else {
        segments[segments.length - 1].text = `${segments[segments.length - 1].text} ${trimmed}`.trim();
      }
    });

    return segments.filter((segment) => segment.text.trim().length > 0);
  }

  async function requestFptAudioUrl(segmentText, voiceId) {
    const response = await fetch(FPT_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": FPT_API_KEY,
        voice: voiceId,
        speed: "",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: segmentText,
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(rawText || `FPT request failed: ${response.status} ${response.statusText}`);
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (parseError) {
      throw new Error("FPT API returned a non-JSON response.");
    }

    const audioUrl = payload?.data;
    if (!audioUrl || typeof audioUrl !== "string") {
      throw new Error(payload?.message || "FPT API did not return an audio URL in `data`.");
    }

    return audioUrl;
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

    setPlaying(false);
    setAudioState({ currentTime: 0, duration: 0 });
  }

  function resetGeneratedState() {
    stopAudio();
    setTrackItems([]);
    setCurrentTrackIndex(0);
    setLoopA(null);
    setLoopB(null);
    setLoopEnabled(false);
  }

  function playItemAtIndex(items, startIndex = 0, seekTime = 0) {
    const index = Math.max(0, Math.min(startIndex, items.length - 1));
    const item = items[index];
    if (!item) return;

    stopAudio();

    const audio = new Audio(item.url);
    audioRef.current = audio;
    setCurrentTrackIndex(index);
    setPlaying(true);
    setError("");
    setStatus(`Playing ${item.speaker} using ${item.voiceName}...`);

    audio.onloadedmetadata = () => {
      const duration = audio.duration || 0;
      const nextSeek = Math.max(0, Math.min(seekTime, duration || seekTime));
      if (nextSeek > 0) audio.currentTime = nextSeek;

      setAudioState({
        currentTime: audio.currentTime || 0,
        duration,
      });
    };

    audio.ontimeupdate = () => {
      const duration = audio.duration || 0;
      const currentTime = audio.currentTime || 0;

      setAudioState({ currentTime, duration });

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
      .then(() => setPlaying(true))
      .catch((playError) => {
        setPlaying(false);
        setError(playError.message || "Unable to start playback.");
      });
  }

  async function generateAndPlay() {
    if (!FPT_API_KEY) {
      setError("Missing VITE_FPT_API_KEY. Add it to your .env file.");
      return;
    }

    if (!text.trim()) {
      setError("Add a lesson script before generating audio.");
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
    setStatus("Sending script to FPT.AI...");

    const generatedItems = [];

    try {
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const voice = segment.speaker === "B" ? selectedVoiceB : selectedVoiceA;
        const voiceName = `${voice.label} (${voice.description})`;

        setStatus(`Generating segment ${index + 1} of ${segments.length} via FPT.AI...`);
        const url = await requestFptAudioUrl(segment.text, voice.id);

        generatedItems.push({
          speaker: segment.speaker,
          text: segment.text,
          voiceId: voice.id,
          voiceName,
          url,
        });
      }

      setTrackItems(generatedItems);

      if (generatedItems[0]) {
        setStatus("Audio generated from FPT.AI. Starting playback...");
        playItemAtIndex(generatedItems, 0, 0);
      } else {
        setStatus("FPT.AI generation complete.");
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
    setAudioState((prev) => ({ ...prev, currentTime: target }));
  }

  function clearLoopPoints() {
    setLoopA(null);
    setLoopB(null);
    setLoopEnabled(false);
    setStatus("Loop points cleared.");
  }

  function playTrackFromList(index) {
    if (!trackItems[index]) return;
    playItemAtIndex(trackItems, index, 0);
  }

  function insertPause() {
    insertAtCursor(" ... ");
  }

  function insertEmphasis() {
    insertAtCursor("[", "]", "cum tu quan trong");
  }

  function exportCurrentAudio() {
    if (!trackItems.length) {
      setError("Generate audio first before exporting.");
      return;
    }

    const item = trackItems[currentTrackIndex] || trackItems[0];
    const anchor = document.createElement("a");
    anchor.href = item.url;
    anchor.download = `${createTitleFromText(item.text)}.mp3`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setStatus("Download started.");
  }

  const waveformBars = Array.from({ length: 30 });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`
        @keyframes omni-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              FPT Vietnamese TTS Studio
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Standalone Voice Shadowing App
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Native Vietnamese speech generation powered by FPT.AI V5 with built-in playback,
              dialogue sequencing, and classroom-ready shadowing controls.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm text-cyan-50/90 md:max-w-[340px]">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <Info className="h-3.5 w-3.5" />
              API Setup
            </div>
            <p className="mt-2 leading-6">
              Requests are sent to FPT.AI endpoint <span className="font-semibold">/hmi/tts/v5</span> using
              the required <span className="font-semibold">api-key</span> and selected voice header.
            </p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Dual-Speaker Vietnamese Voices</h2>
                  <p className="text-sm text-slate-400">
                    Choose voice roles for A/B dialogue lines.
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
                    Voice A - banmai or leminh
                  </span>
                  <select
                    value={voiceAId}
                    onChange={(event) => setVoiceAId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.label} - {voice.description}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Voice B - banmai or leminh
                  </span>
                  <select
                    value={voiceBId}
                    onChange={(event) => setVoiceBId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.label} - {voice.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Script Editor</h2>
                  <p className="text-sm text-slate-400">
                    Use A:/B: format for dialogue mode.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3">
                <ToolbarButton icon={Waves} onClick={insertPause} label="Insert Pause" />
                <ToolbarButton icon={Sparkles} onClick={insertEmphasis} label="Highlight Phrase" />
                <ToolbarButton icon={Trash2} onClick={() => setText("")} label="Clear Script" />
                <ToolbarButton icon={RefreshCw} onClick={() => setText(DEFAULT_SCRIPT)} label="Load Sample" />
              </div>

              <textarea
                ref={textAreaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                placeholder="Nhap noi dung bai hoc tieng Viet tai day..."
                className="min-h-[420px] w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Shadowing Player</h2>
                  <p className="text-sm text-slate-400">
                    Generate and play directly from FPT.AI asynchronous audio URLs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    disabled={generating}
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
                    {selectedTrack?.speaker
                      ? `Current: ${selectedTrack.speaker} / ${selectedTrack.voiceName}`
                      : "No track yet"}
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
                  onClick={exportCurrentAudio}
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
                  <h2 className="text-lg font-semibold text-white">Generated Playlist</h2>
                  <p className="text-sm text-slate-400">Click any segment to replay it instantly.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-400">
                  {trackItems.length} segment{trackItems.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="space-y-3">
                {!trackItems.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                    Generate audio to see the playlist.
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
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.text}</p>
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
                    <p>1. This app uses FPT.AI TTS v5 only.</p>
                    <p>2. The response field `data` is used as the generated MP3 URL.</p>
                    <p>3. For best results, keep each line concise and clear.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-400 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>
              Built for Vietnamese language learning demos with FPT.AI native voices.
            </span>
            <span className="flex items-center gap-2 text-cyan-200">
              <Check className="h-4 w-4" />
              Powered by FPT.AI
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center pb-4 text-xs text-slate-500">
          Ready for direct company presentation and classroom-grade repeatability.
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={generateAndPlay}
            disabled={generating}
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

export default App;
