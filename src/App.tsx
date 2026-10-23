import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { BrandingProvider, useBranding } from './context/BrandingContext';
import { MobilePhoneFrame } from './components/layout/MobilePhoneFrame';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatListScreen } from './components/chats/ChatListScreen';
import { ChatDetailScreen } from './components/chats/ChatDetailScreen';
import { FeedScreen } from './components/feed/FeedScreen';
import { ContactsScreen } from './components/contacts/ContactsScreen';
import { GroupsScreen } from './components/groups/GroupsScreen';
import { ActivityScreen } from './components/activity/ActivityScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { CallsScreen } from './components/calls/CallsScreen';
import { ReelWorldScreen } from './components/reels/ReelWorldScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { BottomNavigation } from './components/navigation/BottomNavigation';
import { CallOverlay } from './components/calls/CallOverlay';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { MediaViewerModal } from './components/media/MediaViewerModal';
import { ProfilePhotoViewerModal } from './components/media/ProfilePhotoViewerModal';
import { PostViewerModal } from './components/feed/PostViewerModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { NewChatModal } from './components/chats/NewChatModal';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { SuggestedFriendsScreen } from './components/auth/SuggestedFriendsScreen';
import { AdminPanelScreen } from './components/admin/AdminPanelScreen';
import { FirestoreQuotaBanner } from './components/common/FirestoreQuotaBanner';
import { ReelUploadToast } from './components/reels/ReelUploadToast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppContent: React.FC = () => {
  const {
    screen,
    activeChatId,
    activeTab,
    isGlobalAiAssistantOpen,
    setIsGlobalAiAssistantOpen,
    currentUser,
    activePostViewer,
    closePostViewer,
    selectedProfileUser,
    closeUserProfile,
  } = useApp();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChatModalGlobal, setShowNewChatModalGlobal] = useState(false);

  // Render current screen content
  const renderCurrentView = () => {
    if (screen === 'welcome') {
      return <WelcomeScreen />;
    }

    if (screen === 'auth') {
      return <AuthScreen />;
    }

    if (screen === 'suggested_friends') {
      return <SuggestedFriendsScreen />;
    }

    // Main App Screens
    if (activeChatId !== null) {
      return <ChatDetailScreen />;
    }

    if (showSettingsModal) {
      return <SettingsScreen onClose={() => setShowSettingsModal(false)} />;
    }

    switch (activeTab) {
      case 'chats':
        return <ChatListScreen />;
      case 'feed':
        return <FeedScreen />;
      case 'reels':
        return <ReelWorldScreen />;
      case 'calls':
        return <CallsScreen />;
      case 'contacts':
        return <ContactsScreen />;
      case 'groups':
        return <GroupsScreen />;
      case 'activity':
        return <ActivityScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <ChatListScreen />;
    }
  };

  const showBottomNav = screen === 'main' && activeChatId === null && !showSettingsModal;

  return (
    <MobilePhoneFrame>
      <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-[#0a0b0e]">
        <FirestoreQuotaBanner />
        <ReelUploadToast />
        <div className="flex-1 w-full min-h-0 relative overflow-y-auto flex flex-col">
          <ErrorBoundary name="View">
            {renderCurrentView()}
          </ErrorBoundary>
        </div>

        {/* Permanently Fixed Bottom Navigation */}
        {showBottomNav && (
          <div className="w-full shrink-0 z-40 bg-white/95 dark:bg-[#0a0b0e]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 pb-1">
            <BottomNavigation onOpenNewChatModal={() => setShowNewChatModalGlobal(true)} />
          </div>
        )}

        {/* Global Overlays */}
        {showNewChatModalGlobal && (
          <NewChatModal onClose={() => setShowNewChatModalGlobal(false)} />
        )}
        <IncomingCallModal />
        <CallOverlay />
        <MediaViewerModal />
        <ProfilePhotoViewerModal />
        {activePostViewer && (
          <PostViewerModal
            post={activePostViewer}
            onClose={closePostViewer}
          />
        )}
        {selectedProfileUser && (
          <UserProfileModal
            user={selectedProfileUser}
            onClose={closeUserProfile}
          />
        )}
        <AIAssistantDrawer
          isOpen={isGlobalAiAssistantOpen}
          onClose={() => setIsGlobalAiAssistantOpen(false)}
          currentUser={currentUser}
        />
      </div>
    </MobilePhoneFrame>
  );
};

const MainRouter: React.FC = () => {
  const { isAdminAuthenticated, isVerifyingAdmin } = useBranding();
  const [isAdminPath, setIsAdminPath] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return hash === '#/admin' || hash === '#admin' || path === '/admin';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const requestedAdmin = hash === '#/admin' || hash === '#admin' || path === '/admin';
      setIsAdminPath(requestedAdmin);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // During initial silent admin verification, render normal application loading experience
  if (isVerifyingAdmin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0b0e] text-white">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff2d60] border-t-transparent animate-spin" />
      </div>
    );
  }

  // If on admin route:
  if (isAdminPath) {
    // Only render Administration Dashboard IF server authentication has verified MASTER_ADMIN role
    if (isAdminAuthenticated) {
      return (
        <AdminPanelScreen
          onClose={() => {
            window.location.hash = '';
            setIsAdminPath(false);
          }}
        />
      );
    }

    // If not authenticated or authorized, redirect to normal login / application
    if (window.location.hash.includes('admin') || window.location.pathname.includes('admin')) {
      window.location.hash = '';
      window.history.replaceState(null, '', '/');
    }
    return <AppContent />;
  }

  return <AppContent />;
};

export default function App() {
  return (
    <ErrorBoundary name="Root">
      <BrandingProvider>
        <AppProvider>
          <MainRouter />
        </AppProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
}

