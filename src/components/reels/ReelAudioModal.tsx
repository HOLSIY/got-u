import React from 'react';
import { Music, Disc, Volume2, X, Play, Share2, Sparkles } from 'lucide-react';
import { Post } from '../../types';

interface ReelAudioModalProps {
  post: Post;
  onClose: () => void;
}

export const ReelAudioModal: React.FC<ReelAudioModalProps> = ({ post, onClose }) => {
  const audioTitle = post.caption?.includes('Music')
    ? 'Midnight Horizons • Lofi Chillhop'
    : `Original Audio - ${post.authorName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
      />

      <div className="relative w-full max-w-md bg-white dark:bg-[#12141e] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-white/10 p-5 shadow-2xl z-10 text-slate-900 dark:text-white flex flex-col gap-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff2d60]/10 text-[#ff2d60] flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black">Audio Track</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">got u Audio Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Card */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md shrink-0 bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center">
            <Disc className="w-8 h-8 text-white/90 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold truncate text-slate-900 dark:text-white">
              {audioTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              by @{post.authorUsername}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                Trending Sound
              </span>
              <span className="text-[10px] text-slate-400">
                1.4K Reels
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              alert('Sound saved to your audio library! You can use it in your next post.');
              onClose();
            }}
            className="flex-1 h-11 rounded-full bg-gradient-to-r from-[#ff2d60] to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Use this sound</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert('Audio link copied to clipboard!');
            }}
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Share Sound"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
