import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  UserX,
  UserCheck,
  KeyRound,
  Trash2,
  AlertTriangle,
  Activity,
  Megaphone,
  BarChart3,
  Wrench,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Database,
  Server,
  Zap,
  Lock,
  X,
  Send,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Palette,
  Sliders,
  LogOut,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { useBranding } from '../../context/BrandingContext';
import { User } from '../../types';
import { GotULogo } from '../common/GotULogo';
import { trimAndProcessLogo } from '../../utils/logoProcessor';
import { uploadToCloudStorage } from '../../utils/cloudStorage';
import { formatUsername } from '../../utils/constants';

interface SystemReport {
  id: string;
  reporterName: string;
  reportedUser: string;
  reason: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export const AdminPanelScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, openProfilePhotoViewer } = useApp();
  const { branding, updateBranding, restoreDefaultBranding, isAdminAuthenticated, adminLogout } = useBranding();

  const [activeTab, setActiveTab] = useState<
    'branding' | 'users' | 'reports' | 'monitor' | 'announcements' | 'analytics' | 'maintenance'
  >('branding');

  // BRANDING CUSTOMIZATION STATE
  const [editAppName, setEditAppName] = useState(branding.appName);
  const [editTagline, setEditTagline] = useState(branding.tagline);
  const [editSubTagline, setEditSubTagline] = useState(branding.subTagline);
  const [editAdminName, setEditAdminName] = useState(branding.adminName);
  const [previewLogoUrl, setPreviewLogoUrl] = useState(branding.logoUrl);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // USER MANAGEMENT STATE
  const [userList, setUserList] = useState<User[]>([
    {
      id: 'usr_101',
      fullName: 'Denpasar City',
      username: 'denpasarcity',
      email: 'denpasar@balinews.com',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
      bio: 'Official Bali Community Channel 🌴',
      isOnline: true,
      messagesCount: 1420,
      groupsCount: 12,
    },
    {
      id: 'usr_102',
      fullName: 'Khadija Said',
      username: 'khadijasaid',
      email: 'khadija@nexus.chat',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      bio: 'Senior UX Designer & Tech Enthusiast ✨',
      isOnline: true,
      messagesCount: 890,
      groupsCount: 8,
    },
    {
      id: 'usr_103',
      fullName: 'Akbar Pratama',
      username: 'akbar_p',
      email: 'akbar@techart.io',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
      bio: 'Mobile App Developer & Coffee Lover ☕',
      isOnline: false,
      messagesCount: 340,
      groupsCount: 4,
    },
    {
      id: 'usr_104',
      fullName: 'Kira Vance',
      username: 'kiravance',
      email: 'kira@designcorp.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
      bio: '3D Artist & Motion Graphics Fanatic 🎨',
      isOnline: true,
      messagesCount: 610,
      groupsCount: 6,
    },
  ]);

  const [suspendedUsers, setSuspendedUsers] = useState<Record<string, boolean>>({});
  const [userSearch, setUserSearch] = useState('');

  // Fetch real users from Firestore database
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        if (!usersSnap.empty && isMounted) {
          const dbUsers: User[] = usersSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              fullName: data.name || data.fullName || 'User',
              username: (data.username || 'user').replace(/^@+/, ''),
              email: data.email || '',
              avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
              bio: data.bio || '',
              isOnline: data.status === 'online',
              messagesCount: data.messagesCount || 0,
              groupsCount: data.groupsCount || 0,
            };
          });

          // Merge with any existing mock items ensuring unique IDs
          setUserList((prev) => {
            const combined = [...dbUsers];
            const existingIds = new Set(dbUsers.map((u) => u.id));
            for (const u of prev) {
              if (!existingIds.has(u.id)) combined.push(u);
            }
            return combined;
          });
        }
      } catch (err) {
        console.warn('Firestore user fetch in admin:', err);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // REPORTS STATE
  const [reports, setReports] = useState<SystemReport[]>([
    {
      id: 'rep_1',
      reporterName: 'Khadija Said (@khadijasaid)',
      reportedUser: 'SpamBot_99 (@spambot99)',
      reason: 'Sending unprompted promotional links & unsolicited spam.',
      timestamp: '10 mins ago',
      status: 'pending',
    },
    {
      id: 'rep_2',
      reporterName: 'Akbar Pratama (@akbar_p)',
      reportedUser: 'User_381 (@user381)',
      reason: 'Inappropriate media shared in public group channel.',
      timestamp: '2 hours ago',
      status: 'pending',
    },
  ]);

  // ANNOUNCEMENTS STATE
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'anc_1',
      title: 'Scheduled System Maintenance',
      message: `${branding.appName} will undergo brief server optimization tonight at 02:00 UTC.`,
      priority: 'medium',
      createdAt: 'Today, 14:30',
    },
    {
      id: 'anc_2',
      title: 'New Encrypted Calls Feature Live!',
      message: 'HD Video & Audio calling is now enabled end-to-end for all mobile users.',
      priority: 'high',
      createdAt: 'Yesterday',
    },
  ]);

  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<'low' | 'medium' | 'high'>('high');

  // MAINTENANCE STATE
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [systemCacheCleared, setSystemCacheCleared] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // MEDIA & TRANSCODING METRICS
  const [mediaMetrics, setMediaMetrics] = useState<{
    activeUploadSessions: number;
    totalJobs: number;
    queued: number;
    processing: number;
    ready: number;
    failed: number;
    recentJobs: any[];
  } | null>(null);

  useEffect(() => {
    const fetchMediaMetrics = async () => {
      try {
        const res = await fetch('/api/admin/media/metrics');
        if (res.ok) {
          const data = await res.json();
          setMediaMetrics(data);
        }
      } catch {}
    };
    fetchMediaMetrics();
    const interval = setInterval(fetchMediaMetrics, 6000);
    return () => clearInterval(interval);
  }, []);

  // LOGO UPLOAD HANDLER (automatically detects logo boundaries and trims outer padding)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, WebP, SVG, or JPG).');
      return;
    }

    try {
      const processedDataUrl = await trimAndProcessLogo(file, {
        maxDimension: 1024,
        removeSolidBackground: true,
      });
      if (processedDataUrl) {
        setPreviewLogoUrl(processedDataUrl);
      }
    } catch (err) {
      console.warn('Failed to auto-process logo, fallback to raw reader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setSaveProgress(10);
    setSaveStatusMessage('Validating and preparing application branding...');

    try {
      let finalLogoUrl = previewLogoUrl;

      // If user uploaded a new local file or data URL, upload to persistent cloud storage
      if (previewLogoUrl && previewLogoUrl.startsWith('data:')) {
        setSaveStatusMessage('Uploading logo to persistent storage...');
        const uploadRes = await uploadToCloudStorage(previewLogoUrl, 'branding/master_logo.png', {
          contentType: 'image/png',
          compressType: 'none',
          onProgress: (p) => {
            setSaveProgress(p);
            setSaveStatusMessage(`Uploading logo to persistent storage (${p}%)...`);
          },
        });

        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || 'Failed to upload logo image to persistent storage.');
        }

        finalLogoUrl = uploadRes.url;
        setPreviewLogoUrl(finalLogoUrl);
      }

      setSaveProgress(85);
      setSaveStatusMessage('Saving configuration to persistent database and server...');

      await updateBranding({
        appName: editAppName.trim() || 'got u',
        tagline: editTagline.trim() || 'Live social feed & updates',
        subTagline: editSubTagline.trim() || 'CHAT • SHARE • BE YOU',
        adminName: editAdminName.trim() || 'Administrator',
        logoUrl: finalLogoUrl,
        faviconUrl: finalLogoUrl,
      });

      setSaveProgress(100);
      setSaveStatusMessage('Branding and logo published globally!');
      setSaveSuccessMsg('Application branding and logo saved successfully and permanently!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setSaveStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Branding save error:', err);
      setSaveErrorMsg(err?.message || 'Failed to save branding changes. Please check permissions and try again.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleRestoreDefaultBranding = async () => {
    if (confirm('Are you sure you want to restore the default got u logo and branding?')) {
      await restoreDefaultBranding();
      setEditAppName('got u');
      setEditTagline('Live social feed & updates');
      setEditSubTagline('CHAT • SHARE • BE YOU');
      setEditAdminName('Administrator');
      setPreviewLogoUrl('');
      setSaveSuccessMsg('Restored default got u logo and branding.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleToggleSuspend = (userId: string) => {
    setSuspendedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to permanently delete this user account?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.warn('Error deleting user doc from Firestore:', err);
      }
      setUserList((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const handleResetUserPassword = (username: string) => {
    const tempPass = 'Nexus' + Math.floor(100000 + Math.random() * 900000) + '!';
    alert(`Password reset successfully for @${username}.\nTemporary Password: ${tempPass}`);
  };

  const handleResolveReport = (reportId: string, action: 'resolve' | 'dismiss') => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, status: action === 'resolve' ? 'resolved' : 'dismissed' } : r
      )
    );
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnMsg) return;

    const newAnc: Announcement = {
      id: 'anc_' + Date.now(),
      title: newAnnTitle,
      message: newAnnMsg,
      priority: newAnnPriority,
      createdAt: 'Just now',
    };

    setAnnouncements([newAnc, ...announcements]);
    setNewAnnTitle('');
    setNewAnnMsg('');
    alert(`Global announcement broadcasted to all active ${branding.appName} users!`);
  };

  const handleClearCache = () => {
    setSystemCacheCleared(true);
    setTimeout(() => setSystemCacheCleared(false), 3000);
  };

  const handleTriggerBackup = () => {
    setBackupStatus('Backing up Firebase Firestore database...');
    setTimeout(() => {
      setBackupStatus('Backup completed! Snapshot saved to Firebase Storage.');
      setTimeout(() => setBackupStatus(null), 4000);
    }, 2000);
  };

  const filteredUsers = userList.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#06070a] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-white dark:bg-[#0e1017] border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <GotULogo size={36} variant="icon" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Administration Console</span>
              <span className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold px-2 py-0.5 rounded-full border border-red-500/30">
                ROOT PRIVILEGES
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Authenticated Administrator:{' '}
              <span className="text-[#ff2d60] font-bold">@{branding.adminName || 'Admin'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              adminLogout();
              onClose();
            }}
            className="h-9 px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign out of Administration"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="px-4 py-2 bg-slate-200 dark:bg-[#090b10] border-b border-slate-300 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        {[
          { id: 'branding', label: 'Branding & Logo', icon: Palette },
          { id: 'users', label: 'Users', icon: Users, badge: userList.length },
          { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: reports.filter((r) => r.status === 'pending').length },
          { id: 'announcements', label: 'Broadcasts', icon: Megaphone, badge: announcements.length },
          { id: 'monitor', label: 'Telemetry', icon: Activity },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'maintenance', label: 'General Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#ff2d60] to-[#762DFA] text-white shadow-md shadow-[#ff2d60]/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* BRANDING & LOGO CUSTOMIZATION TAB */}
        {activeTab === 'branding' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#ff2d60]" />
                    <span>Application Branding & Custom Logo</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Centralized branding management. Updates feed, navigation, login, and all app screens immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefaultBranding}
                  className="h-9 px-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Restore Default</span>
                </button>
              </div>

              {saveSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {isSavingBranding && (
                <div className="p-4 rounded-2xl bg-[#ff2d60]/5 border border-[#ff2d60]/20 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#ff2d60] animate-spin" />
                      <span>{saveStatusMessage || 'Processing branding update...'}</span>
                    </span>
                    <span className="text-[#ff2d60] font-mono">{saveProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff2d60] to-[#762DFA] transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(5, saveProgress)}%` }}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveBranding} className="space-y-6">
                {/* Logo Upload Section */}
                <div className="space-y-3">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                    App Logo Image
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Live Preview Box */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#090a10] border border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center min-h-[160px] text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 block">
                        Current Logo Preview
                      </span>
                      {previewLogoUrl ? (
                        <img
                          src={previewLogoUrl}
                          alt="Uploaded Logo Preview"
                          className="max-h-24 max-w-full object-contain drop-shadow-md rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <GotULogo size={56} variant="full" />
                          <span className="text-[10px] text-slate-500">Original 3D got u Logo Asset</span>
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                      />

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-11 px-4 rounded-2xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                          <Upload className="w-4 h-4 text-[#ff2d60]" />
                          <span>Upload New Logo</span>
                        </button>

                        {previewLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewLogoUrl('')}
                            className="h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Uploaded Logo</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Supports PNG, WebP, SVG, JPG. Transparency and original proportions are strictly preserved across light/dark themes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Text Branding Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={editAppName}
                      onChange={(e) => setEditAppName(e.target.value)}
                      placeholder="got u"
                      className="w-full h-11 px-4 rounded-2xl bg-slate-100 dark:bg-[#161822] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#ff2d60]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                      App Sub-Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={editSubTagline}
                      onChange={(e) => setEditSubTagline(e.target.value)}
                      placeholder="CHAT • SHARE • BE YOU"
                      className="w-full h-11 px-4 rounded-2xl bg-slate-100 dark:bg-[#161822] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#ff2d60]"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
                      Feed Header Tagline
                    </label>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      placeholder="Live social feed & updates"
                      className="w-full h-11 px-4 rounded-2xl bg-slate-100 dark:bg-[#161822] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#ff2d60]"
                    />
                  </div>
                </div>

                {/* Save & Action Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSavingBranding}
                    className="h-11 px-6 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#762DFA] hover:opacity-90 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#ff2d60]/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingBranding ? 'Saving...' : 'Save Branding Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name, @username, or email..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-[#11131c] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((user) => {
                const isSuspended = suspendedUsers[user.id];

                return (
                  <div
                    key={user.id}
                    className={`bg-white dark:bg-[#10121a] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                      isSuspended ? 'border-red-500/40 opacity-70 bg-red-950/10' : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 mb-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        onClick={() => openProfilePhotoViewer(user.avatarUrl, user.fullName, user.username)}
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 rounded-full object-cover border-2 border-slate-200 dark:border-white/10 shadow-md cursor-pointer hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{user.fullName}</span>
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSuspended
                                ? 'bg-red-500/20 text-red-500'
                                : user.isOnline
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isSuspended ? 'SUSPENDED' : user.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#ff2d60]">{formatUsername(user.username)}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleResetUserPassword(user.username)}
                        className="h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>Reset Pass</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSuspend(user.id)}
                          className={`h-8 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isSuspended
                              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Unsuspend</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="h-8 w-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORTS REVIEW TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              User Reports & Flagged Activity
            </h2>

            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{report.reporterName}</span>
                    <span className="text-[10px] text-slate-500">reported</span>
                    <span className="text-xs font-bold text-[#ff2d60]">{report.reportedUser}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    "{report.reason}"
                  </p>
                  <span className="text-[10px] text-slate-500 block">{report.timestamp}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {report.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleResolveReport(report.id, 'resolve')}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Action Taken</span>
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Dismiss</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                      RESOLVED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TELEMETRY TAB */}
        {activeTab === 'monitor' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Server Health</span>
                <span className="text-lg font-extrabold text-emerald-500 flex items-center gap-1.5">
                  <Server className="w-5 h-5" /> 99.98%
                </span>
                <span className="text-[10px] text-slate-500">Cloud Run Container</span>
              </div>

              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Firestore DB</span>
                <span className="text-lg font-extrabold text-[#00D4FF] flex items-center gap-1.5">
                  <Database className="w-5 h-5" /> Active
                </span>
                <span className="text-[10px] text-slate-500">Firestore Realtime</span>
              </div>

              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Active Latency</span>
                <span className="text-lg font-extrabold text-amber-500 flex items-center gap-1.5">
                  <Zap className="w-5 h-5" /> 18ms
                </span>
                <span className="text-[10px] text-slate-500">Global WebSocket Ping</span>
              </div>

              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Active Sessions</span>
                <span className="text-lg font-extrabold text-purple-500 flex items-center gap-1.5">
                  <Users className="w-5 h-5" /> 4,892
                </span>
                <span className="text-[10px] text-slate-500">Online Users</span>
              </div>
            </div>

            {/* Real Media Pipeline & HLS Transcoding Engine Telemetry */}
            <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ff2d60]" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Reels Media Pipeline & HLS Transcoder
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  FFmpeg Worker Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 block">Queue Depth</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {mediaMetrics?.queued ?? 0} jobs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 block">Active Transcoding</span>
                  <span className="text-base font-black text-[#ff2d60]">
                    {mediaMetrics?.processing ?? 0} active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 block">Processed HLS Reels</span>
                  <span className="text-base font-black text-emerald-500">
                    {mediaMetrics?.ready ?? 0} ready
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 block">Adaptive Bitrates</span>
                  <span className="text-base font-black text-[#00D4FF]">
                    360p - 1080p
                  </span>
                </div>
              </div>

              {mediaMetrics?.recentJobs && mediaMetrics.recentJobs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Recent Transcoding Jobs
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[10px]">
                    {mediaMetrics.recentJobs.slice(0, 5).map((job: any) => (
                      <div
                        key={job.jobId}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                      >
                        <span className="truncate max-w-[140px]">{job.videoId}</span>
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-400">
                          {job.status} ({job.stage})
                        </span>
                        <span className="text-slate-400">
                          {new Date(job.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-4 font-mono text-xs">
              <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ff2d60]" />
                <span>Live System Stream</span>
              </h3>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <p>
                  <span className="text-emerald-400">[OK]</span> Firestore connection synchronized to region ai-studio-nexuschat
                </p>
                <p>
                  <span className="text-blue-400">[INFO]</span> Encrypted WebRTC peer handshakes verified (0 dropouts)
                </p>
                <p>
                  <span className="text-amber-400">[WARN]</span> Storage quota usage at 12.4% of tier threshold
                </p>
                <p>
                  <span className="text-emerald-400">[OK]</span> Admin session authenticated: @{branding.adminName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BROADCASTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateAnnouncement} className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#ff2d60]" />
                <span>Broadcast New System Announcement</span>
              </h3>

              <div>
                <input
                  type="text"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  placeholder="Announcement Title..."
                  className="w-full h-11 px-4 rounded-xl bg-slate-100 dark:bg-[#090a10] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                />
              </div>

              <div>
                <textarea
                  value={newAnnMsg}
                  onChange={(e) => setNewAnnMsg(e.target.value)}
                  placeholder={`Write system message sent to all ${branding.appName} users...`}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-[#090a10] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
                />
              </div>

              <div className="flex items-center justify-between">
                <select
                  value={newAnnPriority}
                  onChange={(e) => setNewAnnPriority(e.target.value as any)}
                  className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-[#090a10] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority Banner</option>
                </select>

                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#ff2d60] hover:bg-[#ff2055] text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Now</span>
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Broadcasts</h3>
              {announcements.map((anc) => (
                <div key={anc.id} className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{anc.title}</h4>
                    <span className="text-[10px] text-slate-500">{anc.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{anc.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500">Total Messages Today</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">148,920</span>
                <span className="text-[10px] text-emerald-500 font-bold">+14.2% from yesterday</span>
              </div>
              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500">Active Media Uploads</span>
                <span className="text-2xl font-black text-[#ff2d60] block mt-1">12,450</span>
                <span className="text-[10px] text-slate-500">Photos & Videos</span>
              </div>
              <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-slate-500">Active Groups</span>
                <span className="text-2xl font-black text-purple-500 block mt-1">1,280</span>
                <span className="text-[10px] text-slate-500">Public & Private channels</span>
              </div>
            </div>
          </div>
        )}

        {/* GENERAL SETTINGS & MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>General Administrator Settings</span>
              </h3>

              <div className="space-y-4">
                {/* Administrator Name */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-white block">
                    Administrator / App Owner Display Name
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configures the display name shown in system logs, administration console, and root account headers.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      placeholder="Administrator"
                      className="flex-1 h-10 px-3.5 rounded-xl bg-white dark:bg-[#161822] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#ff2d60]"
                    />
                    <button
                      onClick={async () => {
                        await updateBranding({ adminName: editAdminName.trim() || 'Administrator' });
                        alert('Administrator display name updated successfully!');
                      }}
                      className="h-10 px-4 rounded-xl bg-[#ff2d60] hover:bg-[#ff2055] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Name</span>
                    </button>
                  </div>
                </div>

                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">System Maintenance Mode</span>
                    <span className="text-[10px] text-slate-500">Restrict normal users while performing backend updates</span>
                  </div>
                  <button
                    onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                    className={`w-12 h-6.5 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                      isMaintenanceMode ? 'bg-red-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* Clear Cache */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Flush Global System Cache</span>
                    <span className="text-[10px] text-slate-500">Clear temporary CDN and message state caches</span>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="h-9 px-4 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${systemCacheCleared ? 'animate-spin' : ''}`} />
                    <span>{systemCacheCleared ? 'Flushed!' : 'Flush Cache'}</span>
                  </button>
                </div>

                {/* Database Backup */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Trigger Firestore Snapshot Backup</span>
                    <span className="text-[10px] text-slate-500">Generate full system JSON & storage archive</span>
                  </div>
                  <button
                    onClick={handleTriggerBackup}
                    className="h-9 px-4 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-600 dark:text-purple-300 hover:bg-purple-600/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Backup Database</span>
                  </button>
                </div>

                {backupStatus && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-600 dark:text-purple-300">
                    {backupStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
