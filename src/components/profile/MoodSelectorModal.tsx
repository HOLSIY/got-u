import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smile, Clock, Eye, EyeOff, Check, Sparkles } from 'lucide-react';
import { MoodPreset, UserMood, MoodPrivacy } from '../../types';

interface MoodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMood?: UserMood;
  currentPrivacy?: MoodPrivacy;
  isMoodHidden?: boolean;
  onSaveMood: (mood: UserMood, privacy: MoodPrivacy, isHidden: boolean) => Promise<void>;
}

export const MOOD_PRESETS: { preset: MoodPreset; emoji: string; defaultText: string }[] = [
  { preset: 'Available', emoji: '📞', defaultText: 'Available to chat' },
  { preset: 'Happy', emoji: '😊', defaultText: 'Feeling great!' },
  { preset: 'In Love', emoji: '❤️', defaultText: 'In Love' },
  { preset: 'Sleeping', emoji: '😴', defaultText: 'Sleeping... zzz' },
  { preset: 'Studying', emoji: '📚', defaultText: 'Studying hard' },
  { preset: 'Working', emoji: '💼', defaultText: 'Busy working' },
  { preset: 'Gaming', emoji: '🎮', defaultText: 'Gaming mode on' },
  { preset: 'Driving', emoji: '🚗', defaultText: 'Driving safely' },
  { preset: 'Busy', emoji: '🏃', defaultText: 'Busy right now' },
  { preset: 'Listening to Music', emoji: '🎵', defaultText: 'Vibing to tunes' },
  { preset: 'Eating', emoji: '🍽', defaultText: 'Eating delicious food' },
  { preset: 'Watching Movie', emoji: '🎬', defaultText: 'Watching a movie' },
  { preset: 'Do Not Disturb', emoji: '🚫', defaultText: 'Do Not Disturb' },
  { preset: 'Sad', emoji: '😔', defaultText: 'Need some quiet time' },
  { preset: 'Angry', emoji: '😡', defaultText: 'Feeling upset' },
  { preset: 'Sick', emoji: '🤒', defaultText: 'Under the weather' },
  { preset: 'Traveling', emoji: '✈', defaultText: 'On an adventure' },
];

export const MoodSelectorModal: React.FC<MoodSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMood,
  currentPrivacy = 'Everyone',
  isMoodHidden = false,
  onSaveMood,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<MoodPreset>(currentMood?.preset || 'Available');
  const [customEmoji, setCustomEmoji] = useState(currentMood?.emoji || '😊');
  const [customText, setCustomText] = useState(currentMood?.text || 'Available to chat');
  const [scheduledReturn, setScheduledReturn] = useState(currentMood?.scheduledReturnTime || '');
  const [privacy, setPrivacy] = useState<MoodPrivacy>(currentPrivacy);
  const [isHidden, setIsHidden] = useState(isMoodHidden);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (p: { preset: MoodPreset; emoji: string; defaultText: string }) => {
    setSelectedPreset(p.preset);
    setCustomEmoji(p.emoji);
    setCustomText(p.defaultText);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mood: UserMood = {
        preset: selectedPreset,
        emoji: customEmoji,
        text: customText,
        updatedAt: Date.now(),
        scheduledReturnTime: scheduledReturn || undefined,
        autoReturnPreset: scheduledReturn ? 'Available' : undefined,
      };
      await onSaveMood(mood, privacy, isHidden);
      onClose();
    } catch (e) {
      console.error('Failed to save mood:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-900">
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Set Your Live Mood</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 overflow-y-auto space-y-5 flex-1">
            {/* Live Preview */}
            <div className="p-4 bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{customEmoji}</span>
                <div>
                  <h4 className="text-[10px] text-[#64748b] dark:text-neutral-400 font-bold uppercase tracking-wider live-mood-preview-title">LIVE PREVIEW</h4>
                  <p className="text-sm font-semibold text-[#0f172a] dark:text-white live-mood-preview-text">{customText}</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-200 dark:bg-neutral-800 text-[#0f172a] dark:text-neutral-200 rounded-full font-bold">
                {selectedPreset}
              </span>
            </div>

            {/* Custom Mood Text & Emoji */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#334155] dark:text-neutral-300">Custom Mood Details</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder="Emoji"
                  className="w-14 p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-center text-lg text-[#0f172a] dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="What are you doing?"
                  className="flex-1 p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder:text-[#64748b] dark:placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#334155] dark:text-neutral-300">Choose Preset Mood</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {MOOD_PRESETS.map((p) => {
                  const isSelected = selectedPreset === p.preset;
                  return (
                    <button
                      key={p.preset}
                      onClick={() => handleSelectPreset(p)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-100/80 dark:bg-indigo-600/20 border-indigo-500 text-[#0f172a] dark:text-white font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800/80 text-[#0f172a] dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 font-medium'
                      }`}
                    >
                      <span className="text-base">{p.emoji}</span>
                      <span className="truncate text-[#0f172a] dark:text-neutral-200">{p.preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule Auto-Return */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
              <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Schedule Mood Return Time (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={scheduledReturn}
                  onChange={(e) => setScheduledReturn(e.target.value)}
                  className="p-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
                <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                  Auto-reset to "Available" at this time (e.g. 08:00 AM)
                </span>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
              <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Who can see my live mood?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Everyone', 'Friends', 'Close Friends', 'Nobody'] as MoodPrivacy[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrivacy(p)}
                    className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                      privacy === p
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Hide Mood Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                {isHidden ? <EyeOff className="w-4 h-4 text-rose-500 dark:text-rose-400" /> : <Eye className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">Hide Mood Status Completely</span>
              </div>
              <button
                onClick={() => setIsHidden(!isHidden)}
                className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer ${
                  isHidden ? 'bg-rose-600' : 'bg-slate-300 dark:bg-neutral-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isHidden ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-2 bg-slate-50 dark:bg-neutral-950">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Live Mood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
