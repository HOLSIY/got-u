import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Music, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GotULogo } from '../common/GotULogo';
import welcomeHeroImage from '../../assets/images/welcome_hero_1785509318579.jpg';

export const WelcomeScreen: React.FC = () => {
  const { setScreen, setAuthMode } = useApp();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      pill: 'got u',
      heading: (
        <>
          <span className="text-[#ff2d60]">Desires</span> Come<br />
          Alive in <span className="text-[#ff2d60]">Sound</span>
        </>
      ),
      description: 'Step into a world where your desires come alive in sound.',
      heroImage: welcomeHeroImage,
    },
    {
      pill: 'HD Calls & Audio',
      heading: (
        <>
          <span className="text-[#ff2d60]">Crystal Clear</span><br />
          Voice & <span className="text-[#ff2d60]">Video</span>
        </>
      ),
      description: 'Connect with friends in ultra-high clarity with zero delay.',
      heroImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
    },
    {
      pill: 'End-to-End Encrypted',
      heading: (
        <>
          <span className="text-[#ff2d60]">Private</span> &<br />
          Secure <span className="text-[#ff2d60]">Direct Messages</span>
        </>
      ),
      description: 'Your messages, media, and stories are protected with modern security.',
      heroImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    },
  ];

  const current = slides[activeSlide];
  const isLastSlide = activeSlide === slides.length - 1;

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x < -50 && activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else if (info.offset.x > 50 && activeSlide > 0) {
      setActiveSlide(activeSlide - 1);
    }
  };

  const handleFinish = () => {
    setAuthMode('signin');
    setScreen('auth');
  };

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-[#0a0b0e] flex flex-col justify-between overflow-hidden select-none text-slate-900 dark:text-white">
      {/* Swipeable hero image area */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="relative w-full h-[58%] cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide}
            initial={{ opacity: 0.3, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.3 }}
            transition={{ duration: 0.3 }}
            src={current.heroImage}
            alt="got u"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-105 pointer-events-none"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-[#0a0b0e] via-slate-100/30 dark:via-[#0a0b0e]/30 to-transparent pointer-events-none" />
      </motion.div>

      {/* Slide Indicators */}
      <div className="flex items-center justify-center gap-2 my-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={`transition-all duration-300 cursor-pointer ${
              activeSlide === idx
                ? 'w-7 h-1.5 rounded-full bg-[#ff2d60] shadow-[0_0_8px_#ff2d60]'
                : 'w-1.5 h-1.5 rounded-full bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 px-6 pb-6 flex flex-col justify-between flex-1 text-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <GotULogo size={20} variant="icon" />
              <span className="text-xs font-extrabold tracking-tight text-white/90">
                got <span className="text-[#ff2d60]">u</span>
              </span>
            </div>

            <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
              {current.heading}
            </h1>

            <p className="text-xs text-slate-400 max-w-xs leading-relaxed pt-1">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Action Button - Only visible on the final slide */}
        <div className="pt-4 h-16 flex items-center justify-center">
          {isLastSlide ? (
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={handleFinish}
              className="w-full h-13 bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] hover:brightness-110 rounded-full font-bold text-xs text-white shadow-xl shadow-[#ff2d60]/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span>Get Started & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium tracking-wide animate-pulse">
              Swipe left to continue →
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


