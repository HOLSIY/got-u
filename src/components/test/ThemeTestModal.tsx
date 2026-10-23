import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, AlertTriangle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { runAutomatedThemeTest, ThemeTestReport } from '../../utils/themeTester';

interface ThemeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeTestModal: React.FC<ThemeTestModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, activeTab, setActiveTab } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ThemeTestReport | null>(null);

  if (!isOpen) return null;

  const handleStartTest = async () => {
    setIsRunning(true);
    setReport(null);

    const testReport = await runAutomatedThemeTest({
      setActiveTab,
      setTheme,
      currentTheme: theme,
      currentTab: activeTab,
    });

    setReport(testReport);
    setIsRunning(false);
  };

  const lightResults = report?.results.filter((r) => r.mode === 'light') || [];
  const darkResults = report?.results.filter((r) => r.mode === 'dark') || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#0a0b0e]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#ff2d60]" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Automated Theme Switcher Test</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Audits Chat, Feed, Notifications, & Profile DOM styling</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!report && !isRunning && (
            <div className="p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#ff2d60] mx-auto flex items-center justify-center">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Run Theme Integrity Suite</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                This test will automatically toggle through Light Mode and Dark Mode across Chat, Feed, Notifications, and Profile screens to inspect computed colors, text contrast, and dark leaks.
              </p>
              <button
                onClick={handleStartTest}
                className="mt-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#762DFA] text-white font-bold text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                Start Theme Audit
              </button>
            </div>
          )}

          {isRunning && (
            <div className="p-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#ff2d60] animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Running Automated Theme Test...</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Switching themes and inspecting screen DOM nodes...</p>
              </div>
            </div>
          )}

          {report && !isRunning && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  report.overallStatus === 'PASS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {report.overallStatus === 'PASS' ? (
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-black">
                      {report.overallStatus === 'PASS' ? 'ALL THEME TESTS PASSED' : 'THEME ISSUES DETECTED'}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {report.summary.passed} of {report.summary.total} checks passed ({report.timestamp})
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartTest}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Re-test
                </button>
              </div>

              {/* Grid Results Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {/* Light Mode Card */}
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#181b29] border border-slate-200 dark:border-white/10 space-y-2">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>☀️ Light Mode</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {lightResults.filter((r) => r.status === 'PASS').length}/{lightResults.length} PASS
                    </span>
                  </h5>
                  <div className="space-y-1.5">
                    {lightResults.map((r) => (
                      <div
                        key={r.screen}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/5"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{r.screen}</span>
                        <span
                          className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                            r.status === 'PASS'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#181b29] border border-slate-200 dark:border-white/10 space-y-2">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>🌙 Dark Mode</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {darkResults.filter((r) => r.status === 'PASS').length}/{darkResults.length} PASS
                    </span>
                  </h5>
                  <div className="space-y-1.5">
                    {darkResults.map((r) => (
                      <div
                        key={r.screen}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/5"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{r.screen}</span>
                        <span
                          className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                            r.status === 'PASS'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Issues List if any */}
              {report.results.some((r) => r.issues.length > 0) && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Detailed Issues Found
                  </h5>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-rose-700 dark:text-rose-300 font-mono">
                    {report.results.map((r) =>
                      r.issues.map((issue, idx) => (
                        <p key={`${r.screen}-${r.mode}-${idx}`}>
                          [{r.mode.toUpperCase()} - {r.screen}] {issue}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end bg-slate-50 dark:bg-[#0a0b0e]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
