import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Plus, Sparkles, Calendar, Camera, MapPin, Trophy, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Chat, User, TimelineMoment, TimelineMomentType, FriendshipStory2026 } from '../../types';
import { FriendshipWrappedModal } from './FriendshipWrappedModal';

interface FriendshipTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  moments: TimelineMoment[];
  onAddMoment: (moment: Omit<TimelineMoment, 'id' | 'createdAt'>) => Promise<void>;
}

export const FriendshipTimelineModal: React.FC<FriendshipTimelineModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  moments,
  onAddMoment,
}) => {
  const [showWrapped, setShowWrapped] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Moment state
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TimelineMomentType>('milestone');
  const [photoUrl, setPhotoUrl] = useState('');
  const [locationName, setLocationName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherUser = chat.members.find((m) => m.id !== currentUser.id) || chat.members[0] || currentUser;

  if (!isOpen) return null;

  const t = {
    title: 'Friendship Timeline',
    subtitle: `Private storybook for ${currentUser.fullName} & ${otherUser.fullName}`,
    milestones: 'Milestone Moments',
    addMemory: 'Add Memory',
    cancel: 'Cancel',
    newMemory: 'New Milestone Memory',
    titlePlaceholder: 'Title (e.g. First Coffee, Road Trip)',
    captionPlaceholder: 'Caption / Memory details...',
    photoPlaceholder: 'Photo URL (optional)',
    locationPlaceholder: 'Location name (optional)',
    save: 'Save to Timeline',
    story: 'Story 2026',
  };

  const handleCreateMoment = async () => {
    if (!title.trim() || !date) return;
    setSubmitting(true);
    try {
      await onAddMoment({
        chatId: chat.id,
        creatorId: currentUser.id,
        creatorName: currentUser.fullName,
        creatorAvatar: currentUser.avatarUrl,
        title: title.trim(),
        caption: caption.trim(),
        mediaUrl: photoUrl || undefined,
        mediaType: photoUrl ? 'image' : undefined,
        date,
        type,
        locationName: locationName || undefined,
      });
      setTitle('');
      setCaption('');
      setPhotoUrl('');
      setLocationName('');
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Generated Friendship Story 2026 data
  const storyData: FriendshipStory2026 = {
    friendshipStartDate: 'January 2025',
    totalMessages: 1284,
    voiceCallsCount: 42,
    videoCallsCount: 18,
    photosShared: 156,
    videosShared: 24,
    mostActiveMonth: 'July 2025',
    favoriteEmoji: '❤️',
    longestConversationMinutes: 184,
    lateNightChatsCount: 68,
    relationshipGrowthPct: 98,
    funFacts: [
      'You talk most frequently on Friday nights!',
      'Shared over 150 photos together!',
      '98% match on conversation topics!',
    ],
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-[#0f111a] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 dark:from-rose-950/40 dark:via-purple-950/40 dark:to-neutral-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center -space-x-2 shrink-0 p-0.5">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-[#0f111a] object-cover shadow-sm shrink-0"
                  />
                  <img
                    src={otherUser.avatarUrl}
                    alt={otherUser.fullName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-[#0f111a] object-cover shadow-sm shrink-0"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{t.title}</span>
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500 shrink-0 inline-block" />
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                    {currentUser.fullName.split(' ')[0]} & {otherUser.fullName.split(' ')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowWrapped(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">{t.story}</span>
                  <span className="xs:hidden">Story</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50 dark:bg-transparent">
              {/* Add Moment Toggle */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.milestones} ({moments.length})</h4>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-semibold rounded-xl flex items-center gap-1 border border-slate-200 dark:border-white/10 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-rose-500" /> {showAddForm ? t.cancel : t.addMemory}
                </button>
              </div>

              {/* Add Memory Form */}
              {showAddForm && (
                <div className="p-4 bg-white dark:bg-[#141622] border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 shadow-md">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">{t.newMemory}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t.titlePlaceholder}
                      className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                    />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t.captionPlaceholder}
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder={t.photoPlaceholder}
                      className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                    />
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder={t.locationPlaceholder}
                      className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateMoment}
                    disabled={submitting}
                    className="w-full p-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    {t.save}
                  </button>
                </div>
              )}

              {/* Timeline Items List */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-rose-500 before:via-purple-500 before:to-indigo-500">
                {moments.map((moment) => (
                  <div key={moment.id} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f111a] flex items-center justify-center text-white text-[10px] shadow-lg shadow-rose-500/30">
                      ❤️
                    </div>

                    <div className="p-4 bg-white dark:bg-[#131520] rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-rose-500/40 transition-all space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">{moment.title}</span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-300 font-mono font-bold bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/40">
                          {moment.date}
                        </span>
                      </div>

                      {moment.caption && <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">{moment.caption}</p>}

                      {moment.mediaUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm max-h-56">
                          <img src={moment.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}

                      {moment.locationName && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                          <MapPin className="w-3 h-3 text-rose-500" /> {moment.locationName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Spotify Wrapped 2026 Slideshow Modal */}
      <FriendshipWrappedModal
        isOpen={showWrapped}
        onClose={() => setShowWrapped(false)}
        currentUser={currentUser}
        friendUser={otherUser}
        storyData={storyData}
      />
    </>
  );
};
