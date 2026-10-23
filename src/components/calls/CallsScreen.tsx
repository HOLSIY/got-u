import React, { useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Clock,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, CallRecord } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { formatUsername } from '../../utils/constants';

export const CallsScreen: React.FC = () => {
  const { callHistory, startCall, allUsers, currentUser } = useApp();
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [search, setSearch] = useState('');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [showNewCallList, setShowNewCallList] = useState(false);

  const filteredHistory = callHistory.filter((call) => {
    const isMissed = call.status === 'missed' || call.status === 'declined';
    if (filter === 'missed' && !isMissed) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const isCaller = Boolean(currentUser?.id && call.callerId === currentUser.id);
    const peerName = isCaller ? call.receiverName : call.callerName;
    return peerName.toLowerCase().includes(query);
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatTimestamp = (timeMs?: number | string) => {
    if (!timeMs) return '';
    const date = new Date(timeMs);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCallIcon = (call: CallRecord) => {
    const isCaller = Boolean(currentUser?.id && call.callerId === currentUser.id);
    if (call.status === 'missed' || call.status === 'declined') {
      return <PhoneMissed className="w-3.5 h-3.5 text-red-500" />;
    }
    if (isCaller) {
      return <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />;
    }
    return <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div
      id="calls-screen"
      className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-[#07080b] text-slate-900 dark:text-slate-100"
    >
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex flex-col gap-3 shrink-0 bg-white/90 dark:bg-[#07080b]/90 backdrop-blur-md z-20 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Calls</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              WebRTC Audio & Video Call Logs
            </p>
          </div>

          {/* Start New Call Button */}
          <button
            id="start-new-call-header-button"
            onClick={() => setShowNewCallList((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff2d60] hover:bg-[#ff2d60]/90 text-white text-xs font-bold shadow-md shadow-[#ff2d60]/20 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Call</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/70 dark:bg-white/5 p-0.5 rounded-xl border border-slate-300 dark:border-white/10 shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('missed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'missed'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Missed
            </button>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search call logs..."
              className="w-full h-8.5 pl-8 pr-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#ff2d60]/50"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Quick Contact Picker if "New Call" is clicked */}
        {showNewCallList && (
          <div className="p-3 bg-white dark:bg-[#12141c] rounded-2xl border border-[#ff2d60]/30 shadow-lg mb-4 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Choose contact to call:
              </span>
              <button
                onClick={() => setShowNewCallList(false)}
                className="text-[11px] text-[#ff2d60] font-semibold"
              >
                Close
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar">
              {allUsers
                .filter((u) => !currentUser?.id || u.id !== currentUser.id)
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                          {user.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{formatUsername(user.username)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setShowNewCallList(false);
                          startCall(user, 'audio');
                        }}
                        className="p-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                        title="Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCallList(false);
                          startCall(user, 'video');
                        }}
                        className="p-2 rounded-full bg-[#ff2d60]/15 text-[#ff2d60] hover:bg-[#ff2d60] hover:text-white transition-colors cursor-pointer"
                        title="Video Call"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Call Logs History */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">
              {filter === 'missed' ? 'No missed calls.' : 'No call history yet.'}
            </p>
            <p className="text-[11px] mt-1">Tap "New Call" or open a chat to start talking!</p>
          </div>
        ) : (
          filteredHistory.map((call) => {
            const isCaller = Boolean(currentUser?.id && call.callerId === currentUser.id);
            const peerId = isCaller ? call.receiverId : call.callerId;
            const peerName = isCaller ? call.receiverName : call.callerName;
            const peerAvatar = isCaller ? call.receiverAvatar : call.callerAvatar;
            const isMissed = call.status === 'missed' || call.status === 'declined';
            const isVideo = call.callType === 'video';

            // Find full peer user if available
            const peerUser = allUsers.find((u) => u.id === peerId) || {
              id: peerId,
              fullName: peerName,
              username: `@${peerName.toLowerCase().replace(/\s+/g, '')}`,
              email: '',
              avatarUrl: peerAvatar,
              isOnline: true,
            };

            return (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/5 transition-all shadow-xs group"
              >
                {/* Peer info */}
                <div
                  onClick={() => setSelectedUserForProfile(peerUser)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <img
                    src={peerAvatar}
                    alt={peerName}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-xs font-bold truncate ${
                          isMissed
                            ? 'text-red-500'
                            : 'text-slate-900 dark:text-white group-hover:text-[#ff2d60]'
                        }`}
                      >
                        {peerName}
                      </h3>
                      <VerifiedBadge size="xs" showText={false} />
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {getCallIcon(call)}
                      <span className="capitalize">{call.status}</span>
                      <span>•</span>
                      <span>{isVideo ? 'Video' : 'Audio'}</span>
                      {call.duration && call.duration > 0 ? (
                        <>
                          <span>•</span>
                          <span className="font-mono">{formatDuration(call.duration)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Call Action & Timestamp */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatTimestamp(call.createdAt)}
                  </span>

                  <button
                    onClick={() => startCall(peerUser, isVideo ? 'video' : 'audio')}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#ff2d60] hover:text-white dark:bg-white/5 dark:hover:bg-[#ff2d60] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                    title={`Call back with ${isVideo ? 'Video' : 'Voice'}`}
                  >
                    {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Profile Modal on Avatar Click */}
      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </div>
  );
};
