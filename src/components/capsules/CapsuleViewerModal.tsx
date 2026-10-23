import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Unlock, Clock, Sparkles, Plus, Calendar, ShieldCheck, Gift, Heart, FileText, Camera } from 'lucide-react';
import { MemoryCapsule, User } from '../../types';
import { CreateCapsuleModal } from './CreateCapsuleModal';

interface CapsuleViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  availableUsers: User[];
  capsules: MemoryCapsule[];
  onCreateCapsule: (capsule: Omit<MemoryCapsule, 'id' | 'createdAt' | 'isUnlocked'>) => Promise<void>;
  onUnlockCapsule: (capsuleId: string) => Promise<void>;
}

export const CapsuleViewerModal: React.FC<CapsuleViewerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableUsers,
  capsules,
  onCreateCapsule,
  onUnlockCapsule,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<MemoryCapsule | null>(null);
  const [isUnboxing, setIsUnboxing] = useState(false);

  if (!isOpen) return null;

  const handleOpenCapsule = async (capsule: MemoryCapsule) => {
    const isReady = Date.now() >= capsule.unlockTimestamp;
    if (!isReady && !capsule.isUnlocked) return;

    if (!capsule.isUnlocked && isReady) {
      setIsUnboxing(true);
      setSelectedCapsule(capsule);
      setTimeout(async () => {
        await onUnlockCapsule(capsule.id);
        setIsUnboxing(false);
      }, 2000);
    } else {
      setSelectedCapsule(capsule);
    }
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gradient-to-b dark:from-[#13111c] dark:via-[#0c0a12] dark:to-[#08060d] border border-amber-500/30 dark:border-amber-500/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-amber-500/10 dark:shadow-[0_0_50px_rgba(118,45,250,0.2)] flex flex-col h-[85vh] text-slate-900 dark:text-white relative"
          >
            {/* Top Vault Glow Header */}
            <div className="p-5 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-amber-100/80 via-purple-100/80 to-indigo-100/80 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-purple-600/30 to-indigo-600/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-lg shadow-amber-500/10">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0f172a] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-amber-200 dark:via-purple-200 dark:to-indigo-100 flex items-center gap-2 tracking-wide vault-title">
                    MEMORY CAPSULE VAULT
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-amber-200/70 font-medium vault-subtitle">Encrypted time-locked vault & future memories</p>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10">
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all border border-amber-300/30 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Deposit Capsule
                </button>

                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body List */}
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
              {capsules.length > 0 ? (
                capsules.map((capsule) => {
                  const isReady = Date.now() >= capsule.unlockTimestamp;
                  const isUnlocked = capsule.isUnlocked || isReady;
                  const unlockDateStr = new Date(capsule.unlockTimestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <motion.div
                      key={capsule.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOpenCapsule(capsule)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden group ${
                        isUnlocked
                          ? 'bg-gradient-to-r from-amber-50/90 via-purple-50/90 to-indigo-50/90 dark:from-amber-950/30 dark:via-purple-950/40 dark:to-indigo-950/30 border-amber-300 dark:border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/5 dark:shadow-purple-950/30'
                          : 'bg-slate-50 dark:bg-neutral-950/80 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 ${
                            isUnlocked
                              ? 'bg-gradient-to-tr from-amber-100 to-purple-100 dark:from-amber-500/30 dark:to-purple-600/30 border-amber-400 text-amber-700 dark:text-amber-300 shadow-xs'
                              : 'bg-slate-200 dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-400'
                          }`}
                        >
                          {isUnlocked ? <Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 dark:text-amber-300" /> : <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-neutral-400" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#0f172a] dark:text-white truncate max-w-[180px] sm:max-w-none capsule-title">
                              {capsule.title}
                            </h4>
                            {isUnlocked ? (
                              <span className="text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 uppercase font-black tracking-wider flex items-center gap-1 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" /> Ready
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300/80 border border-amber-300 dark:border-amber-500/20 uppercase font-black tracking-wider flex items-center gap-1 shrink-0">
                                <Clock className="w-2.5 h-2.5" /> Vault Locked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#334155] dark:text-neutral-400 mt-0.5 flex items-center gap-1 truncate capsule-sender-text">
                            <span className="text-slate-500 dark:text-neutral-500">From</span>
                            <span className="text-[#334155] dark:text-amber-200 font-bold truncate">{capsule.senderName}</span>
                            <span className="text-slate-500 dark:text-neutral-500">to</span>
                            <span className="text-[#334155] dark:text-indigo-200 font-bold truncate">{capsule.recipientName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-200 dark:border-white/10 sm:border-t-0 shrink-0">
                        <span className="text-[9px] text-[#475569] dark:text-amber-200/60 uppercase font-black tracking-widest whitespace-nowrap capsule-unlock-label">UNLOCKS ON</span>
                        <span className="text-xs font-mono font-semibold text-[#0f172a] dark:text-amber-300 whitespace-nowrap capsule-unlock-date">{unlockDateStr}</span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-16 text-center text-slate-500 dark:text-neutral-500 space-y-3 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-neutral-300">Vault Currently Empty</h4>
                  <p className="text-xs text-slate-600 dark:text-neutral-500 max-w-xs leading-relaxed">
                    Deposit a secret time-locked letter, photo, or audio memory for a friend. It will stay sealed until your chosen unlock date!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Selected Capsule Viewer Modal / Unboxing */}
      {selectedCapsule && (
        <AnimatePresence>
          <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-purple-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white relative overflow-hidden"
            >
              {isUnboxing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center animate-spin text-white shadow-xl shadow-purple-500/30">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-purple-300 dark:to-amber-300">
                    Unsealing Futuristic Memory Capsule...
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-neutral-400">Decrypting time-locked message</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedCapsule.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedCapsule(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-neutral-400">
                        <span>From: <strong className="text-slate-900 dark:text-white">{selectedCapsule.senderName}</strong></span>
                        <span>Type: <strong className="text-purple-600 dark:text-purple-400 capitalize">{selectedCapsule.contentType}</strong></span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap pt-2 border-t border-slate-200 dark:border-neutral-800">
                        {selectedCapsule.content}
                      </p>
                    </div>

                    {selectedCapsule.mediaUrls?.[0] && (
                      <img src={selectedCapsule.mediaUrls[0]} alt="" className="w-full max-h-60 object-cover rounded-2xl border border-slate-200 dark:border-neutral-800" />
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedCapsule(null)}
                      className="px-5 py-2 bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-white font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Close Vault
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* Create Modal */}
      <CreateCapsuleModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        currentUser={currentUser}
        availableUsers={Array.isArray(availableUsers) ? availableUsers : []}
        onCreateCapsule={onCreateCapsule}
      />
    </>
  );
};
