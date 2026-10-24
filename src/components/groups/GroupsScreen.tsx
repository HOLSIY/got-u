import React, { useState } from 'react';
import { Plus, Users, Shield, MessageSquare, ArrowRight, X, Check, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { formatUsername } from '../../utils/constants';

export const GroupsScreen: React.FC = () => {
  const { chats, createNewGroup, openChat, setActiveTab, allUsers, currentUser } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);

  const groupChats = chats.filter((c) => c.isGroup);
  const candidateUsers = allUsers.filter((u) => u.id !== currentUser.id);

  const toggleMemberSelect = (user: User) => {
    if (selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const newGroupId = await createNewGroup(groupName, selectedMembers);
    setShowCreateModal(false);
    setGroupName('');
    setSelectedMembers([]);
    openChat(newGroupId);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between z-20 shrink-0 bg-white/90 dark:bg-[#0a0b0e]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('chats')}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Back to Chats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f172a] dark:text-white">Groups</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Public & private channels</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full gradient-pink-button text-xs font-bold text-white shadow-md hover:scale-105 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Group</span>
        </button>
      </div>

      {/* Main Groups List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {groupChats.map((group) => (
          <div
            key={group.id}
            onClick={() => openChat(group.id)}
            className="p-4 rounded-3xl bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer group shadow-xs dark:shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <img
                src={group.avatarUrl}
                alt={group.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#ff2d60] transition-colors truncate">
                    {group.name}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {group.members.length} members
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {typeof group.lastMessage === 'string' ? group.lastMessage : group.lastMessage?.content || 'Active group chat'}
                </p>
              </div>
            </div>

            {/* Member Avatars Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center -space-x-2">
                {group.members.slice(0, 4).map((m, i) => (
                  <img
                    key={i}
                    src={m.avatarUrl}
                    alt={m.fullName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-[#141620] object-cover"
                  />
                ))}
                {group.members.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-[#141620] flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-white">
                    +{group.members.length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-[#ff2d60] font-semibold">
                <span>Open Chat</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create New Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Create New Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Bali Summer Squad 🌴"
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#1a1d2b] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Members ({selectedMembers.length} selected)
                </label>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {candidateUsers.map((user) => {
                    const isSelected = selectedMembers.some((m) => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMemberSelect(user)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-rose-50 dark:bg-[#ff2d60]/20 border border-rose-300 dark:border-[#ff2d60]/40' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{user.fullName}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatUsername(user.username)}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#ff2d60] flex items-center justify-center text-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full h-11 rounded-full gradient-pink-button text-white text-xs font-bold shadow-lg shadow-[#ff2d60]/30 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
