import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Heart, MessageSquare, Phone, Camera, Calendar, Trophy, Share2, Volume2, VolumeX, ArrowRight, ArrowLeft } from 'lucide-react';
import { User, FriendshipStory2026 } from '../../types';

interface FriendshipWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  friendUser: User;
  storyData: FriendshipStory2026;
}

export const FriendshipWrappedModal: React.FC<FriendshipWrappedModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friendUser,
  storyData,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const slides = [
    // Slide 0: Cover
    {
      bg: 'from-purple-900 via-indigo-900 to-black',
      content: (
        <div className="flex flex-col items-center text-center gap-6 my-auto">
          <div className="flex items-center gap-3">
            <img src={currentUser.avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-purple-500 shadow-xl object-cover" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg animate-pulse">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <img src={friendUser.avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-indigo-500 shadow-xl object-cover" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold px-3 py-1 bg-white/10 rounded-full text-purple-300 border border-white/20">
              Got U Wrapped 2026
            </span>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
              {currentUser.fullName} & {friendUser.fullName}
            </h2>
            <p className="text-sm text-neutral-300">Your Friendship Story & Milestones</p>
          </div>
        </div>
      ),
    },
    // Slide 1: Messages & Stats
    {
      bg: 'from-blue-900 via-indigo-950 to-black',
      content: (
        <div className="flex flex-col items-center text-center gap-6 my-auto">
          <MessageSquare className="w-12 h-12 text-blue-400 animate-bounce" />
          <h3 className="text-xl font-bold text-white">Words That Connected Us</h3>
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 space-y-2 w-full max-w-sm">
            <span className="text-5xl font-black text-blue-300">{storyData.totalMessages.toLocaleString()}</span>
            <p className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">Total Messages Exchanged</p>
          </div>
          <p className="text-xs text-neutral-400">
            Longest non-stop conversation: <strong className="text-white">{storyData.longestConversationMinutes} minutes</strong>
          </p>
        </div>
      ),
    },
    // Slide 2: Calls & Late Nights
    {
      bg: 'from-rose-900 via-purple-950 to-black',
      content: (
        <div className="flex flex-col items-center text-center gap-6 my-auto">
          <Phone className="w-12 h-12 text-rose-400 animate-pulse" />
          <h3 className="text-xl font-bold text-white">Voice & Late Night Talks</h3>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <span className="text-3xl font-bold text-rose-300">{storyData.voiceCallsCount + storyData.videoCallsCount}</span>
              <span className="block text-[11px] text-neutral-300 font-medium">Calls Completed</span>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <span className="text-3xl font-bold text-amber-300">{storyData.lateNightChatsCount}</span>
              <span className="block text-[11px] text-neutral-300 font-medium">Late Night Chats 🌙</span>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 3: Media Shared
    {
      bg: 'from-emerald-900 via-teal-950 to-black',
      content: (
        <div className="flex flex-col items-center text-center gap-6 my-auto">
          <Camera className="w-12 h-12 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">Captured Memories</h3>
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 space-y-2 w-full max-w-sm">
            <span className="text-4xl font-black text-emerald-300">{storyData.photosShared + storyData.videosShared}</span>
            <p className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">Photos & Videos Shared</p>
          </div>
          <div className="text-xs text-neutral-300">
            Favorite Emoji Used: <span className="text-2xl">{storyData.favoriteEmoji}</span>
          </div>
        </div>
      ),
    },
    // Slide 4: Growth & Finale
    {
      bg: 'from-amber-900 via-purple-900 to-black',
      content: (
        <div className="flex flex-col items-center text-center gap-6 my-auto">
          <Trophy className="w-12 h-12 text-amber-400" />
          <h3 className="text-2xl font-bold text-white">Friendship Growth Score</h3>
          <div className="p-6 bg-gradient-to-r from-amber-500/20 to-purple-500/20 backdrop-blur-md rounded-3xl border border-amber-500/30 space-y-2 w-full max-w-sm">
            <span className="text-6xl font-black text-amber-300">+{storyData.relationshipGrowthPct}%</span>
            <p className="text-xs text-neutral-200 font-bold uppercase tracking-wider">Stronger Friendship in 2026</p>
          </div>
          <div className="space-y-1 text-xs text-neutral-300">
            {storyData.funFacts.map((fact, i) => (
              <p key={i}>✨ {fact}</p>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`relative w-full max-w-md h-[85vh] rounded-3xl bg-gradient-to-b ${slides[currentSlide].bg} border border-white/20 shadow-2xl flex flex-col justify-between p-6 overflow-hidden text-white`}
        >
          {/* Top Bar with Progress Lines */}
          <div className="flex items-center gap-1 z-20">
            {slides.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    index <= currentSlide ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-10 right-6 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Slide Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-center items-center py-6 z-10"
            >
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between z-20 pt-4 border-t border-white/10">
            <button
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="text-xs text-neutral-400 font-mono">
              {currentSlide + 1} / {slides.length}
            </span>

            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                className="p-2.5 rounded-full bg-white text-black font-semibold hover:bg-neutral-200"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg"
              >
                Done
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
