import React, { useState } from 'react';
import { Lock, Delete, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SetPINModalProps {
  onSavePin: (pin: string) => void;
  onClose: () => void;
  title?: string;
}

export const SetPINModal: React.FC<SetPINModalProps> = ({
  onSavePin,
  onClose,
  title = 'Enable Chat PIN',
}) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentPin = step === 'create' ? firstPin : confirmPin;

  const handlePressNumber = (num: string) => {
    setError(null);
    if (step === 'create') {
      if (firstPin.length < 4) {
        const next = firstPin + num;
        setFirstPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + num;
        setConfirmPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            if (next === firstPin) {
              onSavePin(next);
            } else {
              setError('PINs do not match. Try again.');
              setConfirmPin('');
              setFirstPin('');
              setStep('create');
            }
          }, 200);
        }
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#12141d] border border-white/10 rounded-3xl p-6 shadow-2xl text-slate-100 relative flex flex-col items-center text-center space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon Header */}
        <div className="w-16 h-16 rounded-full bg-[#ff2d60]/15 border border-[#ff2d60]/30 flex items-center justify-center text-[#ff2d60] shadow-lg shadow-[#ff2d60]/20">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-base font-extrabold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'create' ? 'Enter a new 4-digit PIN' : 'Confirm your 4-digit PIN'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span className={`px-2.5 py-0.5 rounded-full font-bold ${step === 'create' ? 'bg-[#ff2d60] text-white' : 'bg-white/10'}`}>
            1. New PIN
          </span>
          <span>→</span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold ${step === 'confirm' ? 'bg-[#ff2d60] text-white' : 'bg-white/10'}`}>
            2. Confirm
          </span>
        </div>

        {/* 4 Digit Dots */}
        <div className={`flex gap-4 py-1 ${error ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/50'
                  : i < currentPin.length
                  ? 'bg-[#ff2d60] border-[#ff2d60] shadow-lg shadow-[#ff2d60]/50 scale-110'
                  : 'border-white/20 bg-white/5'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        {/* Keypad Grid */}
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
