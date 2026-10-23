import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteReelConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
  isDeleting?: boolean;
}

export const DeleteReelConfirmationModal: React.FC<DeleteReelConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  isDeleting = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Reset to step 1 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div
        onClick={!isDeleting ? onClose : undefined}
        className="absolute inset-0 cursor-pointer"
      />

      <div className="relative w-full max-w-sm bg-[#121420] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center text-white animate-scaleUp">
        {/* Close Button */}
        {!isDeleting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {step === 1 ? (
          /* Confirmation 1: 'Delete Reel?' / 'This will remove this Reel from GotU.' */
          <>
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black tracking-tight text-white mb-1.5">
              Delete Reel?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed max-w-xs">
              This will remove this Reel from GotU.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-98"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Confirmation 2: 'Permanently delete this Reel?' / 'This action cannot be undone and the video will be deleted.' */
          <>
            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-lg animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black tracking-tight text-white mb-1.5">
              Permanently delete this Reel?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed max-w-xs">
              This action cannot be undone and the video will be deleted.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirmDelete}
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-98"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Permanently...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
