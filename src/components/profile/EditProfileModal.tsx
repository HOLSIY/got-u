import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Trash2, Check, User, Phone, Calendar, Info, Shield, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ImageCropperModal } from '../media/ImageCropperModal';
import { uploadToCloudStorage } from '../../utils/cloudStorage';
import { formatUsername, cleanUsername } from '../../utils/constants';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { currentUser, updateProfile } = useApp();

  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [username, setUsername] = useState(cleanUsername(currentUser.username) || '');
  const [phone, setPhone] = useState(currentUser.phone || '+1 555-019-2831');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Male');
  const [dob, setDob] = useState(currentUser.dob || '1998-05-14');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || '');

  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cropping State
  const [croppingImage, setCroppingImage] = useState<{
    src: string | File;
    type: 'avatar' | 'cover';
    aspectRatio: number;
    cropShape: 'round' | 'rect';
    title: string;
  } | null>(null);

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCroppingImage({
        src: file,
        type: 'avatar',
        aspectRatio: 1,
        cropShape: 'round',
        title: 'Crop Profile Avatar',
      });
      setShowPhotoOptions(false);
    }
    e.target.value = '';
  };

  const handleCoverFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCroppingImage({
        src: file,
        type: 'cover',
        aspectRatio: 2.5,
        cropShape: 'rect',
        title: 'Crop Cover Photo',
      });
    }
    e.target.value = '';
  };

  const handleCropConfirmed = async (blob: Blob, dataUrl: string) => {
    if (!croppingImage) return;
    const cropType = croppingImage.type;
    setCroppingImage(null);
    setIsUploading(true);

    try {
      if (cropType === 'avatar') {
        setAvatarUrl(dataUrl); // Optimistic UI update
        const uploadRes = await uploadToCloudStorage(
          blob,
          `users/${currentUser.id}/avatar_${Date.now()}.jpg`,
          { contentType: 'image/jpeg', compressType: 'avatar' }
        );
        if (uploadRes.success && uploadRes.url) {
          setAvatarUrl(uploadRes.url);
        }
      } else if (cropType === 'cover') {
        setCoverUrl(dataUrl); // Optimistic UI update
        const uploadRes = await uploadToCloudStorage(
          blob,
          `users/${currentUser.id}/cover_${Date.now()}.jpg`,
          { contentType: 'image/jpeg', compressType: 'cover' }
        );
        if (uploadRes.success && uploadRes.url) {
          setCoverUrl(uploadRes.url);
        }
      }
    } catch (err) {
      console.warn('Storage upload notice in EditProfileModal:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600');
    setShowPhotoOptions(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const normalizedUsername = formatUsername(username);
      await updateProfile({
        fullName: fullName.trim() || 'Nexus User',
        username: normalizedUsername,
        phone: phone.trim(),
        bio: bio.trim(),
        gender: gender === 'Female' ? 'Female' : 'Male',
        dob,
        avatarUrl,
        coverUrl,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-slate-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#ff2d60]" />
            <span>Edit Profile</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 no-scrollbar">
          {/* Profile Photo Picker */}
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="relative group cursor-pointer" onClick={() => setShowPhotoOptions(!showPhotoOptions)}>
              <img
                src={avatarUrl}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-2 border-[#ff2d60] shadow-xl group-hover:brightness-75 transition-all"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-6 h-6" />
              </div>
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#ff2d60] text-white shadow-md">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </div>

            {showPhotoOptions && (
              <div className="mt-3 p-3 bg-[#1c1e2b] border border-white/10 rounded-2xl flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Gallery</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="py-1.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full h-11 px-4 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
            />
          </div>

          {/* Bio / About */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Bio / About</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full p-3 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60] resize-none"
            />
          </div>

          {/* Cover Photo Customization */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Profile Cover Background</label>
            <div className="relative h-24 w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#ff2d60]/30 to-[#00D4FF]/30 border border-white/10 group">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Default Gradient Cover</div>
              )}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-bold transition-opacity cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#ff2d60]" />
                <span>Upload Cover Photo</span>
              </button>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFileSelected} className="hidden" />
          </div>

          {/* Gender & DOB Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#0a0b0e] border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff2d60]"
              />
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-3 flex items-center gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] text-xs font-bold text-white shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isUploading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cropper Modal */}
      {croppingImage && (
        <ImageCropperModal
          imageSrc={croppingImage.src}
          aspectRatio={croppingImage.aspectRatio}
          cropShape={croppingImage.cropShape}
          title={croppingImage.title}
          onCancel={() => setCroppingImage(null)}
          onConfirm={handleCropConfirmed}
        />
      )}
    </div>
  );
};
