import React, { useState } from 'react';
import { X, Image as ImageIcon, Camera, Sparkles, Send, Globe, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddStoryModalProps {
  onClose: () => void;
}

const SAMPLE_STORIES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
];

export const AddStoryModal: React.FC<AddStoryModalProps> = ({ onClose }) => {
  const { addStory } = useApp();
  const [selectedImage, setSelectedImage] = useState(SAMPLE_STORIES[0]);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'close_friends'>('public');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const handlePostStory = () => {
    if (selectedImage) {
      addStory(selectedImage, caption, 'image', privacy);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-slate-100 relative flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff2d60]" /> Create Story
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Image Preview */}
        <div className="relative h-56 w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
          <img
            src={selectedImage}
            alt="Preview"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {caption && (
            <div className="absolute bottom-3 left-3 right-3 text-center">
              <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                {caption}
              </span>
            </div>
          )}
        </div>

        {/* Privacy Audience Selector */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Who Can View This Story?
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrivacy('public')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                privacy === 'public'
                  ? 'bg-[#ff2d60]/20 border-[#ff2d60] text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Public</span>
            </button>

            <button
              type="button"
              onClick={() => setPrivacy('close_friends')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                privacy === 'close_friends'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Close Friends</span>
            </button>
          </div>
        </div>

        {/* Preset Gallery Picker */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Choose Photo or Gallery
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <label className="w-14 h-14 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-[#ff2d60] flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-white shrink-0">
              <ImageIcon className="w-5 h-5" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {SAMPLE_STORIES.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Sample ${i}`}
                referrerPolicy="no-referrer"
                onClick={() => setSelectedImage(url)}
                className={`w-14 h-14 rounded-xl object-cover cursor-pointer shrink-0 border-2 transition-all ${
                  selectedImage === url ? 'border-[#ff2d60] scale-105 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Caption Input */}
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          className="w-full bg-[#0a0b0e] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff2d60]"
        />

        {/* Share Button */}
        <button
          onClick={handlePostStory}
          className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
        >
          <Send className="w-4 h-4" />
          <span>Share to My Story ({privacy === 'public' ? 'Public' : 'Close Friends'})</span>
        </button>
      </div>
    </div>
  );
};

