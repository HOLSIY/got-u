import React, { useState } from 'react';
import { Search, UserPlus, Star, Phone, MessageSquare, Video, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';
import { searchGlobalUsers } from '../../utils/userSearch';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { formatUsername } from '../../utils/constants';

export const ContactsScreen: React.FC = () => {
  const { createNewChatWithUser, friendRequests, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);

  const filteredUsers = searchGlobalUsers(search, currentUser?.id || '');
  const onlineUsers = filteredUsers.filter((u) => u.isOnline);

  const cleanQuery = search.trim().toLowerCase().replace(/^@/, '');

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex flex-col gap-3 shrink-0 bg-white/90 dark:bg-[#050505]/90 backdrop-blur-md z-20 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Global Contacts & Search</h1>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all accounts by exact @username or name..."
            className="w-full h-10 pl-10 pr-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#ff2d60]/50 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-white/30 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Active Users */}
        {onlineUsers.length > 0 && (
          <div>
            <h2 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-[0.15em] mb-2.5">
              Active Now ({onlineUsers.length})
            </h2>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserForProfile(user)}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-black" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate max-w-14 text-center">
                    {user.fullName.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Users List */}
        <div>
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-[0.15em] mb-2.5">
            Global Database Accounts ({filteredUsers.length})
          </h2>

          <div className="space-y-1.5">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5">
                No users found matching "{search}"
              </div>
            ) : (
              filteredUsers.map((user) => {
                const status = friendRequests[user.id] || 'none';
                const isExactUsernameMatch =
                  cleanQuery &&
                  (user.username.toLowerCase().replace(/^@/, '') === cleanQuery);

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserForProfile(user)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                      isExactUsernameMatch
                        ? 'bg-[#ff2d60]/10 border-[#ff2d60]/40 shadow-lg shadow-[#ff2d60]/5'
                        : 'bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border-slate-200 dark:border-white/5 shadow-xs dark:shadow-none'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-white/10"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white/90 group-hover:text-[#ff2d60] dark:group-hover:text-white transition-colors truncate">
                            {user.fullName}
                          </h3>
                          <VerifiedBadge size="xs" showText={false} />
                          {isExactUsernameMatch && (
                            <span className="text-[9px] font-extrabold bg-[#ff2d60] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Exact Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-white/40 truncate">
                          {formatUsername(user.username)} • {user.isOnline ? 'Online' : user.lastSeen || 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {status === 'accepted' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            createNewChatWithUser(user);
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/30"
                          title="Open Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#ff2d60] bg-[#ff2d60]/10 px-2.5 py-1 rounded-full border border-[#ff2d60]/20">
                          View Profile
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </div>
  );
};


