import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, X, Pause, Play } from 'lucide-react';
import { backgroundReelUploader, BackgroundUploadState } from '../../utils/backgroundReelUploadManager';

export const ReelUploadToast: React.FC = () => {
  const [tasks, setTasks] = useState<BackgroundUploadState[]>([]);

  useEffect(() => {
    return backgroundReelUploader.subscribe((allTasks) => {
      setTasks(allTasks);
    });
  }, []);

  if (tasks.length === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-[390px] px-3 pointer-events-none animate-slide-down">
      {tasks.map((task) => {
        const isFailed = task.stage === 'failed';
        const isReady = task.stage === 'ready' || task.isComplete;
        const isPaused = task.stage === 'paused';
        const progressVal = isReady ? 100 : Math.round(task.progressPercent ?? task.progress ?? 0);

        return (
          <div
            key={task.postId}
            className="pointer-events-auto flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl transition-all"
          >
            {/* Thumbnail */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/10">
              {task.thumbnailUrl ? (
                <img
                  src={task.thumbnailUrl}
                  alt="Uploading Reel"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/60">
                  Reel
                </div>
              )}
              {!isReady && !isFailed && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-[#ff2d60] animate-spin" />
                </div>
              )}
            </div>

            {/* Info & Progress */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold truncate max-w-[170px]">
                  {isReady
                    ? 'Reel Live & Ready! 🚀'
                    : isFailed
                    ? 'Upload failed'
                    : isPaused
                    ? 'Upload paused'
                    : 'Posting Reel...'}
                </span>
                <span className="text-[11px] font-mono text-[#ff2d60] font-bold">
                  {progressVal}%
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isFailed
                      ? 'bg-rose-500'
                      : isReady
                      ? 'bg-emerald-400'
                      : 'bg-gradient-to-r from-[#ff2d60] to-purple-500'
                  }`}
                  style={{ width: `${Math.max(6, progressVal)}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {!isReady && !isFailed && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPaused) {
                      backgroundReelUploader.resume(task.postId);
                    } else {
                      backgroundReelUploader.pause(task.postId);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-3 h-3 ml-0.5 fill-white" /> : <Pause className="w-3 h-3" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => backgroundReelUploader.cancel(task.postId)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                title="Dismiss / Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
