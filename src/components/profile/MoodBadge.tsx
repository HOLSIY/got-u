import React from 'react';
import { UserMood } from '../../types';

interface MoodBadgeProps {
  mood?: UserMood;
  isMoodHidden?: boolean;
  isHidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({
  mood,
  isMoodHidden,
  isHidden,
  size = 'sm',
  showText = true,
  className = '',
}) => {
  const hidden = isMoodHidden ?? isHidden ?? false;
  if (!mood || hidden || (!mood.emoji && !mood.preset)) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-full',
    lg: 'text-sm px-3 py-1.5 rounded-full',
  };

  const presetLabel = mood.preset || 'Available';
  const displayEmoji = mood.emoji || '🟢';

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-slate-100/95 dark:bg-[#181a26]/90 border border-slate-300 dark:border-white/10 text-[#0f172a] dark:text-slate-100 font-semibold shadow-xs ${sizeClasses[size]} ${className}`}
      title={`${presetLabel}${mood.text ? `: ${mood.text}` : ''}`}
    >
      <span className="leading-none shrink-0">{displayEmoji}</span>
      <span className="text-[11px] font-bold text-[#0f172a] dark:text-slate-100 shrink-0">
        {presetLabel}
      </span>
      {showText && mood.text && mood.text.toLowerCase() !== presetLabel.toLowerCase() && (
        <span className="text-[11px] font-medium text-[#334155] dark:text-slate-300 truncate max-w-[140px] pl-1 border-l border-slate-300 dark:border-white/15">
          {mood.text}
        </span>
      )}
    </div>
  );
};
