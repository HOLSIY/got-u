import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Calendar, Clock, Sparkles, Send, FileText, Camera, Mic, Heart, Gift, Trophy, ShieldCheck } from 'lucide-react';
import { User, MemoryCapsule, CapsuleUnlockTrigger } from '../../types';
import { formatUsername } from '../../utils/constants';

interface CreateCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  availableUsers: User[];
  onCreateCapsule: (capsule: Omit<MemoryCapsule, 'id' | 'createdAt' | 'isUnlocked'>) => Promise<void>;
}

export const CreateCapsuleModal: React.FC<CreateCapsuleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableUsers,
  onCreateCapsule,
}) => {
  const userList = Array.isArray(availableUsers) ? availableUsers : [];
  const [recipientId, setRecipientId] = useState(userList[0]?.id || currentUser?.id || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'photo' | 'letter'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [unlockTrigger, setUnlockTrigger] = useState<CapsuleUnlockTrigger>('1_month');
  const [customUnlockDate, setCustomUnlockDate] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const recipient = userList.find((u) => u.id === recipientId) || userList[0] || {
    id: currentUser?.id || 'guest',
    fullName: currentUser?.fullName || 'User',
    username: currentUser?.username || 'user',
  };

  const getUnlockTimestamp = (): number => {
    const now = new Date();
    if (unlockTrigger === '1_month') return new Date(now.setMonth(now.getMonth() + 1)).getTime();
    if (unlockTrigger === 'next_year') return new Date(now.setFullYear(now.getFullYear() + 1)).getTime();
    if (unlockTrigger === '5_years') return new Date(now.setFullYear(now.getFullYear() + 5)).getTime();
    if (customUnlockDate) return new Date(customUnlockDate).getTime();
    return new Date(now.setDate(now.getDate() + 30)).getTime();
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !recipientId) {
      alert('Please fill out the capsule title, content, and recipient.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateCapsule({
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderAvatar: currentUser.avatarUrl,
        recipientId: recipient.id,
        recipientName: recipient.fullName,
        title: title.trim(),
        unlockTimestamp: getUnlockTimestamp(),
        contentType,
        content: content.trim(),
        mediaUrls: mediaUrl ? [mediaUrl] : undefined,
        isPrivate,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900/90">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Memory Capsule to Future</h3>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">Time-locked futuristic message & media</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* Recipient */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Recipient</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({formatUsername(u.username)})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Capsule Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Open on your 25th Birthday!"
                className="w-full p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Content Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Capsule Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'text', label: 'Secret Note', icon: FileText },
                  { id: 'photo', label: 'Photo Memory', icon: Camera },
                  { id: 'letter', label: 'Future Letter', icon: Heart },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = contentType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setContentType(type.id as any)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs transition-all ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-600/20 border-purple-500 text-purple-900 dark:text-white font-bold'
                          : 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-[11px]">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Future Message / Letter</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Write your secret message to be revealed in the future..."
                className="w-full p-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Media URL if photo */}
            {contentType === 'photo' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Photo URL</label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            )}

            {/* Unlock Date / Trigger */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Unlock Date / Trigger
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1_month', label: 'In 1 Month' },
                  { id: 'next_year', label: 'In 1 Year' },
                  { id: '5_years', label: 'In 5 Years' },
                  { id: 'custom', label: 'Exact Date' },
                ].map((trig) => (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => setUnlockTrigger(trig.id as any)}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                      unlockTrigger === trig.id
                        ? 'bg-purple-100 dark:bg-purple-600/20 border-purple-500 text-purple-900 dark:text-purple-300 font-bold'
                        : 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    {trig.label}
                  </button>
                ))}
              </div>

              {unlockTrigger === 'custom' && (
                <input
                  type="datetime-local"
                  value={customUnlockDate}
                  onChange={(e) => setCustomUnlockDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none mt-2"
                />
              )}
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/20 rounded-2xl flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300">
              <ShieldCheck className="w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400" />
              <span>This capsule will remain locked and encrypted until the designated unlock timestamp arrives!</span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-2 bg-slate-50 dark:bg-neutral-950">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-4 h-4" /> Lock & Send Capsule
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
