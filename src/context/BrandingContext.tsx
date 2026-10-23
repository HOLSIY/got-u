import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface BrandingSettings {
  appName: string;
  tagline: string;
  subTagline: string;
  adminName?: string;
  logoUrl: string; // custom uploaded base64 / URL, empty string = default logo
  faviconUrl: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'got u',
  tagline: 'Live social feed & updates',
  subTagline: 'CHAT • SHARE • BE YOU',
  logoUrl: '/got_u_logo.png',
  faviconUrl: '/got_u_logo.png',
};

interface BrandingContextType {
  branding: BrandingSettings;
  updateBranding: (newSettings: Partial<BrandingSettings>) => Promise<void>;
  restoreDefaultBranding: () => Promise<void>;
  isAdminAuthenticated: boolean;
  isVerifyingAdmin: boolean;
  adminToken: string | null;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

const STORAGE_KEY = 'gotu_branding_settings_v2';
const TOKEN_KEY = 'gotu_admin_session_token';

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse cached branding:', e);
    }
    return DEFAULT_BRANDING;
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize browser favicon with published logo dynamically
  useEffect(() => {
    const iconUrl = branding.faviconUrl || branding.logoUrl;
    if (iconUrl) {
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = iconUrl;
      } catch {
        // Safe fallback
      }
    }
  }, [branding.faviconUrl, branding.logoUrl]);

  // Initialize and synchronize branding in real-time from Server & Firestore
  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch from server API (source of truth)
    async function fetchServerBranding() {
      try {
        const res = await fetch('/api/branding', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            setBranding((prev) => {
              const finalLogo = (data.logoUrl !== undefined && data.logoUrl !== '') ? data.logoUrl : prev.logoUrl;
              const merged = { ...prev, ...data, logoUrl: finalLogo };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Server branding fetch notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchServerBranding();

    // 2. Real-time Firestore sync listener for instant cross-device and cross-page updates
    const docRef = doc(db, 'settings', 'branding');
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          const safeData: Partial<BrandingSettings> = {};
          if (data.appName) safeData.appName = data.appName;
          if (data.tagline) safeData.tagline = data.tagline;
          if (data.subTagline) safeData.subTagline = data.subTagline;
          if (data.logoUrl !== undefined && data.logoUrl !== '') safeData.logoUrl = data.logoUrl;
          if (data.faviconUrl !== undefined && data.faviconUrl !== '') safeData.faviconUrl = data.faviconUrl;

          setBranding((prev) => {
            const merged = { ...prev, ...safeData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
          setIsLoading(false);
        }
      },
      (err) => {
        console.warn('Firestore branding listener notice:', err);
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Verify Admin Token on boot
  useEffect(() => {
    let isMounted = true;

    async function verifyAdminToken() {
      if (!adminToken) {
        if (isMounted) {
          setIsAdminAuthenticated(false);
          setIsVerifyingAdmin(false);
        }
        return;
      }
      try {
        const res = await fetch('/api/admin/verify', {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsAdminAuthenticated(Boolean(data.authenticated && (data.role === 'MASTER_ADMIN' || data.role === 'admin')));
            if (data.adminName) {
              setBranding((prev) => ({ ...prev, adminName: data.adminName }));
            }
          }
        } else {
          if (isMounted) {
            setIsAdminAuthenticated(false);
            setAdminToken(null);
            localStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (e) {
        if (isMounted) {
          setIsAdminAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsVerifyingAdmin(false);
        }
      }
    }

    verifyAdminToken();

    return () => {
      isMounted = false;
    };
  }, [adminToken]);

  const adminLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && (data.role === 'MASTER_ADMIN' || data.role === 'admin')) {
        setAdminToken(data.token);
        setIsAdminAuthenticated(true);
        setIsVerifyingAdmin(false);
        localStorage.setItem(TOKEN_KEY, data.token);

        if (data.adminName) {
          setBranding((prev) => ({ ...prev, adminName: data.adminName }));
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Incorrect username or password.' };
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      return { success: false, error: 'Incorrect username or password.' };
    }
  };

  const adminLogout = () => {
    const prevToken = adminToken;
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    setIsVerifyingAdmin(false);
    localStorage.removeItem(TOKEN_KEY);
    if (prevToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${prevToken}` },
      }).catch(() => {});
    }
  };

  const updateBranding = async (newSettings: Partial<BrandingSettings>) => {
    const updated = { ...branding, ...newSettings };
    setBranding(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    let serverError: string | null = null;
    let firestoreError: string | null = null;

    // 1. Persist to Server API
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/branding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updated),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          serverError = errData.error || `Server returned ${res.status}`;
        }
      } catch (e: any) {
        console.warn('Server branding persist error:', e);
        serverError = e?.message || 'Server request failed';
      }
    }

    // 2. Persist to Firestore Realtime Database (source of truth)
    try {
      await setDoc(doc(db, 'settings', 'branding'), updated, { merge: true });
    } catch (e: any) {
      console.warn('Firestore branding save error:', e);
      firestoreError = e?.message || 'Firestore database write failed';
    }

    // If both failed, throw to notify admin UI
    if (serverError && firestoreError) {
      throw new Error(`Failed to save branding: ${firestoreError}`);
    }
  };

  const restoreDefaultBranding = async () => {
    await updateBranding(DEFAULT_BRANDING);
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        updateBranding,
        restoreDefaultBranding,
        isAdminAuthenticated,
        isVerifyingAdmin,
        adminToken,
        adminLogin,
        adminLogout,
        isLoading,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
