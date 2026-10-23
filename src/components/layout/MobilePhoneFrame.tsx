import React from 'react';

interface MobilePhoneFrameProps {
  children: React.ReactNode;
}

export const MobilePhoneFrame: React.FC<MobilePhoneFrameProps> = ({ children }) => {
  return (
    <div className="w-full h-screen bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full max-w-[420px] h-full bg-white dark:bg-[#0a0b0e] relative flex flex-col overflow-hidden shadow-2xl">
        {children}
      </div>
    </div>
  );
};

