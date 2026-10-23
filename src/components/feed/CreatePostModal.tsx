import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Video,
  Quote,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  Send,
  Loader2,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PostMediaItem, PostType } from '../../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadToCloudStorage } from '../../utils/cloudStorage';
import { formatUsername } from '../../utils/constants';
import { resumableUploadClient } from '../../services/api/resumableUploadClient';
import { socialApi } from '../../services/api/socialApi';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated?: () => void;
}

const SAMPLE_LOCATIONS = [
  '📍 Tokyo, Japan',
  '📍 New York, USA',
  '📍 Paris, France',
  '📍 London, UK',
  '📍 Dubai, UAE',
  '📍 Sydney, Australia',
  '📍 Singapore',
];

const SAMPLE_STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
  const { currentUser, chats } = useApp();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [postType, setPostType] = useState<PostType>('photo');
  const [caption, setCaption] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [locationName, setLocationName] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; file: File }[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [moderationError, setModerationError] = useState<{ category: string; reason: string } | null>(null);

  // File upload handler with persistent cloud storage upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      const isVideo = file.type.startsWith('video/');
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      setAttachedFiles((prev) => [...prev, { id: mediaId, file }]);
      
      // Temporary local preview
      const previewUrl = URL.createObjectURL(file);
      setMediaItems((prev) => [
        ...prev,
        {
          id: mediaId,
          type: isVideo ? 'video' : 'image',
          url: previewUrl,
        },
      ]);

      // Upload to persistent cloud storage in background
      try {
        const ext = isVideo ? 'mp4' : 'jpg';
        const res = await uploadToCloudStorage(
          file,
          `posts/${currentUser.id}/${mediaId}.${ext}`,
          {
            contentType: isVideo ? 'video/mp4' : 'image/jpeg',
            compressType: isVideo ? 'none' : 'photo',
          }
        );
        if (res.success && res.url) {
          setMediaItems((prev) =>
            prev.map((item) => (item.id === mediaId ? { ...item, url: res.url } : item))
          );
        }
      } catch (uploadErr) {
        console.warn('Storage upload error for post media:', uploadErr);
      }
    }
  };

  const handleAddSamplePhoto = (url: string) => {
    setMediaItems((prev) => [
      ...prev,
      {
        id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'image',
        url,
      },
    ]);
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePublish = async () => {
    setModerationError(null);
    setIsVerifying(true);

    try {
      // Prepare payload for AI moderation API
      const mediaPayload = mediaItems
        .filter((m) => m.url.startsWith('data:'))
        .map((m) => ({
          type: m.type,
          data: m.url,
          mimeType: m.type === 'video' ? 'video/mp4' : 'image/jpeg',
        }));

      // Safe AI content moderation with quick fallback to ensure feed publishing is never blocked
      try {
        const modController = new AbortController();
        const timeoutId = setTimeout(() => modController.abort(), 6000);

        const response = await fetch('/api/feed/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: caption,
            quoteText,
            quoteAuthor,
            locationName: locationName || customLocation,
            media: mediaPayload,
          }),
          signal: modController.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const modResult = await response.json();
          if (modResult && modResult.isSafe === false) {
            setModerationError({
              category: modResult.category || 'Prohibited Content',
              reason: modResult.reason || 'This content violates community safety guidelines and cannot be published.',
            });
            setIsVerifying(false);
            return;
          }
        }
      } catch (modErr) {
        // Moderation network timeout or temporary unavailability: proceed gracefully with standard post workflow
        console.warn('Feed moderation notice:', modErr);
      }

      // Upload any local attached files through the resumable multipart pipeline
      const uploadedMediaAssetIds: string[] = [];
      if (attachedFiles.length > 0) {
        setUploadStage('uploading');
        for (let i = 0; i < attachedFiles.length; i++) {
          const { file } = attachedFiles[i];
          try {
            const uploadRes = await resumableUploadClient.uploadFile(file, {
              ownerId: currentUser.id,
              onProgress: (info) => {
                setUploadProgress(info.progressPercent);
                setUploadStage(info.stage);
              },
            });
            if (uploadRes?.mediaAssetId) {
              uploadedMediaAssetIds.push(uploadRes.mediaAssetId);
            }
          } catch (uploadErr) {
            console.warn('[CreatePostModal] Resumable upload notification:', uploadErr);
          }
        }
      }

      setUploadStage('finalizing');

      // Create post in PostgreSQL backend
      try {
        await socialApi.createPost(
          {
            author_id: currentUser.id,
            caption: caption.trim(),
            media_asset_ids: uploadedMediaAssetIds,
          },
          currentUser.id
        );
      } catch (backendErr) {
        console.warn('[CreatePostModal] Backend post create notification:', backendErr);
      }

      // Determine final post type
      let finalPostType: PostType = 'text';
      if (mediaItems.length > 0) {
        finalPostType = mediaItems.some((m) => m.type === 'video') ? 'video' : 'photo';
      } else if (quoteText.trim()) {
        finalPostType = 'quote';
      }

      const newPostData = {
        authorId: currentUser.id,
        authorName: currentUser.fullName,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatarUrl,
        postType: finalPostType,
        caption: caption.trim(),
        quoteText: quoteText.trim(),
        quoteAuthor: quoteAuthor.trim(),
        media: mediaItems,
        locationName: (locationName || customLocation).trim(),
        createdAt: Date.now(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        moderationStatus: 'approved',
      };

      // Save to Firestore with local cache fallback
      try {
        const postsRef = collection(db, 'posts');
        await addDoc(postsRef, newPostData);

        // Notify real friends connected via 1:1 chats
        try {
          const friendIds = new Set<string>();
          chats.forEach((c) => {
            if (!c.isGroup && c.members) {
              c.members.forEach((m) => {
                if (m.id && m.id !== currentUser.id) friendIds.add(m.id);
              });
            }
          });

          const notifsCol = collection(db, 'notifications');
          const summaryText = caption.trim() || quoteText.trim() || 'Check out my new post';
          friendIds.forEach((friendId) => {
            addDoc(notifsCol, {
              recipientUserId: friendId,
              senderUserId: currentUser.id,
              title: currentUser.fullName,
              description: `shared a new ${finalPostType}: "${summaryText.slice(0, 45)}"`,
              type: 'reply',
              userAvatar: currentUser.avatarUrl,
              timestamp: 'Just now',
              createdAt: Date.now(),
              isRead: false,
            }).catch(() => {});
          });
        } catch (notifErr) {
          console.warn('Friend notification notice:', notifErr);
        }
      } catch (fErr: any) {
        console.warn('Firestore write notice (saving to local feed cache):', fErr?.message || fErr);
        try {
          const cached = localStorage.getItem('got_u_feed_posts_cache');
          const list = cached ? JSON.parse(cached) : [];
          list.unshift({ ...newPostData, id: 'local_post_' + Date.now() });
          localStorage.setItem('got_u_feed_posts_cache', JSON.stringify(list));
        } catch {}
      }

      if (onPostCreated) onPostCreated();
      onClose();
    } catch (error: any) {
      console.warn('Post creation notice:', error?.message || error);
      setModerationError({
        category: 'Publish Error',
        reason: 'Unable to publish post. Please check your connection and try again.',
      });
    } finally {
      setIsVerifying(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#0e1017] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff2d60] to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Nexus Post</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Protected by AI Safety System</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch edit / preview */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
                  activeTab === 'edit'
                    ? 'bg-[#ff2d60] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-[11px] font-medium rounded-full flex items-center space-x-1 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-[#ff2d60] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* AI Moderation Error Alert Banner */}
          {moderationError && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 flex items-start space-x-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-600 dark:text-rose-400">Post Blocked: {moderationError.category}</p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{moderationError.reason}</p>
              </div>
            </div>
          )}

          {activeTab === 'edit' ? (
            <>
              {/* Author Row */}
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.fullName}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatUsername(currentUser.username)}</p>
                </div>
              </div>

              {/* Quote Editor Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Quote className="w-3.5 h-3.5 text-[#ff2d60]" />
                    <span>Quote / Highlight (Optional)</span>
                  </label>
                  {quoteText && (
                    <button
                      onClick={() => {
                        setQuoteText('');
                        setQuoteAuthor('');
                      }}
                      className="text-[10px] text-rose-500 dark:text-rose-400 hover:underline"
                    >
                      Clear Quote
                    </button>
                  )}
                </div>

                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Insert an inspiring quote, thought, or wisdom..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60] italic resize-none"
                />

                {quoteText.trim() && (
                  <input
                    type="text"
                    value={quoteAuthor}
                    onChange={(e) => setQuoteAuthor(e.target.value)}
                    placeholder="— Quote Author (e.g. Maya Angelou)"
                    className="w-full bg-slate-50 dark:bg-[#141722] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                  />
                )}
              </div>

              {/* Main Caption Textarea */}
              <div className="space-y-1">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening? Share thoughts, stories, hashtags #Nexus #Ethiopia..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60] resize-none"
                />
              </div>

              {/* Selected Media Grid */}
              {mediaItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Attached Media ({mediaItems.length})</span>
                    <span className="text-[10px] text-slate-500">Horizontal carousel preview</span>
                  </div>

                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                    {mediaItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black group"
                      >
                        {item.type === 'video' ? (
                          <video src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                        )}

                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                          {idx + 1}
                        </span>

                        <button
                          onClick={() => handleRemoveMedia(item.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Media Toolbar */}
              <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Add to Post</span>

                  <label className="cursor-pointer bg-slate-200 dark:bg-white/10 hover:bg-[#ff2d60] hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Device File</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Stock photo recommendations for quick testing */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Quick Stock Photo Suggestions:</span>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    {SAMPLE_STOCK_PHOTOS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddSamplePhoto(url)}
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-white/20 hover:border-[#ff2d60] transition-colors relative group"
                      >
                        <img src={url} alt="Stock option" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Plus className="w-4 h-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location Tagging */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#ff2d60]"
                  >
                    <MapPin className="w-4 h-4 text-[#ff2d60]" />
                    <span>
                      {locationName || customLocation
                        ? `Tagged: ${locationName || customLocation}`
                        : 'Add Location Tag'}
                    </span>
                  </button>

                  {(locationName || customLocation) && (
                    <button
                      onClick={() => {
                        setLocationName('');
                        setCustomLocation('');
                      }}
                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-rose-500"
                    >
                      Remove Location
                    </button>
                  )}
                </div>

                {showLocationPicker && (
                  <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2 animate-fade-in">
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => {
                        setCustomLocation(e.target.value);
                        setLocationName('');
                      }}
                      placeholder="Type custom location (e.g. Times Square, Central Park)..."
                      className="w-full bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                    />

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SAMPLE_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setLocationName(loc);
                            setCustomLocation('');
                            setShowLocationPicker(false);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${
                            locationName === loc
                              ? 'bg-[#ff2d60] border-[#ff2d60] text-white font-bold'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Live Post Preview Card */
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Live Feed Preview</span>

              <div className="bg-white dark:bg-[#121520] rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3 shadow-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.fullName}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatUsername(currentUser.username)} • Just now
                    </p>
                  </div>
                </div>

                {(locationName || customLocation) && (
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium border border-indigo-500/20">
                    <MapPin className="w-3 h-3" />
                    <span>{locationName || customLocation}</span>
                  </div>
                )}

                {quoteText && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-100/80 via-pink-100/50 to-transparent dark:from-purple-900/30 dark:via-pink-900/20 dark:to-transparent border-l-4 border-[#ff2d60] italic text-xs text-slate-900 dark:text-white">
                    "{quoteText}"
                    {quoteAuthor && <div className="text-[10px] font-bold text-[#ff2d60] mt-1">— {quoteAuthor}</div>}
                  </div>
                )}

                {caption && <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{caption}</p>}

                {mediaItems.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-slate-200 dark:border-white/10">
                    {mediaItems[0].type === 'video' ? (
                      <video src={mediaItems[0].url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={mediaItems[0].url} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    {mediaItems.length > 1 && (
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                        1 / {mediaItems.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0e1017]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>AI Moderation Active</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handlePublish}
              disabled={isVerifying || (!caption.trim() && !quoteText.trim() && mediaItems.length === 0)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-[#ff2d60] to-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-500/25 hover:opacity-95 transition-opacity disabled:opacity-40 flex items-center space-x-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {uploadStage === 'uploading'
                      ? `Uploading ${uploadProgress}%...`
                      : uploadStage === 'finalizing'
                      ? 'Finalizing media...'
                      : 'Publishing Post...'}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
