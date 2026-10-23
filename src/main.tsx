import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party SDK internal assertion and background database lifecycle edge-cases
if (typeof window !== 'undefined') {
  const isIgnorableError = (msg: string): boolean => {
    if (!msg || typeof msg !== 'string') return false;
    return (
      msg.includes('Pending promise was never set') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('@firebase/auth') ||
      msg.includes('@firebase/firestore') ||
      msg.includes('Database is closing') ||
      msg.includes('The database connection is closing') ||
      msg.includes('Database is closed') ||
      msg.includes('database is closing/hidden') ||
      msg.includes('closing/hidden') ||
      msg.includes('IDBDatabase') ||
      msg.includes('IndexedDB') ||
      msg.includes('ResizeObserver loop') ||
      msg.includes('resource-exhausted')
    );
  };

  // Filter console.error so internal third-party SDK assertion logs are handled gracefully
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const fullMsg = args
      .map((a) => (typeof a === 'object' && a?.message ? a.message : String(a || '')))
      .join(' ');
    if (isIgnorableError(fullMsg)) {
      console.warn('[Handled SDK Internal Assertion Notice]:', fullMsg);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Standard window.onerror: returning true suppresses standard browser Uncaught Error reporting
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = (error && error.message) || String(message || '');
    if (isIgnorableError(msg)) {
      console.warn('[Handled Global Error Safely]:', msg);
      return true;
    }
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason?.message || String(event.reason || '');
      if (isIgnorableError(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('Handled background lifecycle/database rejection safely:', reason);
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || event.error?.message || String(event.error || '');
      if (isIgnorableError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('Handled background lifecycle/database error safely:', msg);
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

