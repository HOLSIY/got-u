import React from 'react';
import { MessageSquare, Globe, Bell, User as UserIcon, Sparkles, Film } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';

interface BottomNavigationProps {
  onOpenNewChatModal?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = () => {
  const { activeTab, setActiveTab, chats, notifications, setIsGlobalAiAssistantOpen } = useApp();

  const unreadChatsTotal = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadNotifsTotal = notifications.filter((n) => !n.isRead).length;

  // Strict order: 1. Feed, 2. Chats, 3. Reels (Reel World), 4. Notifications, 5. Profile
  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'feed', label: 'Feed', icon: Globe },
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsTotal },
    { id: 'reels', label: 'Reels', icon: Film },
    { id: 'activity', label: 'Notifs', icon: Bell, badge: unreadNotifsTotal },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="relative w-full px-3 sm:px-4 py-2 z-30 shrink-0 pointer-events-none pb-safe">
      <div className="w-full flex items-center justify-between gap-2.5 max-w-md mx-auto">
        {/* Main Floating Glass Dock Bar */}
        <div className="flex-1 h-14 bg-white/95 dark:bg-[#141620]/95 backdrop-blur-2xl rounded-full border border-slate-200/90 dark:border-white/10 px-2.5 sm:px-4 flex items-center justify-around shadow-[0_10px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center min-w-[52px] h-11 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#ff2d60] font-black scale-105'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title={item.label}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-[#ff2d60] scale-110 stroke-[2.5]' : 'stroke-2'}`} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#ff2d60] text-[8px] font-black text-white flex items-center justify-center border border-white dark:border-black shadow-md">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>

                <span className={`text-[9.5px] mt-0.5 tracking-tight ${isActive ? 'text-[#ff2d60] font-black' : 'text-[#334155] dark:text-slate-400 font-semibold'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary AI Assistant Floating Action Button (FAB) - Guaranteed unclipped */}
        <button
          onClick={() => setIsGlobalAiAssistantOpen(true)}
          className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer pointer-events-auto shrink-0 border border-white/40 group overflow-hidden"
          title="got u AI Writing Assistant & Co-Pilot"
        >
          {/* Subtle glowing ring background */}
          <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
          <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
        </button>
      </div>
    </div>
  );
};


