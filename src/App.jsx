import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AudioLines, AudioWaveform, ChevronDown, CircleDot, Disc3,
  Download, FileAudio, FolderOpen, Heart, Mic, MicOff, Music2, Pause,
  Play, Plus, Radio, Repeat, Rewind, Search, Shuffle, SkipBack, SkipForward,
  SlidersHorizontal, Sparkles, Square, Trash2, Upload, Volume2, VolumeX, Waves,
  X, Zap
} from "lucide-react";

const DB_NAME = "zilla-play-studio";
const STORE = "audioAssets";
const CATEGORIES = [
  { id: "vocals", label: "Vocals", color: "violet" },
  { id: "beats", label: "Beats", color: "cyan" },
  { id: "rhythm", label: "Rhythm", color: "blue" },
  { id: "bass", label: "Bass", color: "pink" },
  { id: "melody", label: "Melody", color: "amber" },
  { id: "other", label: "Other", color: "slate" }
];
const NOTE_FREQS = [130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63,
  293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];
const makePattern = (on = []) => Array.from({ length: 16 }, (_, i) => on.includes(i));
const DEFAULT_PATTERNS = {
  kick: makePattern([0, 4, 8, 12]),
  snare: makePattern([4, 12]),
  hat: makePattern([0, 2, 4, 6, 8, 10, 12, 14]),
  clap: makePattern([4, 12]),
  bass: makePattern([0, 3, 8, 11]),
  lead: makePattern([0, 4, 8, 12])
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getAssets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function saveAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(asset);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}
async function deleteAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}
const safeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const cleanTitle = (name) => name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
const timeLabel = (seconds = 0) => {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
const categoryInfo = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

function makeNoiseBuffer(ctx, duration = 0.18) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
function triggerDrum(ctx, kind, time, volume = 0.75, output = ctx.destination) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.001, volume), time);
  gain.connect(output);
  if (kind === "kick") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.24);
  } else {
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, kind === "hat" ? 0.055 : 0.19);
    const filter = ctx.createBiquadFilter();
    filter.type = kind === "hat" ? "highpass" : "lowpass";
    filter.frequency.value = kind === "hat" ? 8000 : 1800;
    noise.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(volume * (kind === "hat" ? 0.24 : 0.56), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (kind === "hat" ? 0.06 : 0.2));
    noise.start(time);
    noise.stop(time + (kind === "hat" ? 0.06 : 0.2));
    if (kind === "snare") {
      const tone = ctx.createOscillator();
      const toneGain = ctx.createGain();
      tone.type = "triangle";
      tone.frequency.value = 185;
      toneGain.gain.setValueAtTime(volume * 0.22, time);
      toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      tone.connect(toneGain);
      toneGain.connect(output);
      tone.start(time);
      tone.stop(time + 0.13);
    }
  }
}
function triggerSynth(ctx, frequency, time, waveform = "sawtooth", volume = 0.24, length = 0.19, output = ctx.destination) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = waveform;
  osc.frequency.setValueAtTime(frequency, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(waveform === "sawtooth" ? 2400 : 4200, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + length);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + length + 0.02);
}
function scheduleStep(ctx, time, step, patterns, waveform, beatVolume, synthVolume, output = ctx.destination) {
  if (patterns.kick[step]) triggerDrum(ctx, "kick", time, beatVolume, output);
  if (patterns.snare[step]) triggerDrum(ctx, "snare", time, beatVolume, output);
  if (patterns.hat[step]) triggerDrum(ctx, "hat", time, beatVolume, output);
  if (patterns.clap[step]) triggerDrum(ctx, "snare", time, beatVolume * 0.42, output);
  if (patterns.bass[step]) {
    const notes = [65.41, 65.41, 73.42, 82.41, 87.31, 82.41, 73.42, 65.41,
      65.41, 73.42, 82.41, 98, 87.31, 82.41, 73.42, 65.41];
    triggerSynth(ctx, notes[step], time, "triangle", synthVolume * 0.85, 0.28, output);
  }
  if (patterns.lead[step]) triggerSynth(ctx, NOTE_FREQS[(step * 2 + 5) % NOTE_FREQS.length], time, waveform, synthVolume, 0.22, output);
}
function audioBufferToWav(buffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const dataSize = frames * channels * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const write = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
    const sample = Math.max(-1, Math.min(1, channelData[c][i]));
    view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
    offset += 2;
  }
  return new Blob([out], { type: "audio/wav" });
}

function StepRow({ label, pattern, onToggle, color = "violet" }) {
  return <div className="step-row">
    <div className="step-label"><span className={`lane-dot ${color}`}/>{label}</div>
    <div className="steps">{pattern.map((on, i) =>
      <button key={i} aria-label={`${label} step ${i + 1}`} className={`step ${on ? `on ${color}` : ""} ${i % 4 === 0 ? "bar-start" : ""}`}
        onClick={() => onToggle(i)} title={`Step ${i + 1}`}/>)}</div>
  </div>;
}


function LiveSpectrum({ analyser, active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      const count = 48;
      const data = new Uint8Array(analyser ? analyser.frequencyBinCount : count);
      if (analyser && active) analyser.getByteFrequencyData(data);
      const gap = 3;
      const barW = (width - (count - 1) * gap) / count;
      for (let i = 0; i < count; i++) {
        const level = analyser && active ? data[Math.floor(i * data.length / count)] / 255 : 0.035;
        const h = Math.max(3, level * height * 0.92);
        const g = ctx.createLinearGradient(0, height - h, 0, height);
        g.addColorStop(0, "#a99aff");
        g.addColorStop(1, "#39d8cb");
        ctx.fillStyle = g;
        ctx.globalAlpha = active ? 0.95 : 0.25;
        ctx.beginPath();
        ctx.roundRect(i * (barW + gap), height - h, barW, h, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser, active]);
  return <canvas ref={canvasRef} className="live-spectrum" width="600" height="52" />;
}

function WaveformPreview({ blob, color = "violet" }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let decodingContext;
    const draw = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx || !blob) return;
        decodingContext = new AudioCtx();
        const buffer = await decodingContext.decodeAudioData(await blob.arrayBuffer());
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const width = 520;
        const height = 48;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        const samples = buffer.getChannelData(0);
        const bars = 120;
        const step = Math.max(1, Math.floor(samples.length / bars));
        const gap = 2;
        const barWidth = (width - gap * (bars - 1)) / bars;
        const colors = {
          violet: ["#aa9bff", "#6f5ee5"], cyan: ["#66e9dc", "#239c9b"],
          blue: ["#83b7ff", "#477ed3"], pink: ["#ff9bc8", "#bf5488"],
          amber: ["#f4d18a", "#c08a34"], slate: ["#aab4c8", "#69758f"]
        };
        const palette = colors[color] || colors.violet;
        for (let i = 0; i < bars; i++) {
          let peak = 0;
          const start = i * step;
          const end = Math.min(samples.length, start + step);
          for (let j = start; j < end; j++) peak = Math.max(peak, Math.abs(samples[j]));
          const barHeight = Math.max(2, peak * (height - 5));
          const y = (height - barHeight) / 2;
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, palette[0]);
          gradient.addColorStop(1, palette[1]);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = 0.88;
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + gap), y, barWidth, barHeight, 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } catch {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } finally {
        if (decodingContext && decodingContext.state !== "closed") decodingContext.close();
      }
    };
    draw();
    return () => { cancelled = true; };
  }, [blob, color]);
  return <canvas className={`true-waveform ${color}`} ref={canvasRef} aria-label="Audio waveform preview"/>;
}

export default function App() {
  const [assets, setAssets] = useState([]);
  const [category, setCategory] = useState("vocals");
  const [patterns, setPatterns] = useState(DEFAULT_PATTERNS);
  const [bpm, setBpm] = useState(112);
  const [waveform, setWaveform] = useState("sawtooth");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(60);
  const [masterVolume, setMasterVolume] = useState(0.82);
  const [beatVolume, setBeatVolume] = useState(0.78);
  const [synthVolume, setSynthVolume] = useState(0.38);
  const [trackSettings, setTrackSettings] = useState({});
  const [tab, setTab] = useState("beats");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("All sound stays on this device.");
  const [busy, setBusy] = useState(false);
  const [liveAnalyser, setLiveAnalyser] = useState(null);
  const [liked, setLiked] = useState([]);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourcesRef = useRef([]);
  const schedulerRef = useRef(null);
  const uiTimerRef = useRef(null);
  const masterGainRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const patternsRef = useRef(patterns);
  const assetsRef = useRef(assets);
  const settingsRef = useRef(trackSettings);

  useEffect(() => { patternsRef.current = patterns; }, [patterns]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { settingsRef.current = trackSettings; }, [trackSettings]);

  useEffect(() => {
    getAssets().then(items => {
      setAssets(items);
      setNotice(items.length ? `${items.length} audio layer${items.length === 1 ? "" : "s"} loaded from this device.` : "All sound stays on this device.");
    }).catch(() => setNotice("Local audio storage is unavailable in this browser."));
    return () => {
      clearInterval(schedulerRef.current);
      clearInterval(uiTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
    };
  }, []);

  const filteredAssets = useMemo(() => assets.filter(a =>
    `${a.title} ${a.category} ${a.fileName}`.toLowerCase().includes(query.toLowerCase())
  ), [assets, query]);

  const patchAssetSettings = (id, patch) => setTrackSettings(old => ({
    ...old, [id]: { volume: 1, muted: false, solo: false, ...(old[id] || {}), ...patch }
  }));
  const togglePattern = (key, index) => setPatterns(old => ({
    ...old, [key]: old[key].map((value, i) => i === index ? !value : value)
  }));

  const stopPlayback = useCallback(() => {
    clearInterval(schedulerRef.current);
    clearInterval(uiTimerRef.current);
    schedulerRef.current = null;
    uiTimerRef.current = null;
    sourcesRef.current.forEach(node => { try { node.stop(); } catch {} });
    sourcesRef.current = [];
    setPlaying(false);
  }, []);

  const ensureContext = useCallback(async () => {
    let ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error("Web Audio is not supported in this environment.");
      ctx = new AudioCtx();
      const master = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      master.gain.value = masterVolume;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      masterGainRef.current = master;
      setLiveAnalyser(analyser);
    }
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }, [masterVolume]);

  const startPlayback = useCallback(async (offset = 0) => {
    stopPlayback();
    try {
      const ctx = await ensureContext();
      const now = ctx.currentTime + 0.09;
      const all = assetsRef.current;
      const anySolo = Object.values(settingsRef.current).some(s => s?.solo);
      const playable = all.filter(a => {
        const s = settingsRef.current[a.id] || {};
        return !s.muted && (!anySolo || s.solo);
      });
      const decoded = await Promise.all(playable.map(async asset => {
        try {
          const array = await asset.blob.arrayBuffer();
          return { asset, buffer: await ctx.decodeAudioData(array) };
        } catch { return null; }
      }));
      let longest = 16 * 60 / bpm;
      decoded.filter(Boolean).forEach(({ buffer }) => { longest = Math.max(longest, buffer.duration); });
      setDuration(Math.max(10, longest));
      for (const item of decoded.filter(Boolean)) {
        if (offset >= item.buffer.duration) continue;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const setting = settingsRef.current[item.asset.id] || {};
        source.buffer = item.buffer;
        gain.gain.value = setting.volume ?? 1;
        source.connect(gain);
        gain.connect(masterGainRef.current);
        source.start(now, Math.max(0, offset));
        sourcesRef.current.push(source);
      }
      const stepSeconds = 60 / bpm / 4;
      let step = Math.floor(offset / stepSeconds) % 16;
      let nextTime = now;
      const schedule = () => {
        const currentPatterns = patternsRef.current;
        while (nextTime < ctx.currentTime + 0.12) {
          scheduleStep(ctx, nextTime, step, currentPatterns, waveform, beatVolume, synthVolume, masterGainRef.current || ctx.destination);
          step = (step + 1) % 16;
          nextTime += stepSeconds;
        }
      };
      schedule();
      schedulerRef.current = setInterval(schedule, 25);
      startTimeRef.current = ctx.currentTime;
      startOffsetRef.current = offset;
      uiTimerRef.current = setInterval(() => {
        const elapsed = startOffsetRef.current + ctx.currentTime - startTimeRef.current;
        setPlayhead(elapsed);
        if (elapsed >= Math.max(10, longest)) stopPlayback();
      }, 80);
      setPlayhead(offset);
      setPlaying(true);
      setNotice("Studio playback active · sequencer running.");
    } catch (error) {
      setNotice(error?.message || "Could not start playback.");
    }
  }, [bpm, waveform, beatVolume, synthVolume, ensureContext, stopPlayback]);

  const togglePlay = () => playing ? stopPlayback() : startPlayback(playhead);
  const rewind = () => {
    const wasPlaying = playing;
    stopPlayback();
    setPlayhead(0);
    if (wasPlaying) startPlayback(0);
  };
  const seek = (value) => {
    const wasPlaying = playing;
    stopPlayback();
    setPlayhead(value);
    if (wasPlaying) startPlayback(value);
  };

  const addFiles = async (list) => {
    const files = Array.from(list || []).filter(file =>
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name)
    );
    if (!files.length) { setNotice("Choose supported audio files to add."); return; }
    const added = [];
    for (const file of files) {
      const asset = {
        id: safeId(), title: cleanTitle(file.name), fileName: file.name,
        category, blob: file, createdAt: Date.now()
      };
      await saveAsset(asset);
      added.push(asset);
    }
    const next = await getAssets();
    setAssets(next);
    setNotice(`${added.length} layer${added.length === 1 ? "" : "s"} added to ${categoryInfo(category).label}.`);
  };

  const recordVoice = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const asset = {
          id: safeId(), title: `Voice take ${new Date().toLocaleTimeString()}`,
          fileName: `voice-take-${Date.now()}.webm`, category: "vocals", blob, createdAt: Date.now()
        };
        await saveAsset(asset);
        setAssets(await getAssets());
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        setNotice("Voice take saved in your Vocals lane.");
      };
      recorder.start();
      setRecording(true);
      setCategory("vocals");
      setNotice("Recording from your microphone. Use headphones to hear the beat without bleed.");
    } catch {
      setNotice("Microphone access was blocked or is not available. Check your browser permissions.");
    }
  };

  const removeAsset = async (asset) => {
    await deleteAsset(asset.id);
    setAssets(await getAssets());
    setNotice(`Removed ${asset.title}.`);
  };

  const exportMix = async () => {
    setBusy(true);
    setNotice("Rendering your mix to WAV…");
    try {
      const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioCtx) throw new Error("WAV export is not supported in this browser.");
      const exportDuration = Math.max(8, Math.min(180, duration));
      const sampleRate = 44100;
      const offline = new AudioCtx(2, Math.ceil(sampleRate * exportDuration), sampleRate);
      const exportMaster = offline.createGain();
      exportMaster.gain.value = masterVolume;
      exportMaster.connect(offline.destination);
      const anySolo = Object.values(trackSettings).some(s => s?.solo);
      const playable = assets.filter(a => {
        const s = trackSettings[a.id] || {};
        return !s.muted && (!anySolo || s.solo);
      });
      for (const asset of playable) {
        try {
          const decoded = await offline.decodeAudioData(await asset.blob.arrayBuffer());
          const source = offline.createBufferSource();
          const gain = offline.createGain();
          gain.gain.value = (trackSettings[asset.id]?.volume ?? 1);
          source.buffer = decoded;
          source.connect(gain);
          gain.connect(exportMaster);
          source.start(0);
        } catch {}
      }
      const stepLength = 60 / bpm / 4;
      const totalSteps = Math.ceil(exportDuration / stepLength);
      for (let i = 0; i < totalSteps; i++) {
        scheduleStep(offline, i * stepLength, i % 16, patterns, waveform, beatVolume, synthVolume, exportMaster);
      }
      const rendered = await offline.startRendering();
      const wav = audioBufferToWav(rendered);
      const url = URL.createObjectURL(wav);
      const link = document.createElement("a");
      link.href = url;
      link.download = "zilla-play-mix.wav";
      link.click();
      URL.revokeObjectURL(url);
      setNotice("WAV mix exported successfully.");
    } catch (error) {
      setNotice(error?.message || "Could not export this mix.");
    } finally { setBusy(false); }
  };

  return (
    <div className="studio-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><AudioWaveform size={25}/></div>
          <div><b>ZILLA<span> PLAY</span></b><small>CREATIVE AUDIO STUDIO</small></div>
        </div>
        <div className="side-caption">WORKSPACE</div>
        <div className="nav-active"><Activity size={17}/> Studio <span>01</span></div>
        <div className="nav-static"><FileAudio size={17}/> Audio library <span>{assets.length}</span></div>
        <div className="sidebar-divider"/>
        <div className="side-caption">PROJECT SNAPSHOT</div>
        <div className="snapshot">
          <div className="snapshot-top"><span className="snapshot-led"/> LOCAL SESSION</div>
          <strong>{assets.length.toString().padStart(2, "0")} <small>audio layers</small></strong>
          <div className="snapshot-data"><span>{bpm} BPM</span><span>4/4 TIME</span></div>
        </div>
        <div className="sidebar-foot"><div className="privacy-icon"><CircleDot size={14}/></div><div><b>PRIVATE BY DESIGN</b><small>Files stay on this device</small></div></div>
      </aside>

      <main className="studio-main">
        <header className="topbar">
          <div><div className="breadcrumb">ZILLA LABS <span>/</span> CREATIVE TOOLS <span>/</span> ZILLA PLAY</div><div className="top-title">Music production workspace</div></div>
          <div className="top-right"><div className="ready"><i/> ENGINE READY</div><button className="export-btn" onClick={exportMix} disabled={busy}><Download size={15}/>{busy ? "Rendering…" : "Export WAV"}</button></div>
        </header>

        <section className="welcome-row">
          <div><div className="eyebrow"><Sparkles size={13}/> CREATE WITHOUT LIMITS</div><h1>Make sound. <em>Make worlds.</em></h1><p>Build your sound layer by layer — beats, rhythm, instruments and your own voice.</p></div>
          <div className="hero-orb"><div className="hero-orb-inner"><AudioLines size={34}/></div><span>PLAY / CREATE / REPEAT</span></div>
        </section>

        <section className="transport panel">
          <div className="transport-left">
            <div className="transport-label"><span className={playing ? "pulse" : ""}/> TRANSPORT</div>
            <div className="transport-buttons">
              <button title="Rewind to start" onClick={rewind}><Rewind size={18}/></button>
              <button className="transport-play" onClick={togglePlay}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
              <button title="Stop" onClick={() => { stopPlayback(); setPlayhead(0); }}><Square size={15} fill="currentColor"/></button>
              <button title="Restart from beginning" onClick={() => startPlayback(0)}><SkipBack size={17}/></button>
            </div>
          </div>
          <div className="transport-progress">
            <div className="progress-meta"><span>{timeLabel(playhead)}</span><span>{timeLabel(duration)}</span></div>
            <input type="range" min="0" max={Math.max(10, duration)} step="0.1" value={Math.min(playhead, duration)} onChange={e => seek(Number(e.target.value))}/>
            <div className="progress-caption"><span>ARRANGEMENT POSITION</span><span>{playing ? "PLAYING" : "PAUSED"}</span></div>
            <LiveSpectrum analyser={liveAnalyser} active={playing}/>
          </div>
          <div className="tempo-control"><label>TEMPO</label><div className="bpm-set"><button onClick={() => setBpm(v => Math.max(50, v - 1))}>−</button><strong>{bpm}</strong><button onClick={() => setBpm(v => Math.min(200, v + 1))}>+</button></div><small>BPM</small></div>
        </section>

        <section className="studio-grid">
          <div className="panel sequencer-panel">
            <div className="panel-head"><div><div className="eyebrow"><Zap size={13}/> STEP SEQUENCER</div><h2>Build your rhythm</h2></div><div className="tag">16-STEP LOOP</div></div>
            <div className="tabs"><button className={tab === "beats" ? "tab-active" : ""} onClick={() => setTab("beats")}><Activity size={14}/> Beats & rhythm</button><button className={tab === "instruments" ? "tab-active" : ""} onClick={() => setTab("instruments")}><Music2 size={14}/> Instruments</button></div>
            {tab === "beats" ? <div className="sequencer-body">
              <div className="step-number-row"><span>CHANNEL</span><div>{Array.from({length:16},(_,i)=><span key={i} className={i%4===0?"beat-number strong": "beat-number"}>{i+1}</span>)}</div></div>
              <StepRow label="KICK" pattern={patterns.kick} onToggle={i => togglePattern("kick",i)} color="violet"/>
              <StepRow label="SNARE" pattern={patterns.snare} onToggle={i => togglePattern("snare",i)} color="cyan"/>
              <StepRow label="HI-HAT" pattern={patterns.hat} onToggle={i => togglePattern("hat",i)} color="blue"/>
              <StepRow label="CLAP" pattern={patterns.clap} onToggle={i => togglePattern("clap",i)} color="pink"/>
            </div> : <div className="sequencer-body">
              <div className="instrument-settings"><label>SYNTH VOICE</label><select value={waveform} onChange={e => setWaveform(e.target.value)}><option value="sawtooth">Neon Saw</option><option value="sine">Pure Sine</option><option value="triangle">Soft Triangle</option><option value="square">Retro Square</option></select><span>Built-in synthesizer</span></div>
              <div className="step-number-row"><span>CHANNEL</span><div>{Array.from({length:16},(_,i)=><span key={i} className={i%4===0?"beat-number strong": "beat-number"}>{i+1}</span>)}</div></div>
              <StepRow label="SUB BASS" pattern={patterns.bass} onToggle={i => togglePattern("bass",i)} color="pink"/>
              <StepRow label="SYNTH LEAD" pattern={patterns.lead} onToggle={i => togglePattern("lead",i)} color="amber"/>
              <div className="note-hint">16 steps · Toggle a block to program a note · Change the synth voice above</div>
            </div>}
            <div className="sequencer-foot"><span><i className="legend-dot active"/> ACTIVE STEP</span><span><i className="legend-dot idle"/> EMPTY STEP</span><span>ONE BAR · 4/4</span></div>
          </div>

          <div className="right-stack">
            <div className="panel record-panel">
              <div className="eyebrow"><Mic size={13}/> VOICE CAPTURE</div><h2>Put your voice in it.</h2><p>Record vocals, ad-libs or spoken samples straight into your session.</p>
              <button className={`record-button ${recording ? "recording" : ""}`} onClick={recordVoice}>{recording ? <><Square size={15} fill="currentColor"/> Stop recording</> : <><Mic size={16}/> Record voice</>}</button>
              <div className="record-note"><span className={recording ? "record-indicator" : ""}/>{recording ? "MICROPHONE RECORDING" : "MICROPHONE ACCESS REQUIRED"}</div>
            </div>
            <div className="panel master-panel">
              <div className="eyebrow"><SlidersHorizontal size={13}/> MASTER OUTPUT</div><div className="master-vol"><Volume2 size={17}/><input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={e => { const v=Number(e.target.value); setMasterVolume(v); if(masterGainRef.current) masterGainRef.current.gain.value=v; }}/><b>{Math.round(masterVolume*100)}%</b></div>
              <div className="master-vol"><Waves size={17}/><input aria-label="Beat volume" type="range" min="0" max="1" step="0.01" value={beatVolume} onChange={e => setBeatVolume(Number(e.target.value))}/><span>BEATS</span></div>
              <div className="master-vol"><AudioLines size={17}/><input aria-label="Synth volume" type="range" min="0" max="1" step="0.01" value={synthVolume} onChange={e => setSynthVolume(Number(e.target.value))}/><span>SYNTH</span></div>
            </div>
          </div>
        </section>

        <section className="panel layers-panel">
          <div className="panel-head layers-heading"><div><div className="eyebrow"><AudioWaveform size={13}/> MULTITRACK ARRANGER</div><h2>Your sound layers <span>{assets.length.toString().padStart(2,"0")}</span></h2></div>
            <div className="import-controls"><select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c=><option value={c.id} key={c.id}>Import as: {c.label}</option>)}</select><button className="add-layer" onClick={() => fileInputRef.current?.click()}><Upload size={15}/> Import audio</button><input ref={fileInputRef} type="file" accept="audio/*,.flac,.opus" multiple hidden onChange={e=>{addFiles(e.target.files);e.target.value="";}}/></div>
          </div>
          <div className="stem-info"><Sparkles size={14}/><span>Keep vocals, drums, bass and melodies on separate lanes. Import each stem into its own lane to mix them independently.</span></div>
          {filteredAssets.length ? <div className="layers-list">
            {filteredAssets.map((asset,index) => {
              const cat=categoryInfo(asset.category);
              const setting=trackSettings[asset.id] || {};
              return <div className="layer-row" key={asset.id}>
                <div className={`layer-icon ${cat.color}`}><FileAudio size={17}/></div>
                <div className="layer-name"><b>{asset.title}</b><small>{cat.label.toUpperCase()} · {asset.fileName}</small></div>
                <div className="layer-wave"><WaveformPreview blob={asset.blob} color={cat.color}/></div>
                <div className="layer-controls"><button className={setting.muted?"control-muted":""} title="Mute layer" onClick={()=>patchAssetSettings(asset.id,{muted:!setting.muted})}>M</button><button className={setting.solo?"control-solo":""} title="Solo layer" onClick={()=>patchAssetSettings(asset.id,{solo:!setting.solo})}>S</button><input title="Layer volume" type="range" min="0" max="1" step="0.01" value={setting.volume??1} onChange={e=>patchAssetSettings(asset.id,{volume:Number(e.target.value)})}/><button title="Like layer" className={`like-layer ${liked.includes(asset.id)?"liked":""}`} onClick={()=>setLiked(old=>old.includes(asset.id)?old.filter(id=>id!==asset.id):[...old,asset.id])}><Heart size={15} fill={liked.includes(asset.id)?"currentColor":"none"}/></button><button title="Delete layer" className="delete-layer" onClick={()=>removeAsset(asset)}><Trash2 size={15}/></button></div>
              </div>;
            })}
          </div> : <div className="layers-empty"><FolderOpen size={22}/><b>No audio layers yet</b><span>Import separate vocals, beats, rhythm or instrument recordings to build your arrangement.</span><button onClick={()=>fileInputRef.current?.click()}><Plus size={14}/> Add your first layer</button></div>}
        </section>

        <div className="footer-note"><span>ZILLA PLAY <b>STUDIO 2.0</b></span><span>{notice}</span><span>LOCAL AUDIO ENGINE · NO CLOUD UPLOADS</span></div>
      </main>
    </div>
  );
}
