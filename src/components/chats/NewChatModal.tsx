import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Phone, User, Check, Shield, Calendar, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';
import { searchGlobalUsers, fetchFirestoreGlobalUsers } from '../../utils/userSearch';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { CreateEventGroupModal } from '../groups/CreateEventGroupModal';
import { MOCK_USERS } from '../../data/mockData';
import { formatUsername } from '../../utils/constants';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
  const { currentUser, friendRequests, createEventGroup, openChat } = useApp();
  const [query, setQuery] = useState('');
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserType | null>(null);
  const [showCreateEventGroupModal, setShowCreateEventGroupModal] = useState(false);

  useEffect(() => {
    fetchFirestoreGlobalUsers();
  }, []);

  const filtered = searchGlobalUsers(query, currentUser?.id || '');
  const cleanQuery = query.trim().toLowerCase().replace(/^@/, '');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-slate-100 relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-[#ff2d60]" />
            <span>Search Global Users</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action: Create Event Group */}
        <div className="pt-3 shrink-0">
          <button
            onClick={() => setShowCreateEventGroupModal(true)}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white flex items-center justify-between shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold">Create Event Group</h4>
                <p className="text-[10px] text-indigo-100/80">With dates, tasks, polls & shared budget</p>
              </div>
            </div>
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="pt-3 pb-2 shrink-0">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by exact @username or name..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100 dark:bg-[#0a0b0e] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#ff2d60]"
              autoFocus
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* User Search Results */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No contacts match "{query}"
            </div>
          ) : (
            filtered.map((user) => {
              const friendStatus = friendRequests[user.id] || 'none';
              const isExactUsernameMatch =
                cleanQuery &&
                (user.username.toLowerCase().replace(/^@/, '') === cleanQuery);

              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedProfileUser(user)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                    isExactUsernameMatch
                      ? 'bg-[#ff2d60]/10 border-[#ff2d60]/40 shadow-lg shadow-[#ff2d60]/5'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#ff2d60] transition-colors">
                          {user.fullName}
                        </h3>
                        <VerifiedBadge size="xs" showText={false} />
                        {isExactUsernameMatch && (
                          <span className="text-[9px] font-extrabold bg-[#ff2d60] text-white px-1.5 py-0.5 rounded-full uppercase">
                            Exact
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatUsername(user.username)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {friendStatus === 'accepted' ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Friends
                      </span>
                    ) : friendStatus === 'pending_sent' ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#ff2d60]/20 text-[#ff2d60] border border-[#ff2d60]/30 group-hover:bg-[#ff2d60] group-hover:text-white transition-colors">
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

      {selectedProfileUser && (
        <UserProfileModal
          user={selectedProfileUser}
          onClose={() => setSelectedProfileUser(null)}
        />
      )}

      {showCreateEventGroupModal && (
        <CreateEventGroupModal
          isOpen={showCreateEventGroupModal}
          onClose={() => setShowCreateEventGroupModal(false)}
          availableUsers={Object.values(MOCK_USERS)}
          onCreateEventGroup={async (name, details, members) => {
            const newChatId = await createEventGroup(name, details, members);
            setShowCreateEventGroupModal(false);
            onClose();
            openChat(newChatId);
          }}
        />
      )}
    </div>
  );
};


