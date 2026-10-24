import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Check, ArrowRight, Sparkles, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { fetchFirestoreGlobalUsers, searchGlobalUsers } from '../../utils/userSearch';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { formatUsername } from '../../utils/constants';

export const SuggestedFriendsScreen: React.FC = () => {
  const { currentUser, friendRequests, sendFriendRequest, setScreen } = useApp();
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      const users = await fetchFirestoreGlobalUsers();
      // Filter out current user
      const filtered = users.filter((u) => u.id !== currentUser.id);
      setSuggestedUsers(filtered);
      setIsLoading(false);
    }
    loadUsers();
  }, [currentUser.id]);

  const displayedUsers = searchQuery.trim()
    ? searchGlobalUsers(searchQuery, currentUser.id)
    : suggestedUsers;

  return (
    <div className="relative w-full h-full bg-[#07080a] flex flex-col justify-between overflow-hidden p-5">
      {/* Background Ambient Glowing Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#ff2d60]/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#762DFA]/15 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 pt-2 pb-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#ff2d60] to-[#762DFA] flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
              got u
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold">Suggested Friends</p>
          </div>
        </div>

        <button
          onClick={() => setScreen('main')}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mb-1">
            Build Your Circle 👥
          </h2>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Connect with friends on got u to start messaging, calling, and sharing stories.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people by name or @username..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#12141d] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60] shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Suggested List */}
        <div className="space-y-2.5 pt-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#ff2d60] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">Discovering people on Nexus...</p>
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="p-8 text-center bg-[#12141d]/60 rounded-3xl border border-white/5 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No users found</p>
              <p className="text-[11px] text-slate-500">Try searching for another name or handle.</p>
            </div>
          ) : (
            displayedUsers.map((user) => {
              const status = friendRequests[user.id] || 'none';
              const isSent = status === 'pending_sent';
              const isAccepted = status === 'accepted';

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141d]/80 hover:bg-[#12141d] border border-white/5 transition-all shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {user.fullName}
                        </span>
                        <VerifiedBadge size="xs" showText={false} />
                      </div>
                      <p className="text-[11px] font-semibold text-[#ff2d60] truncate">
                        {formatUsername(user.username)}
                      </p>
                      {user.bio && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAccepted ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Friends
                      </span>
                    ) : isSent ? (
                      <button
                        disabled
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 flex items-center gap-1.5 cursor-not-allowed opacity-80"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sent</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] hover:brightness-110 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="relative z-10 pt-3 border-t border-white/5">
        <button
          onClick={() => setScreen('main')}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#ff2d60] via-[#762DFA] to-[#00D4FF] hover:brightness-110 text-white font-extrabold text-xs tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Continue to got u</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
