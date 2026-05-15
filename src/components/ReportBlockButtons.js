'use client';

import { useState, useEffect, useRef } from 'react';
import { Flag, Ban, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const REPORT_REASONS = ['inappropriate', 'spam', 'harassment', 'other'];

export default function ReportBlockButtons({ targetUsername, contentType, contentId, size = 'sm' }) {
    const { t } = useLanguage();
    const [showReportMenu, setShowReportMenu] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const menuRef = useRef(null);

    // Check if user is blocked on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/block');
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data.blocked) {
                        setIsBlocked(data.blocked.some(
                            u => u.toLowerCase() === targetUsername.toLowerCase()
                        ));
                    }
                }
            } catch { /* not logged in or network error */ }
        })();
        return () => { cancelled = true; };
    }, [targetUsername]);

    // Close menu on outside click
    useEffect(() => {
        if (!showReportMenu) return;
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowReportMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showReportMenu]);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const showToast = (msg) => setToast(msg);

    const handleReport = async (reason) => {
        setShowReportMenu(false);
        setLoading(true);
        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUsername, contentType, contentId, reason }),
            });
            if (res.ok) {
                setReportSent(true);
                showToast(t('moderation.reportSent'));
            } else {
                const data = await res.json().catch(() => ({}));
                if (data.alreadyReported) {
                    setReportSent(true);
                    showToast(t('moderation.alreadyReported'));
                } else {
                    showToast(t('moderation.reportFailed'));
                }
            }
        } catch {
            showToast(t('moderation.reportFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async () => {
        if (!confirm(t('moderation.confirmBlock'))) return;
        setLoading(true);
        try {
            const res = await fetch('/api/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockedUsername: targetUsername }),
            });
            if (res.ok) {
                setIsBlocked(true);
                showToast(t('moderation.blockSuccess'));
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/block', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockedUsername: targetUsername }),
            });
            if (res.ok) {
                setIsBlocked(false);
                showToast(t('moderation.unblockSuccess'));
            }
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    };

    // Don't show for own profile (check client-side)
    const [myUsername, setMyUsername] = useState(null);
    useEffect(() => {
        try {
            const u = localStorage.getItem('pokemon_user');
            if (u) setMyUsername(JSON.parse(u).username);
        } catch { /* ignore */ }
    }, []);
    if (myUsername && myUsername.toLowerCase() === targetUsername.toLowerCase()) return null;

    const iconSize = size === 'sm' ? 14 : 16;

    return (
        <div className="relative inline-flex items-center gap-1">
            {/* Report button */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowReportMenu(!showReportMenu); }}
                    disabled={loading || reportSent}
                    className={`p-1.5 rounded-lg transition-colors ${
                        reportSent
                            ? 'text-green-400 cursor-default'
                            : 'text-gray-500 hover:text-red-400 hover:bg-white/5'
                    }`}
                    title={reportSent ? t('moderation.reportSent') : t('moderation.report')}
                >
                    {reportSent ? <ShieldCheck size={iconSize} /> : <Flag size={iconSize} />}
                </button>

                {/* Report reason dropdown.
                    Anchored from the LEFT edge of the flag button so the
                    200px-wide menu extends to the right where there's
                    room — `right-0` (the previous default) anchored to the
                    right of the button and pushed the menu off the left
                    side of the screen on narrow mobile modals. */}
                {showReportMenu && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[200px]">
                        <div className="px-3 py-2 border-b border-white/10 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            {t('moderation.reportReason')}
                        </div>
                        {REPORT_REASONS.map((reason) => (
                            <button
                                key={reason}
                                onClick={(e) => { e.stopPropagation(); handleReport(reason); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                {t(`moderation.${reason}`)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Block/Unblock button */}
            {isBlocked ? (
                <button
                    onClick={(e) => { e.stopPropagation(); handleUnblock(); }}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    title={t('moderation.unblock')}
                >
                    <Ban size={iconSize} />
                    <span>{t('moderation.blocked')}</span>
                </button>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); handleBlock(); }}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title={t('moderation.block')}
                >
                    <Ban size={iconSize} />
                </button>
            )}

            {/* Toast notification */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-xl bg-[#1a1a2e] border border-white/10 text-sm text-white shadow-2xl">
                    {toast}
                </div>
            )}
        </div>
    );
}
