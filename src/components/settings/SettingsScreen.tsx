import React, { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  Lock,
  UserX,
  HardDrive,
  Globe,
  HelpCircle,
  FileText,
  ShieldCheck,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  X,
  Search,
  CheckCircle2,
  Upload,
  Download,
  Shield,
  Send,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOCK_USERS } from '../../data/mockData';
import { formatUsername } from '../../utils/constants';
import { GotULogo } from '../common/GotULogo';

export const SettingsScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    theme,
    setTheme,
    logout,
    pushNotificationsEnabled,
    setPushNotificationsEnabled,
    readReceiptsEnabled,
    setReadReceiptsEnabled,
    blockedUsers,
    unblockUser,
    autoDownloadMedia,
    setAutoDownloadMedia,
    storageUsageMB,
    clearCache,
  } = useApp();

  const [activeSubScreen, setActiveSubScreen] = useState<
    'none' | 'blocked' | 'storage' | 'help' | 'terms' | 'privacy'
  >('none');

  const [helpSearch, setHelpSearch] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  const handleClearCache = () => {
    clearCache();
    setCacheClearedSuccess(true);
    setTimeout(() => setCacheClearedSuccess(false), 3000);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supportMessage.trim()) {
      setSupportSubmitted(true);
      setSupportMessage('');
      setTimeout(() => setSupportSubmitted(false), 4000);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100 z-40">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0 bg-white/90 dark:bg-[#0a0b0e]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Settings</h1>

        <div className="w-9 h-9" />
      </div>

      {/* Main Settings List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Appearance & Theme */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Appearance & Theme
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'light', label: 'Light Mode', icon: Sun },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = theme === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id as any)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-[#ff2d60]/15 border-[#ff2d60] text-slate-900 dark:text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-[#141620] border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#ff2d60]' : ''}`} />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences & Security */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Preferences & Security
          </h2>

          <div className="space-y-2">
            {/* Push Notifications Toggle */}
            <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Push Notifications</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {pushNotificationsEnabled ? 'Active for messages & calls' : 'Notifications muted'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPushNotificationsEnabled(!pushNotificationsEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  pushNotificationsEnabled ? 'bg-[#ff2d60] justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Read Receipts Toggle */}
            <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Read Receipts</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {readReceiptsEnabled ? 'Blue checkmarks visible' : 'Hidden for all chats'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReadReceiptsEnabled(!readReceiptsEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  readReceiptsEnabled ? 'bg-[#ff2d60] justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Blocked Users */}
            <div
              onClick={() => setActiveSubScreen('blocked')}
              className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#181a26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Blocked Users</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : 'None blocked'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>

            {/* Storage & Data */}
            <div
              onClick={() => setActiveSubScreen('storage')}
              className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#181a26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Storage & Data</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {(storageUsageMB / 1024).toFixed(2)} GB used • Media preferences
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        </div>

        {/* Support & Legal */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            About & Help
          </h2>

          <div className="space-y-2">
            <div
              onClick={() => setActiveSubScreen('help')}
              className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#181a26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Help Center & FAQs</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>

            <div
              onClick={() => setActiveSubScreen('terms')}
              className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#181a26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Terms of Service</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>

            <div
              onClick={() => setActiveSubScreen('privacy')}
              className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#181a26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        </div>

        {/* Dangerous Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete your got u account permanently?')) {
                logout();
              }
            }}
            className="w-full h-11 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>

          <button
            onClick={logout}
            className="w-full h-11 rounded-2xl bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>

          {/* App Branding Info */}
          <div className="pt-4 pb-2 flex flex-col items-center justify-center gap-1.5 opacity-80">
            <GotULogo size={24} variant="header" showTagline={false} />
            <span className="text-[10px] text-slate-400 font-medium">got u • v2.4.0 (Build 2026)</span>
          </div>
        </div>
      </div>

      {/* --- SUB SCREENS MODALS --- */}

      {/* 1. Blocked Users Subscreen */}
      {activeSubScreen === 'blocked' && (
        <div className="absolute inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] flex flex-col">
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveSubScreen('none')}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Blocked Users</h2>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-3">
            {blockedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Blocked Accounts</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600">
                  Users you block will appear here. They won't be able to message or view your online status.
                </p>
              </div>
            ) : (
              blockedUsers.map((userId) => {
                const userObj = MOCK_USERS[userId] || {
                  id: userId,
                  fullName: 'Blocked User',
                  username: userId,
                  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                };
                return (
                  <div
                    key={userId}
                    className="p-3 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={userObj.avatarUrl}
                        alt={userObj.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{userObj.fullName}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatUsername(userObj.username)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => unblockUser(userId)}
                      className="px-3 py-1.5 rounded-xl bg-[#ff2d60]/15 border border-[#ff2d60]/30 text-[#ff2d60] font-bold text-xs hover:bg-[#ff2d60]/30 cursor-pointer transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Storage & Data Subscreen */}
      {activeSubScreen === 'storage' && (
        <div className="absolute inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] flex flex-col">
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveSubScreen('none')}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Storage & Media</h2>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* Storage Usage Visualizer */}
            <div className="p-4 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Device Storage</span>
                <span className="text-[#ff2d60] font-extrabold">
                  {(storageUsageMB / 1024).toFixed(2)} GB Used
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-[#ff2d60] h-full" style={{ width: '65%' }} title="Photos & Videos" />
                <div className="bg-[#00D4FF] h-full" style={{ width: '20%' }} title="Voice & Files" />
                <div className="bg-[#762DFA] h-full" style={{ width: '15%' }} title="Cache" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ff2d60]" /> Media (65%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00D4FF]" /> Files (20%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#762DFA]" /> Cache (15%)
                </span>
              </div>
            </div>

            {/* Clear Cache Action */}
            <div className="p-4 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Clear Media Cache</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Frees temporary cached files without deleting messages.</p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
            {cacheClearedSuccess && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                ✨ Successfully cleared 1.19 GB of cached files!
              </p>
            )}

            {/* Auto-Download Preferences */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Media Auto-Download
              </h3>
              <div className="p-3.5 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Auto-download photos on Wi-Fi</span>
                <button
                  onClick={() => setAutoDownloadMedia(!autoDownloadMedia)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    autoDownloadMedia ? 'bg-[#ff2d60] justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Help Center Subscreen */}
      {activeSubScreen === 'help' && (
        <div className="absolute inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] flex flex-col">
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveSubScreen('none')}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Help & FAQs</h2>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Search FAQ */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={helpSearch}
                onChange={(e) => setHelpSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#141620] border border-slate-300 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#ff2d60]"
              />
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {[
                {
                  q: 'How do Friend Requests work?',
                  a: 'Before starting direct encrypted messaging with a new account, you must send a friend request. Once accepted by the receiver, a private chat channel opens immediately.',
                },
                {
                  q: 'How do I lock a private chat with a 4-digit PIN?',
                  a: 'Open any chat or profile, tap the lock option in the top right menu, and set a 4-digit security PIN. Entering the PIN unlocks access for your active session.',
                },
                {
                  q: 'Are got u messages encrypted?',
                  a: 'Yes! All client-to-client messaging, audio notes, and media uploads use end-to-end security protocol synced through Firebase Firestore.',
                },
                {
                  q: 'How long do Stories stay active?',
                  a: 'Nexus Stories auto-expire exactly 24 hours after posting and are visible strictly to your accepted friends.',
                },
              ]
                .filter(
                  (item) =>
                    !helpSearch ||
                    item.q.toLowerCase().includes(helpSearch.toLowerCase()) ||
                    item.a.toLowerCase().includes(helpSearch.toLowerCase())
                )
                .map((faq, i) => (
                  <div key={i} className="p-4 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#ff2d60]" /> {faq.q}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
            </div>

            {/* Contact Support Ticket */}
            <form onSubmit={handleSupportSubmit} className="p-4 bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/8 rounded-2xl space-y-3 mt-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#00D4FF]" /> Contact Support Squad
              </h4>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your question or issue..."
                className="w-full h-20 bg-slate-50 dark:bg-[#0a0b0e] border border-slate-300 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#00D4FF] resize-none"
              />
              <button
                type="submit"
                disabled={!supportMessage.trim()}
                className="w-full h-9 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#2D31FA] text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                Submit Ticket
              </button>
              {supportSubmitted && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">
                  ✅ Ticket submitted! Our support team will respond shortly.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 4. Terms of Service Subscreen */}
      {activeSubScreen === 'terms' && (
        <div className="absolute inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] flex flex-col">
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveSubScreen('none')}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Terms of Service</h2>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">got u User Agreement</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Last updated: August 2026</p>

            <div className="space-y-3 bg-white dark:bg-[#141620] p-4 rounded-2xl border border-slate-200 dark:border-white/8">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">1. User Accounts & Identity</h4>
              <p className="text-[11px]">
                Users are responsible for maintaining account credentials. Accounts must use unique handles (@username) and adhere to community guidelines.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs">2. Acceptable Use & Conduct</h4>
              <p className="text-[11px]">
                got u prohibits spam, harassment, hate speech, and unauthorized data extraction. Accounts violating rules may be permanently suspended.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs">3. Content Ownership</h4>
              <p className="text-[11px]">
                You retain full rights to all messages, media, and stories published on got u. We do not claim ownership of user-created content.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Privacy Policy Subscreen */}
      {activeSubScreen === 'privacy' && (
        <div className="absolute inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] flex flex-col">
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveSubScreen('none')}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Privacy Policy</h2>
            <div className="w-9 h-9" />
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Privacy & Data Security Standard</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Last updated: August 2026</p>

            <div className="space-y-3 bg-white dark:bg-[#141620] p-4 rounded-2xl border border-slate-200 dark:border-white/8">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">🔒 Encryption & Privacy First</h4>
              <p className="text-[11px]">
                got u secures communication with end-to-end security protocols. We never sell or transfer personal communication data to third parties.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs">🛡️ Data Retention</h4>
              <p className="text-[11px]">
                Messages and media are stored securely in Firestore cloud databases. Ephemeral stories automatically purge after 24 hours.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs">🗑️ Account Erasure Rights</h4>
              <p className="text-[11px]">
                Deleting your account permanently deletes profile records, chat history, and stored preferences from Firebase instantly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
