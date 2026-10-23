import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Video,
  Sparkles,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Hash,
  Globe,
  Users,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadVideoToStorage, VideoUploadResult } from '../../utils/cloudStorage';
import { ChunkedVideoUploader } from '../../utils/chunkedVideoUploader';
import { backgroundReelUploader } from '../../utils/backgroundReelUploadManager';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Post, PostMediaItem } from '../../types';

interface CreateReelModalProps {
  onClose: () => void;
  onReelCreated?: (newReel: Post) => void;
}

const POPULAR_HASHTAGS = [
  '#GotU',
  '#Trending',
  '#Viral',
  '#Vibes',
  '#Adventure',
  '#Art',
  '#Music',
  '#Comedy',
  '#Travel',
  '#Tech',
  '#Fitness',
  '#Foodie',
];

const PRESET_AUDIO_TRACKS = [
  { id: 'orig', name: 'Original Audio', artist: 'Original Video Track' },
  { id: 'trending_1', name: 'Got U Trending Hits', artist: 'Nexus Studio Lab' },
  { id: 'chill_2', name: 'Midnight Chillhop', artist: 'Lofi Horizons' },
  { id: 'afro_3', name: 'Afrobeats Groove', artist: 'Pulse Records' },
  { id: 'acoustic_4', name: 'Sunset Acoustic Session', artist: 'Live Studio' },
  { id: 'cyber_5', name: 'Cyber Resonance', artist: 'Synthwave Odyssey' },
  { id: 'deep_6', name: 'Deep House Flow', artist: 'Club Underground' },
];

export type ReelTemplateType = 'classic' | 'ambient' | 'cinematic' | 'studio';

export const REEL_TEMPLATES: {
  id: ReelTemplateType;
  name: string;
  description: string;
  tag: string;
}[] = [
  {
    id: 'classic',
    name: 'Classic Fullscreen',
    description: 'Clean edge-to-edge reel view with original aspect ratio preserved',
    tag: 'Default',
  },
  {
    id: 'ambient',
    name: 'Ambient Glow',
    description: 'Atmospheric colored glow backdrop for high visual impact',
    tag: 'Ambient',
  },
  {
    id: 'cinematic',
    name: 'Cinematic Matte',
    description: 'Obsidian matte border container for widescreen depth',
    tag: 'Cinematic',
  },
  {
    id: 'studio',
    name: 'Minimal Studio',
    description: 'Refined dark studio frame with soft subtle shadow',
    tag: 'Studio',
  },
];

export const CreateReelModal: React.FC<CreateReelModalProps> = ({ onClose, onReelCreated }) => {
  const { currentUser } = useApp();

  // Wizard Tab: 'edit' (preview, trim, cover, template) | 'details' (caption, hashtags, audio)
  const [activeStep, setActiveStep] = useState<'edit' | 'details'>('edit');
  const [selectedTemplate, setSelectedTemplate] = useState<ReelTemplateType>('classic');

  // Video State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [rawDuration, setRawDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Playback & Trimming
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [coverScrubTime, setCoverScrubTime] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Metadata Details
  const [caption, setCaption] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Creative');
  const [selectedAudio, setSelectedAudio] = useState<string>('Original Audio');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  // Processing & Publishing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<'initializing' | 'uploading' | 'assembling' | 'transcoding' | 'ready' | 'paused'>('uploading');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeUploaderRef = useRef<any>(null);

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Video Selection & Metadata Decoding
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/x-m4v', 'video/avi'];
    const isVideoType = file.type.startsWith('video/') || validTypes.some((t) => file.name.toLowerCase().endsWith(t.replace('video/', '')));
    if (!isVideoType) {
      setErrorMessage('Please select a valid video file (MP4, WebM, MOV, QuickTime).');
      return;
    }

    // Size limit: 250MB
    if (file.size > 250 * 1024 * 1024) {
      setErrorMessage('Video file is too large. Maximum supported size is 250MB.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // Clean prior object URL
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setStatusMessage('Reading video metadata & dimensions...');

    // Load into hidden video to measure duration and extract initial poster frame
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration) || 10;
      setRawDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 600)); // up to 10 mins
      setCoverScrubTime(Math.min(1.0, dur / 2));
      setVideoResolution({
        width: tempVideo.videoWidth || 1080,
        height: tempVideo.videoHeight || 1920,
      });

      // Max 10 minutes check
      if (dur > 600) {
        setErrorMessage(`Video is ${Math.floor(dur / 60)} minutes long. Maximum supported Reel duration is 10 minutes.`);
      }

      // Seek to extract initial poster frame
      tempVideo.currentTime = Math.min(1.0, dur / 2);
    };

    tempVideo.onseeked = () => {
      extractCoverFrame(tempVideo);
      setStatusMessage(null);
    };

    tempVideo.onerror = () => {
      setErrorMessage('Could not decode video file. Please ensure it is an encoded MP4 or WebM video.');
      setStatusMessage(null);
    };
  };

  // Helper to extract frame from video into JPEG data URL
  const extractCoverFrame = (videoElement: HTMLVideoElement) => {
    try {
      const canvas = document.createElement('canvas');
      const w = Math.min(videoElement.videoWidth || 720, 720);
      const h = Math.min(videoElement.videoHeight || 1280, 1280);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setThumbnailDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn('Cover frame extraction notice:', err);
    }
  };

  // Capture frame at specific scrubber position
  const handleCoverScrub = (timeSec: number) => {
    setCoverScrubTime(timeSec);
    const video = previewVideoRef.current;
    if (video) {
      video.currentTime = timeSec;
      setTimeout(() => {
        extractCoverFrame(video);
      }, 80);
    }
  };

  // Time formatting (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Loop trimmed portion in preview
  const handleTimeUpdate = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    if (trimEnd > 0 && video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
      video.play().catch(() => {});
    }
  };

  const togglePreviewPlay = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime < trimStart || (trimEnd > 0 && video.currentTime >= trimEnd)) {
        video.currentTime = trimStart;
      }
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Add hashtag to caption
  const handleAddHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    }
  };

  // Main Publish Pipeline
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !videoPreviewUrl) {
      setErrorMessage('Please select a video file first.');
      return;
    }

    const effectiveDuration = Math.max(1, (trimEnd || rawDuration) - trimStart);
    if (effectiveDuration > 600) {
      setErrorMessage('Reels cannot exceed 10 minutes in duration.');
      return;
    }

    try {
      // 1. Prepare video file
      let fileToUpload: File;
      if (selectedFile) {
        fileToUpload = selectedFile;
      } else if (videoPreviewUrl) {
        const response = await fetch(videoPreviewUrl);
        const blob = await response.blob();
        fileToUpload = new File([blob], `reel_${Date.now()}.mp4`, { type: 'video/mp4' });
      } else {
        setErrorMessage('Please select a video file.');
        return;
      }

      // 2. Start non-blocking background upload
      const audioObj = selectedAudio !== 'Original Audio'
        ? {
            id: `aud_${Date.now()}`,
            title: selectedAudio,
            artist: `@${currentUser.username || 'user'}`,
            audioUrl: '',
            isOriginal: false,
          }
        : undefined;

      const pendingPost = await backgroundReelUploader.startUpload({
        file: fileToUpload,
        caption: caption.trim() || 'New Reel ✨',
        thumbnailDataUrl: thumbnailDataUrl || '',
        duration: effectiveDuration,
        width: videoResolution.width || 1080,
        height: videoResolution.height || 1920,
        audioTrack: audioObj,
        template: selectedTemplate,
        currentUser,
      });

      // 3. Immediately notify parent & close modal without forcing user to wait
      if (onReelCreated) {
        onReelCreated(pendingPost);
      }

      onClose();
    } catch (err: any) {
      console.error('Reel publish error:', err);
      setErrorMessage(err?.message || 'Failed to publish reel. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff2d60] to-purple-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Create Reel</h2>
              <p className="text-[10px] text-slate-400">Trim, style, and share high-definition videos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {videoPreviewUrl && !isProcessing && (
              <div className="flex rounded-lg bg-white/10 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveStep('edit')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    activeStep === 'edit' ? 'bg-[#ff2d60] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('details')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    activeStep === 'details' ? 'bg-[#ff2d60] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Details
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Reel published successfully! Added to Reels feed.</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/mov,video/x-m4v,video/avi"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* STEP 1: Video Selection & Video Player / Trimmer */}
          {!videoPreviewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-[#ff2d60]/60 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group p-6"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff2d60]/20 to-purple-600/20 border border-[#ff2d60]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 text-[#ff2d60]" />
              </div>
              <div className="text-center">
                <span className="text-sm font-extrabold text-white block">Click to select device video</span>
                <span className="text-xs text-slate-400 block mt-1">MP4, WebM, MOV, QuickTime (Up to 10 min • 250MB)</span>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-slate-300 text-[11px] font-bold mt-2">
                Browse Files
              </span>
            </button>
          ) : activeStep === 'edit' ? (
            <div className="space-y-4">
              {/* Interactive Player Preview with Selected Template (PHASE 33 & 34) */}
              <div
                className={`relative rounded-2xl overflow-hidden aspect-[9/14] max-h-72 sm:max-h-80 mx-auto flex items-center justify-center shadow-xl transition-all duration-300 ${
                  selectedTemplate === 'ambient'
                    ? 'bg-black shadow-[0_0_40px_rgba(255,45,96,0.3)] border border-[#ff2d60]/40'
                    : selectedTemplate === 'cinematic'
                    ? 'bg-[#06070a] border-y-2 border-x-0 border-white/30 rounded-none'
                    : selectedTemplate === 'studio'
                    ? 'bg-[#10131d] p-2 ring-1 ring-white/20 border border-slate-700/60'
                    : 'bg-black border border-white/15'
                }`}
              >
                {/* Dynamic Ambient Backdrop if ambient template is active */}
                {selectedTemplate === 'ambient' && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-[#ff2d60]/35 via-purple-600/25 to-blue-600/35 blur-2xl opacity-60 scale-125" />
                )}

                <video
                  ref={previewVideoRef}
                  src={videoPreviewUrl}
                  playsInline
                  muted={isAudioMuted}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePreviewPlay}
                  className="w-full h-full object-contain cursor-pointer relative z-1"
                />

                {/* Play/Pause Overlay Icon */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={togglePreviewPlay}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer z-10"
                  >
                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                  </button>
                )}

                {/* Top Overlay Controls */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-auto">
                  <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                    <Clock className="w-3 h-3 text-[#ff2d60]" />
                    <span>
                      Duration: {formatTime(Math.max(1, (trimEnd || rawDuration) - trimStart))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAudioMuted(!isAudioMuted)}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black backdrop-blur-md text-white border border-white/10 cursor-pointer"
                      title={isAudioMuted ? 'Unmute' : 'Mute'}
                    >
                      {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setVideoPreviewUrl(null);
                        setThumbnailDataUrl(null);
                      }}
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black backdrop-blur-md text-white border border-white/10 cursor-pointer"
                      title="Change Video"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Template Selection Section (PHASE 32 & 33 & 34) */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Choose Reel Template</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    100% Original Ratio Kept
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {REEL_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-[#ff2d60]/15 border-[#ff2d60] ring-1 ring-[#ff2d60]/50 shadow-md'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {tmpl.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-[#ff2d60] text-white' : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {tmpl.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {tmpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Aspect ratio safety badge */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 text-[10px] text-slate-400 border border-white/5">
                  <span>
                    Format: <strong className="text-white">{videoResolution.width || 1080}×{videoResolution.height || 1920}</strong> ({videoResolution.width > videoResolution.height ? 'Landscape' : videoResolution.width === videoResolution.height ? 'Square' : 'Portrait'})
                  </span>
                  <span className="text-emerald-400 font-medium">No stretching • No cropping</span>
                </div>
              </div>

              {/* Video Trimmer Section */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-[#ff2d60]" />
                    <span>Trim Video</span>
                  </span>
                  <span className="font-mono text-[#ff2d60]">
                    {formatTime(trimStart)} - {formatTime(trimEnd || rawDuration)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Start Time (sec)</label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, (trimEnd || rawDuration) - 1)}
                      step={0.5}
                      value={trimStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimStart(val);
                        if (previewVideoRef.current) previewVideoRef.current.currentTime = val;
                      }}
                      className="w-full accent-[#ff2d60] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">End Time (sec)</label>
                    <input
                      type="range"
                      min={trimStart + 1}
                      max={rawDuration || 600}
                      step={0.5}
                      value={trimEnd || rawDuration}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimEnd(val);
                        if (previewVideoRef.current) previewVideoRef.current.currentTime = val;
                      }}
                      className="w-full accent-[#ff2d60] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Frame Scrubber */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Choose Cover Frame</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Frame at {coverScrubTime.toFixed(1)}s</span>
                </div>

                <div className="flex items-center gap-3">
                  {thumbnailDataUrl && (
                    <img
                      src={thumbnailDataUrl}
                      alt="Cover Frame"
                      className="w-12 h-16 rounded-lg object-cover border border-white/20 shrink-0 shadow-sm"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      type="range"
                      min={trimStart}
                      max={trimEnd || rawDuration || 10}
                      step={0.2}
                      value={coverScrubTime}
                      onChange={(e) => handleCoverScrub(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Scrub slider to choose the perfect thumbnail preview
                    </span>
                  </div>
                </div>
              </div>

              {/* Step Navigation to Details */}
              <button
                type="button"
                onClick={() => setActiveStep('details')}
                className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
              >
                <span>Continue to Details & Hashtags</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* STEP 2: Details, Caption, Audio & Hashtags */
            <div className="space-y-4">
              {/* Caption Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Caption & Description</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening in this reel? Add a story, context, or shoutout..."
                  rows={3}
                  maxLength={500}
                  className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60] resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-slate-400">{caption.length}/500</span>
                </div>
              </div>

              {/* Trending Hashtag Quick Chips */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#ff2d60]" />
                  <span>Trending Hashtags</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        caption.includes(tag)
                          ? 'bg-[#ff2d60] text-white'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Audio Track Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#11131c] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
                  >
                    <option value="Creative">Creative / Art</option>
                    <option value="Lifestyle">Lifestyle & Vlog</option>
                    <option value="Travel">Travel & Places</option>
                    <option value="Comedy">Comedy & Fun</option>
                    <option value="Music">Music & Dance</option>
                    <option value="Tech">Tech & Gaming</option>
                    <option value="Fitness">Fitness & Sports</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Music className="w-3 h-3 text-purple-400" />
                    <span>Soundtrack</span>
                  </label>
                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#11131c] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
                  >
                    {PRESET_AUDIO_TRACKS.map((track) => (
                      <option key={track.id} value={`${track.name} • ${track.artist}`}>
                        {track.name} ({track.artist})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visibility Options */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Visibility</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-[#ff2d60]/20 border-[#ff2d60] text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[11px]">Public</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('friends')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      visibility === 'friends'
                        ? 'bg-[#ff2d60]/20 border-[#ff2d60] text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-[11px]">Friends</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-[#ff2d60]/20 border-[#ff2d60] text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-[11px]">Private</span>
                  </button>
                </div>
              </div>

              {/* Step Navigation to Back to Editor */}
              <button
                type="button"
                onClick={() => setActiveStep('edit')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Video Editor</span>
              </button>
            </div>
          )}

          {/* Real-time Upload & Processing Progress Bar */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <Loader2 className={`w-4 h-4 text-[#ff2d60] ${isPaused ? '' : 'animate-spin'}`} />
                  <span className="truncate max-w-[280px]">{statusMessage || 'Processing reel...'}</span>
                </span>
                <span className="text-[#ff2d60] font-mono shrink-0">{uploadProgress}%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ff2d60] via-purple-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(6, uploadProgress)}%` }}
                />
              </div>

              {/* Real-time pause/resume/cancel controls for chunked upload */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-400">
                  {processingStage === 'uploading'
                    ? 'Uploading video'
                    : processingStage === 'assembling'
                    ? 'Preparing Reel'
                    : 'Publishing'}
                </span>

                <div className="flex items-center gap-2">
                  {processingStage === 'uploading' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeUploaderRef.current) {
                          if (isPaused) {
                            activeUploaderRef.current.resume();
                            setIsPaused(false);
                          } else {
                            activeUploaderRef.current.pause();
                            setIsPaused(true);
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (activeUploaderRef.current) {
                        await activeUploaderRef.current.cancel();
                      }
                      setIsProcessing(false);
                      setIsPaused(false);
                      setUploadProgress(0);
                      setStatusMessage(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Publish Submission CTA */}
          {videoPreviewUrl && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={isProcessing}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#ff2d60] via-purple-600 to-[#ff2d60] bg-size-200 hover:bg-pos-100 active:scale-98 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#ff2d60]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing to Reels World...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish Reel Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
