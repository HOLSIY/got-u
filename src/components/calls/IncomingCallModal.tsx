import React from 'react';
import { Phone, PhoneOff, Video, Mic, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VerifiedBadge } from '../common/VerifiedBadge';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useApp();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div
      id="incoming-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative w-full max-w-sm bg-[#0d0f17] border border-white/15 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ff2d60]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Call Badge */}
        <div className="relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white/90 mb-6">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 text-[#ff2d60]" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Incoming WebRTC {isVideo ? 'Video' : 'Audio'} Call</span>
        </div>

        {/* Caller Avatar with Ringing Pulse Rings */}
        <div className="relative z-10 my-4 flex items-center justify-center">
          <span className="absolute w-36 h-36 rounded-full bg-[#ff2d60]/20 animate-ping" />
          <span className="absolute w-44 h-44 rounded-full bg-white/5 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full border-3 border-[#ff2d60] p-1 shadow-2xl bg-black/50">
            <img
              src={incomingCall.callerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'}
              alt={incomingCall.callerName}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Caller Details */}
        <div className="relative z-10 mt-3 mb-8">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-xl font-bold text-white drop-shadow">
              {incomingCall.callerName}
            </h2>
            <VerifiedBadge size="xs" showText={false} />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {incomingCall.callerUsername ? incomingCall.callerUsername : 'Direct Call'} • Ringing...
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 w-full flex items-center justify-around px-4">
          {/* Decline Button */}
          <button
            id="decline-call-button"
            onClick={() => declineIncomingCall(incomingCall)}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 active:scale-95 transition-all">
              <PhoneOff className="w-7 h-7" />
            </div>
            <span className="text-xs font-semibold text-red-400 group-hover:text-red-300">
              Decline
            </span>
          </button>

          {/* Accept Button */}
          <button
            id="accept-call-button"
            onClick={() => acceptIncomingCall(incomingCall)}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-105 active:scale-95 transition-all animate-bounce" style={{ animationDuration: '2s' }}>
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </div>
            <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              Accept {isVideo ? 'Video' : 'Call'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
