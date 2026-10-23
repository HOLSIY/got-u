import React, { useState } from 'react';
import { X, Edit3, MapPin, Quote, Loader2, AlertCircle } from 'lucide-react';
import { Post } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onPostUpdated?: (updated: Partial<Post>) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onPostUpdated }) => {
  const [caption, setCaption] = useState(post.caption || '');
  const [quoteText, setQuoteText] = useState(post.quoteText || '');
  const [quoteAuthor, setQuoteAuthor] = useState(post.quoteAuthor || '');
  const [locationName, setLocationName] = useState(post.locationName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Content safety check (safe timeout with fallback)
      try {
        const modCtrl = new AbortController();
        const timeoutId = setTimeout(() => modCtrl.abort(), 5000);

        const modRes = await fetch('/api/feed/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: caption,
            quoteText,
            quoteAuthor,
            locationName,
          }),
          signal: modCtrl.signal,
        });
        clearTimeout(timeoutId);

        if (modRes.ok) {
          const modResult = await modRes.json();
          if (modResult && modResult.isSafe === false) {
            setError(modResult.reason || 'Edited content violates safety policies.');
            setIsSaving(false);
            return;
          }
        }
      } catch (modErr) {
        console.warn('Edit moderation notice:', modErr);
      }

      const postRef = doc(db, 'posts', post.id);
      const updateData: Partial<Post> = {
        caption: caption.trim(),
        quoteText: quoteText.trim(),
        quoteAuthor: quoteAuthor.trim(),
        locationName: locationName.trim(),
      };

      await updateDoc(postRef, updateData).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
      });

      if (onPostUpdated) {
        onPostUpdated(updateData);
      }
      onClose();
    } catch (err: any) {
      console.warn('Post edit notice:', err?.message || err);
      setError('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#12141c] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff2d60]/10 text-[#ff2d60] flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Post</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your post caption or details</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {post.quoteText !== undefined && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-[#ff2d60]" />
                <span>Quote Text</span>
              </label>
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                rows={2}
                placeholder="Enter inspirational quote..."
                className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ff2d60]"
              />

              <input
                type="text"
                value={quoteAuthor}
                onChange={(e) => setQuoteAuthor(e.target.value)}
                placeholder="Quote Author (optional)"
                className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ff2d60]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="What's on your mind?"
              className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ff2d60]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#ff2d60]" />
              <span>Location</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Tokyo, Japan (optional)"
              className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ff2d60]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff2d60] to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
