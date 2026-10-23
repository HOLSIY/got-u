import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, RotateCcw, Play, VolumeX } from 'lucide-react';
import { videoPlayerManager } from '../../services/player/videoPlayerManager';

export type AspectRatioMode = 'auto' | 'fit' | 'fill';
export type PreloadTier = 'active' | 'next' | 'metadata' | 'paused' | 'none';

export interface HlsReelPlayerProps {
  reelId?: string;
  src: string;
  fallbackSrc?: string;
  poster?: string;
  isActive: boolean;
  isPlaying?: boolean;
  isPreload?: boolean;
  preloadTier?: PreloadTier;
  isMuted: boolean;
  aspectRatioMode?: AspectRatioMode;
  initialAspectRatio?: number | null;
  isRiverFlowMode?: boolean;
  onAspectRatioDetected?: (ratio: number, effectiveFit: 'cover' | 'contain') => void;
  onTimeUpdate?: (currentTime: number, duration: number, progressPercent: number) => void;
  onEnded?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const HlsReelPlayerComponent: React.FC<HlsReelPlayerProps> = ({
  reelId,
  src,
  fallbackSrc,
  poster,
  isActive,
  isPlaying = true,
  isPreload = false,
  preloadTier,
  isMuted,
  aspectRatioMode = 'auto',
  initialAspectRatio = null,
  isRiverFlowMode = false,
  onAspectRatioDetected,
  onTimeUpdate,
  onEnded,
  onClick,
  className = '',
}) => {
  const reelKey = reelId || src || 'reel_player';
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startupWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const hasSwitchedToFallbackRef = useRef<boolean>(false);
  const hasEndedDispatchedRef = useRef<boolean>(false);
  const isRetryingRef = useRef<boolean>(false);

  // Position preservation ref (ONLY used for in-flight live network recovery on the active video)
  const savedPositionRef = useRef<number>(0);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [isMutedByPolicy, setIsMutedByPolicy] = useState<boolean>(false);

  const videoRatioRef = useRef<number | null>(initialAspectRatio || null);
  const [videoRatio, setVideoRatio] = useState<number | null>(initialAspectRatio || null);

  // Keep callback refs stable to prevent cascading effect triggers
  const onAspectRatioDetectedRef = useRef(onAspectRatioDetected);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onAspectRatioDetectedRef.current = onAspectRatioDetected;
    onTimeUpdateRef.current = onTimeUpdate;
    onEndedRef.current = onEnded;
  }, [onAspectRatioDetected, onTimeUpdate, onEnded]);

  // Update videoRatio if initialAspectRatio arrives or changes
  useEffect(() => {
    if (initialAspectRatio && (!videoRatioRef.current || Math.abs(videoRatioRef.current - initialAspectRatio) > 0.05)) {
      videoRatioRef.current = initialAspectRatio;
      setVideoRatio(initialAspectRatio);
    }
  }, [initialAspectRatio]);

  // Determine effective fit based on mode and natural aspect ratio
  const autoFit: 'cover' | 'contain' = videoRatio && videoRatio >= 0.75 ? 'contain' : 'cover';
  const effectiveFit: 'cover' | 'contain' =
    aspectRatioMode === 'fit' ? 'contain' : aspectRatioMode === 'fill' ? 'cover' : autoFit;

  const isHlsStream = Boolean(src && (src.includes('.m3u8') || src.includes('/api/hls/')));

  // Clean up HLS instance safely
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
  }, []);

  // Safe Play Utility: attempts unmuted autoplay first; falls back immediately to muted autoplay if blocked
  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActive || !isPlaying) return;

    if (video.ended || (video.duration && video.currentTime >= video.duration - 0.15)) {
      video.currentTime = 0;
      savedPositionRef.current = 0;
      videoPlayerManager.clearPlaybackPosition(reelKey);
    }

    const promise = video.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsLoaded((prev) => (prev ? prev : true));
          setIsBuffering(false);
          setIsAutoplayBlocked(false);
          setLoadError(null);
          videoPlayerManager.recordMetric(reelKey, 'play');
        })
        .catch(() => {
          // If unmuted autoplay blocked by browser policy, fallback to MUTED autoplay immediately
          if (!video.muted) {
            video.muted = true;
            setIsMutedByPolicy(true);
            video
              .play()
              .then(() => {
                setIsLoaded((prev) => (prev ? prev : true));
                setIsBuffering(false);
                setIsAutoplayBlocked(false);
                setLoadError(null);
                videoPlayerManager.recordMetric(reelKey, 'play');
              })
              .catch(() => {
                // Strict browser policy completely blocked autoplay: show clean single-tap play button
                setIsAutoplayBlocked(true);
                setIsBuffering(false);
              });
          } else {
            setIsAutoplayBlocked(true);
            setIsBuffering(false);
          }
        });
    }
  }, [isActive, isPlaying, reelKey]);

  // Detect and synchronize natural video aspect ratio on metadata load and playback
  const checkDimensions = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (!videoRatioRef.current || Math.abs(videoRatioRef.current - ratio) > 0.05) {
        videoRatioRef.current = ratio;
        setVideoRatio(ratio);
        const recommendedFit = ratio >= 0.75 ? 'contain' : 'cover';
        onAspectRatioDetectedRef.current?.(ratio, recommendedFit);
      }
    }
  }, []);

  // Check dimensions whenever src changes
  useEffect(() => {
    checkDimensions();
  }, [checkDimensions, src]);

  // Track Reel registration with central player manager
  useEffect(() => {
    const video = videoRef.current;
    if (isActive && video) {
      videoPlayerManager.registerVideo(video, reelKey);
      videoPlayerManager.startReelMeasurement(reelKey);
    }
    return () => {
      if (video) {
        videoPlayerManager.unregisterVideo(video, reelKey);
      }
    };
  }, [isActive, reelKey]);

  // Clean Start Rule: When this player becomes active, ALWAYS start cleanly from 0:00 (never skip the beginning!)
  useEffect(() => {
    if (isActive) {
      const video = videoRef.current;
      if (video && !isRetryingRef.current) {
        video.currentTime = 0;
        savedPositionRef.current = 0;
      }
    }
  }, [isActive]);

  // Initialize Video source & HLS streaming
  // NOTE: Separated from active/playing changes so HLS is NOT torn down on simple pause/resume!
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsBuffering(false);
    hasSwitchedToFallbackRef.current = false;
    hasEndedDispatchedRef.current = false;
    videoPlayerManager.recordMetric(reelKey, 'url');

    const networkProfile = videoPlayerManager.getNetworkProfile();

    // Safari & iOS Native HLS support
    if (isHlsStream && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (isActive) {
        video.currentTime = 0;
      }
    } else if (isHlsStream && Hls.isSupported()) {
      destroyHls();

      // Fast Start Playback HLS Engine
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startFragPrefetch: true,
        testBandwidth: false,
        startLevel: networkProfile.recommendedStartLevel,
        backBufferLength: 20,
        maxBufferLength: networkProfile.maxBufferSeconds,
        maxMaxBufferLength: networkProfile.maxBufferSeconds * 1.5,
        autoStartLoad: isActive || isPreload,
      });

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isRetryingRef.current && savedPositionRef.current > 0.2 && video) {
          video.currentTime = savedPositionRef.current;
        } else if (video && isActive) {
          video.currentTime = 0;
        }
        if (isActive && isPlaying) {
          safePlay();
        }
      });

      // Seamless auto-loop replay for HLS streams or River Flow advance
      hls.on(Hls.Events.BUFFER_EOS, () => {
        const v = videoRef.current;
        if (isRiverFlowMode) {
          if (!hasEndedDispatchedRef.current) {
            hasEndedDispatchedRef.current = true;
            onEnded?.();
          }
        } else if (v && isActive && isPlaying) {
          v.currentTime = 0;
          savedPositionRef.current = 0;
          safePlay();
        }
      });

      // Resilient HLS error recovery — preserves position only during in-flight live retry
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              const currentPos = videoRef.current?.currentTime || 0;
              if (currentPos > 0.1) {
                savedPositionRef.current = currentPos;
              }
              if (videoPlayerManager.canRetry(reelKey)) {
                videoPlayerManager.recordRetry(reelKey);
                isRetryingRef.current = true;
                hls.startLoad(savedPositionRef.current > 0.1 ? savedPositionRef.current : undefined);
              } else {
                handleVideoError();
              }
              break;
            }
            case Hls.ErrorTypes.MEDIA_ERROR: {
              const currentPos = videoRef.current?.currentTime || 0;
              if (currentPos > 0.1) {
                savedPositionRef.current = currentPos;
              }
              if (videoPlayerManager.canRetry(reelKey)) {
                videoPlayerManager.recordRetry(reelKey);
                isRetryingRef.current = true;
                hls.recoverMediaError();
              } else {
                handleVideoError();
              }
              break;
            }
            default:
              handleVideoError();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else {
      // Standard Direct MP4 / WebM / CDN Video Delivery
      const directSource = src || fallbackSrc || '';
      const resolvedDirect = directSource
        ? typeof window !== 'undefined'
          ? new URL(directSource, window.location.href).href
          : directSource
        : '';
      const currentSrc = video.src || '';
      const currentAttr = video.getAttribute('src') || '';

      if (directSource && currentSrc !== resolvedDirect && currentAttr !== directSource) {
        video.src = directSource;
        if (isRetryingRef.current && savedPositionRef.current > 0.2) {
          video.currentTime = savedPositionRef.current;
        } else if (isActive) {
          video.currentTime = 0;
        }
        video.load();
        if (isActive && isPlaying) {
          safePlay();
        }
      }
    }

    return () => {
      destroyHls();
    };
  }, [src, fallbackSrc, isHlsStream, destroyHls, reelKey]);

  // Handle Active Play / Pause and Mute State without recreating HLS instance
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    const shouldPlay = isActive && isPlaying;

    if (shouldPlay) {
      setLoadError(null);
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
      safePlay();

      // Startup watchdog: If after 6 seconds of being active it hasn't loaded, show clean retry
      if (startupWatchdogRef.current) clearTimeout(startupWatchdogRef.current);
      startupWatchdogRef.current = setTimeout(() => {
        if (isActive && !isLoaded && videoRef.current && videoRef.current.readyState < 2) {
          if (!videoPlayerManager.canRetry(reelKey)) {
            setLoadError("Couldn't load this Reel");
            setIsBuffering(false);
          }
        }
      }, 6000);
    } else {
      video.pause();
      // Reset position on pause if swiped away so next entrance is 0:00
      if (!isActive) {
        video.currentTime = 0;
        savedPositionRef.current = 0;
      }
      if (hlsRef.current && !isPreload) {
        hlsRef.current.stopLoad();
      }
      if (startupWatchdogRef.current) {
        clearTimeout(startupWatchdogRef.current);
      }
    }

    return () => {
      if (startupWatchdogRef.current) {
        clearTimeout(startupWatchdogRef.current);
      }
    };
  }, [isActive, isPlaying, isMuted, isPreload, reelKey, safePlay]);

  // Infinite Repeat Watchdog: Guarantees video loops continuously until user pauses
  useEffect(() => {
    if (!isActive || !isPlaying) return;

    const watchdogInterval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;

      if (v.currentTime < 1) {
        hasEndedDispatchedRef.current = false;
      }

      const dur = v.duration;
      // Guard: only evaluate completion if duration is a valid positive number > 1
      if (Number.isFinite(dur) && dur > 1 && (v.ended || v.currentTime >= dur - 0.35)) {
        if (isRiverFlowMode) {
          if (!hasEndedDispatchedRef.current) {
            hasEndedDispatchedRef.current = true;
            onEndedRef.current?.();
          }
        } else {
          v.currentTime = 0;
          savedPositionRef.current = 0;
          safePlay();
        }
      }
    }, 400);

    return () => clearInterval(watchdogInterval);
  }, [isActive, isPlaying, isRiverFlowMode, reelKey, safePlay]);

  // Online connection recovery listener
  useEffect(() => {
    const handleOnline = () => {
      const video = videoRef.current;
      if (video && isActive && isPlaying) {
        setLoadError(null);
        if (hlsRef.current) {
          hlsRef.current.startLoad();
        }
        safePlay();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isActive, isPlaying, safePlay]);

  // Handle direct video element error with bounded retries
  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;

    // 1. Try fallback source first
    if (fallbackSrc && video.src !== fallbackSrc && !hasSwitchedToFallbackRef.current) {
      hasSwitchedToFallbackRef.current = true;
      video.src = fallbackSrc;
      video.load();
      if (isActive && isPlaying) safePlay();
      return;
    }

    // 2. Fetch fresh signed playback URL from backend if reelId exists
    if (reelId && !hasSwitchedToFallbackRef.current) {
      fetch(`/api/reels/${reelId}/playback`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.playbackUrl && videoRef.current) {
            hasSwitchedToFallbackRef.current = true;
            const targetUrl = data.playbackUrl;
            videoRef.current.src = targetUrl;
            videoRef.current.load();
            if (isActive && isPlaying) safePlay();
          } else {
            triggerBoundedRetry();
          }
        })
        .catch(() => triggerBoundedRetry());
      return;
    }

    triggerBoundedRetry();
  };

  const triggerBoundedRetry = () => {
    if (videoPlayerManager.canRetry(reelKey)) {
      videoPlayerManager.recordRetry(reelKey);
      setIsBuffering(true);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          if (isActive && isPlaying) safePlay();
        }
      }, 1200);
    } else {
      setIsBuffering(false);
      setLoadError("Couldn't load this Reel");
    }
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadError(null);
    setIsBuffering(true);
    hasSwitchedToFallbackRef.current = false;
    videoPlayerManager.resetRetry(reelKey);

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      destroyHls();
      if (src) {
        const networkProfile = videoPlayerManager.getNetworkProfile();
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          startFragPrefetch: true,
          testBandwidth: false,
          startLevel: networkProfile.recommendedStartLevel,
          autoStartLoad: true,
        });
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isActive && isPlaying) safePlay();
        });
        hlsRef.current = hls;
      }
    } else {
      video.load();
      if (isActive && isPlaying) safePlay();
    }
  };

  // Detect natural video aspect ratio on metadata load
  const handleLoadedMetadata = () => {
    checkDimensions();
    setIsLoaded(true);
    setLoadError(null);
    videoPlayerManager.recordMetric(reelKey, 'metadata');
    // Ensure clean start from beginning
    const video = videoRef.current;
    if (video && !isRetryingRef.current && isActive) {
      video.currentTime = 0;
      if (isPlaying) {
        safePlay();
      }
    }
  };

  // Preload attribute decision:
  // Active reel -> 'auto' (highest priority, immediate media buffer)
  // Next reel (N+1) -> 'auto' if network allows & active is not buffering, else 'metadata'
  // Next+1 (N+2) -> 'metadata'
  // Others -> 'none' (zero bandwidth consumed)
  const networkProfile = videoPlayerManager.getNetworkProfile();
  const effectiveTier: PreloadTier = preloadTier || (isActive ? 'active' : isPreload ? 'next' : 'none');

  const preloadMode: 'auto' | 'metadata' | 'none' =
    effectiveTier === 'active'
      ? 'auto'
      : effectiveTier === 'next' && networkProfile.canPreloadNext && !videoPlayerManager.isBufferingActive()
      ? 'auto'
      : effectiveTier === 'metadata' || (isPreload && networkProfile.canPreloadNext)
      ? 'metadata'
      : 'none';

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      {/* Ambient Blurred Backdrop for Landscape & Square Fitted Videos */}
      {effectiveFit === 'contain' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {poster ? (
            <img
              src={poster}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-45 scale-125 transition-opacity duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-slate-900/80 via-black to-slate-950/80" />
          )}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* High-Resolution Poster Layer (Instant display, smoothly fades out when first playable video frames arrive) */}
      {poster && (
        <img
          src={poster}
          alt=""
          className={`absolute inset-0 z-5 w-full h-full ${
            effectiveFit === 'contain' ? 'object-contain' : 'object-cover'
          } transition-opacity duration-200 pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
        />
      )}

      {/* HTML5 Video Element with Fast Start Pipeline + Aspect Ratio Preservation */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        muted={isMuted}
        preload={preloadMode}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => {
          checkDimensions();
          setIsLoaded(true);
          setIsBuffering(false);
          videoPlayerManager.recordMetric(reelKey, 'first_frame');
          if (isActive && isPlaying && videoRef.current && videoRef.current.paused && !isAutoplayBlocked) {
            safePlay();
          }
        }}
        onWaiting={() => {
          if (videoRef.current && videoRef.current.readyState < 3) {
            setIsBuffering(true);
          }
          if (isActive) {
            videoPlayerManager.setActiveBuffering(true);
          }
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsLoaded(true);
          setIsAutoplayBlocked(false);
          setLoadError(null);
          checkDimensions();
          if (isActive) {
            videoPlayerManager.setActiveBuffering(false);
          }
          videoPlayerManager.recordMetric(reelKey, 'play');
        }}
        onLoadedData={() => {
          setIsLoaded(true);
          setIsBuffering(false);
          setLoadError(null);
          checkDimensions();
          videoPlayerManager.recordMetric(reelKey, 'first_frame');
          if (isActive && isPlaying && videoRef.current && videoRef.current.paused && !isAutoplayBlocked) {
            safePlay();
          }
        }}
        onPause={() => {
          // Clean pause state - do NOT recursively trigger safePlay
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (video && video.duration && Number.isFinite(video.duration) && video.duration > 0) {
            const current = video.currentTime;
            const dur = video.duration;
            if (isRiverFlowMode && dur > 1 && current >= dur - 0.35 && !hasEndedDispatchedRef.current) {
              hasEndedDispatchedRef.current = true;
              onEndedRef.current?.();
            }
            const progress = (current / dur) * 100;
            onTimeUpdateRef.current?.(current, dur, progress);
          }
        }}
        loop={!isRiverFlowMode}
        onEnded={() => {
          if (isRiverFlowMode) {
            if (!hasEndedDispatchedRef.current) {
              hasEndedDispatchedRef.current = true;
              onEndedRef.current?.();
            }
          } else {
            const video = videoRef.current;
            if (video && isActive && isPlaying) {
              video.currentTime = 0;
              safePlay();
            }
            onEndedRef.current?.();
          }
        }}
        onError={handleVideoError}
        className={`relative z-10 w-full h-full ${
          effectiveFit === 'contain' ? 'object-contain' : 'object-cover'
        } transition-opacity duration-200 opacity-100`}
      />

      {/* Muted by Autoplay Policy Indicator: Informs user that sound started muted */}
      {isMutedByPolicy && isActive && (
        <div className="absolute top-16 left-4 z-30 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (v) {
                v.muted = false;
                setIsMutedByPolicy(false);
              }
            }}
            className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5 text-[#ff2d60]" />
            <span>Muted • Tap for Sound</span>
          </button>
        </div>
      )}

      {/* Autoplay Blocked Fallback Overlay: Clean, single-tap to play */}
      {isAutoplayBlocked && isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/40 backdrop-blur-xs pointer-events-auto select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (v) {
                v.play()
                  .then(() => {
                    setIsAutoplayBlocked(false);
                    setIsLoaded(true);
                  })
                  .catch(() => {});
              }
            }}
            className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold text-sm flex items-center gap-2.5 backdrop-blur-md shadow-2xl transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white text-white" />
            <span>Tap to Play</span>
          </button>
        </div>
      )}

      {/* Minimal Buffering Spinner */}
      {isBuffering && isActive && !loadError && !isAutoplayBlocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-3 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center shadow-lg border border-white/10">
            <Loader2 className="w-6 h-6 text-white/90 animate-spin" />
          </div>
        </div>
      )}

      {/* Clear, Minimal Error State */}
      {loadError && isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs z-30 p-6 text-center select-none pointer-events-auto">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Couldn't load this Reel</p>
          <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
            Video playback was interrupted. Tap retry to restart.
          </p>
          <button
            type="button"
            onClick={handleManualRetry}
            className="px-5 py-2 rounded-full bg-[#ff2d60] text-white text-xs font-bold hover:bg-[#ff2d60]/90 transition-transform active:scale-95 shadow-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const HlsReelPlayer = memo(HlsReelPlayerComponent);
