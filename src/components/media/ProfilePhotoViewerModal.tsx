import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfilePhotoViewerModal: React.FC = () => {
  const { activeProfilePhotoViewer, closeProfilePhotoViewer } = useApp();

  if (!activeProfilePhotoViewer) return null;

  const { url, name, username } = activeProfilePhotoViewer;

  return (
    <div
      onClick={closeProfilePhotoViewer}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none animate-fadeIn"
    >
      {/* Minimal Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/20 p-0.5 bg-black/40 overflow-hidden">
            <img
              src={url}
              alt={name || 'Profile'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-tight">
              <span>{name || 'Profile Photo'}</span>
              <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
            </h3>
            {username && (
              <p className="text-xs font-semibold text-[#ff2d60]">
                {username.startsWith('@') ? username : `@${username}`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={closeProfilePhotoViewer}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Full Screen Profile Photo Display */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center relative overflow-hidden p-6"
      >
        <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
          <img
            src={url}
            alt={name || 'Profile Photo'}
            referrerPolicy="no-referrer"
            draggable={false}
            className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full object-cover border-4 border-white/20 shadow-2xl ring-8 ring-black/40"
          />
        </div>
      </div>

      {/* Bottom Minimal Footer */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-4 flex justify-center z-20 shrink-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      >
        <span className="text-[11px] text-slate-400 font-medium">
          Profile Photo
        </span>
      </div>
    </div>
  );
};
