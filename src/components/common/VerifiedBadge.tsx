import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
  showText = true,
}) => {
  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white font-extrabold tracking-wider border border-white/20 shadow-sm shrink-0 ${textSizes[size]} ${className}`}
      title="Verified Original Account"
    >
      <ShieldCheck className={iconSizes[size]} />
      {showText && <span>The Original</span>}
    </span>
  );
};
