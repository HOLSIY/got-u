import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  ShieldCheck,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { formatUsername } from '../../utils/constants';

export const CallOverlay: React.FC = () => {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
  } = useApp();

  const [isMinimized, setIsMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer effect synced with call state
  useEffect(() => {
    let interval: number | null = null;
    if (activeCall && activeCall.status === 'connected') {
      interval = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [activeCall?.status]);

  // Bind local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && activeCall?.localStream) {
      localVideoRef.current.srcObject = activeCall.localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [activeCall?.localStream, activeCall?.isVideoOn, isMinimized]);

  // Bind remote stream to remote video / audio elements
  useEffect(() => {
    if (remoteVideoRef.current && activeCall?.remoteStream) {
      remoteVideoRef.current.srcObject = activeCall.remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && activeCall?.remoteStream) {
      remoteAudioRef.current.srcObject = activeCall.remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [activeCall?.remoteStream, isMinimized]);

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const isConnected = activeCall.status === 'connected';
  const isRinging = activeCall.status === 'ringing';
  const isConnecting = activeCall.status === 'connecting';

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Minimized floating PiP widget
  if (isMinimized) {
    return (
      <div
        id="minimized-call-pip"
        className="fixed bottom-20 right-4 z-50 bg-[#0d0f17]/95 border border-white/20 rounded-2xl shadow-2xl p-3 flex items-center gap-3 backdrop-blur-xl animate-fade-in text-white cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
          <img
            src={activeCall.peerUser.avatarUrl}
            alt={activeCall.peerUser.fullName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {isConnected && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-bold truncate max-w-[100px]">
            {activeCall.peerUser.fullName}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {isConnected ? formatTime(seconds) : activeCall.status}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
          title="Expand Call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="active-call-overlay"
      className="fixed inset-0 z-50 bg-[#08090c] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden animate-fade-in select-none"
    >
      {/* Hidden audio element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Background Visual: Real Remote Video Stream or Avatar Ambient Canvas */}
      {isVideo && activeCall.remoteStream && isConnected ? (
        <div className="absolute inset-0 z-0 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-radial from-[#1e1322] via-[#0d0f14] to-[#08090c]">
          {/* Subtle background ambient blur from peer avatar */}
          <div className="absolute inset-0 opacity-15 filter blur-3xl scale-125 pointer-events-none">
            <img
              src={activeCall.peerUser.avatarUrl}
              alt="bg"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Local Video Picture-in-Picture Preview (when video is on) */}
      {isVideo && activeCall.isVideoOn && (
        <div
          id="local-video-preview"
          className="absolute top-16 right-4 sm:top-16 sm:right-6 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-30 bg-slate-900"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${activeCall.isFrontCamera ? 'scale-x-[-1]' : ''}`}
          />
          <span className="absolute bottom-1 left-2 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white/80 font-medium">
            You
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {/* Minimize PiP Button */}
          <button
            id="minimize-call-button"
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 text-white transition-colors cursor-pointer"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Connection State Badge */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">WebRTC HD Connected</span>
              </>
            ) : isRinging ? (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-300">
                  {activeCall.isIncoming ? 'Incoming Ringing...' : 'Ringing Peer...'}
                </span>
              </>
            ) : isConnecting ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-blue-300">Negotiating ICE Connection...</span>
              </>
            ) : (
              <span className="text-slate-300 capitalize">{activeCall.status}</span>
            )}
          </div>
        </div>

        {/* Live Timer or Security Badge */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="text-xs font-mono font-bold text-white bg-black/50 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/15">
              {formatTime(seconds)}
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Permission Info or Status Banner */}
      {activeCall.error && (
        <div
          className={`relative z-20 max-w-md mx-auto my-2 px-3.5 py-2 rounded-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs shadow-xl transition-all ${
            activeCall.status === 'failed'
              ? 'bg-red-950/80 border border-red-500/50 text-red-200'
              : 'bg-amber-950/70 border border-amber-500/40 text-amber-200'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              activeCall.status === 'failed' ? 'text-red-400' : 'text-amber-400'
            }`}
          />
          <p className="flex-1 text-[11px] leading-relaxed">{activeCall.error}</p>
        </div>
      )}

      {/* Center Peer Profile Info (Shown when remote video is not covering full screen or in audio call) */}
      {(!isVideo || !isConnected || !activeCall.remoteStream) && (
        <div className="relative z-20 flex flex-col items-center text-center my-auto px-4">
          <div className="relative mb-6">
            {/* Animated Pulse Waves */}
            <span className="absolute inset-0 rounded-full bg-[#ff2d60]/20 animate-ping" style={{ animationDuration: '3s' }} />
            <span className="absolute -inset-4 rounded-full bg-white/5 animate-pulse" />
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-[#ff2d60] p-1.5 shadow-2xl bg-black/60">
              <img
                src={activeCall.peerUser.avatarUrl}
                alt={activeCall.peerUser.fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">
              {activeCall.peerUser.fullName}
            </h2>
            <VerifiedBadge size="sm" showText={false} />
          </div>

          <p className="text-sm text-slate-300 font-medium drop-shadow mb-3">
            {formatUsername(activeCall.peerUser.username)}
          </p>

          <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
            {isConnected
              ? `${activeCall.type === 'video' ? 'Video' : 'Voice'} Call • ${formatTime(seconds)}`
              : isRinging
              ? 'Ringing...'
              : 'Connecting WebRTC Session...'}
          </p>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="relative z-20 w-full max-w-md mx-auto pb-6 sm:pb-8 flex flex-col items-center gap-4">
        {/* Main Controls Grid */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-6">
          {/* Mute Microphone Button */}
          <button
            id="mute-call-button"
            onClick={toggleMute}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
              activeCall.isMuted
                ? 'bg-red-500/90 text-white hover:bg-red-600'
                : 'bg-white/15 hover:bg-white/25 text-white backdrop-blur-xl border border-white/15'
            }`}
            title={activeCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* End Call Button */}
          <button
            id="end-call-button"
            onClick={endCall}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>

          {/* Toggle Video Button */}
          {isVideo && (
            <button
              id="toggle-video-button"
              onClick={toggleVideo}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
                !activeCall.isVideoOn
                  ? 'bg-red-500/90 text-white hover:bg-red-600'
                  : 'bg-white/15 hover:bg-white/25 text-white backdrop-blur-xl border border-white/15'
              }`}
              title={activeCall.isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {activeCall.isVideoOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          )}

          {/* Flip Camera Button (for video calls) */}
          {isVideo && activeCall.isVideoOn && (
            <button
              id="flip-camera-button"
              onClick={flipCamera}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-xl border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-xl"
              title="Switch Front/Rear Camera"
            >
              <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
