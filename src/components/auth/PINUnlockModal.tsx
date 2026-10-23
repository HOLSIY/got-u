import React, { useState } from 'react';
import { Lock, Delete, X, AlertCircle } from 'lucide-react';

interface PINUnlockModalProps {
  chatTitle: string;
  onUnlock: (pin: string) => boolean;
  onClose: () => void;
}

export const PINUnlockModal: React.FC<PINUnlockModalProps> = ({ chatTitle, onUnlock, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePressNumber = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        setTimeout(() => {
          const success = onUnlock(newPin);
          if (!success) {
            setError(true);
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#12141d] border border-white/10 rounded-3xl p-6 shadow-2xl text-slate-100 relative flex flex-col items-center text-center space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon Header */}
        <div className="w-16 h-16 rounded-full bg-[#ff2d60]/15 border border-[#ff2d60]/30 flex items-center justify-center text-[#ff2d60] shadow-lg shadow-[#ff2d60]/20">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-base font-extrabold text-white">Chat Locked</h2>
          <p className="text-xs text-slate-400 mt-0.5">Enter 4-digit PIN to access {chatTitle}</p>
        </div>

        {/* 4 Digit Dots */}
        <div className={`flex gap-4 py-2 ${error ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/50'
                  : i < pin.length
                  ? 'bg-[#ff2d60] border-[#ff2d60] shadow-lg shadow-[#ff2d60]/50 scale-110'
                  : 'border-white/20 bg-white/5'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Incorrect PIN. Try again.
          </p>
        )}

        {/* 0-9 Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handlePressNumber(num)}
              className="h-13 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/8 text-white text-lg font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}

          <div />

          <button
            onClick={() => handlePressNumber('0')}
            className="h-13 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/8 text-white text-lg font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
