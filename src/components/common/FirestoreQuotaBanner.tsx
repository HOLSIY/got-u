import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { FIRESTORE_UPGRADE_URL } from '../../lib/firebase';

export const FirestoreQuotaBanner: React.FC = () => {
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaEvent = (e: any) => {
      setQuotaExceeded(true);
      setDismissed(false);
    };

    window.addEventListener('nexus_firestore_quota_exceeded', handleQuotaEvent);
    return () => {
      window.removeEventListener('nexus_firestore_quota_exceeded', handleQuotaEvent);
    };
  }, []);

  if (!quotaExceeded || dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 text-xs flex items-center justify-between gap-2 z-50 backdrop-blur-md text-amber-800 dark:text-amber-200">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="truncate">
          <span className="font-semibold">Daily Cloud Quota Reached:</span>{' '}
          <span className="text-[11px] opacity-90">
            Free-tier daily write limit reached. Local caching is active.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={FIRESTORE_UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px] transition-colors"
        >
          <span>Quota details</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
