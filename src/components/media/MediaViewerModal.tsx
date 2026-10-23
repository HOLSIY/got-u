import React from 'react';
import { X, Download, Share2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MediaViewerModal: React.FC = () => {
  const { activeMediaViewer, closeMediaViewer } = useApp();

  if (!activeMediaViewer) return null;

  return (
    <div
      onClick={closeMediaViewer}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4"
    >
      {/* Top Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between text-white z-10"
      >
        <span className="text-xs font-bold tracking-wider text-slate-300">
          {activeMediaViewer.title || 'Shared Media'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Media saved to gallery!')}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={closeMediaViewer}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="flex-1 flex items-center justify-center p-2">
        <img
          src={activeMediaViewer.url}
          alt="Media Fullscreen"
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 pb-2">
        got u HD Media Viewer
      </div>
    </div>
  );
};
