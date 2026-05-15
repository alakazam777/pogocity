'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronDown, ChevronRight, Upload, Loader2,
    AlertCircle, CheckCircle2, Info, FileText, Camera, Pencil, ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PokemonEditForm from './PokemonEditForm';
import PokemonOcrImport from './PokemonOcrImport';
import PokemonCollectionView from './PokemonCollectionView';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatLabel(format, t) {
    if (format === 'pokegenie') return t('manager.formatPokegenie');
    if (format === 'calcyiv') return t('manager.formatCalcyiv');
    return t('manager.formatGeneric');
}

export default function PokemonManager() {
    const { t, lang } = useLanguage();
    const dashboardHref = lang === 'en' ? '/manager' : '/box';
    const [open, setOpen] = useState(true);
    const [tab, setTab] = useState('ocr');
    const [listRefreshKey, setListRefreshKey] = useState(0);
    const [summary, setSummary] = useState(null);
    const [authMissing, setAuthMissing] = useState(false);

    const refreshSummary = useCallback(async () => {
        try {
            const res = await fetch('/api/pokemon-collection/summary', { credentials: 'include' });
            if (res.status === 401) { setAuthMissing(true); return; }
            if (!res.ok) return;
            const data = await res.json();
            setSummary(data.summary);
            setAuthMissing(false);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => { refreshSummary(); }, [refreshSummary]);

    return (
        <div className="mb-8 w-full rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl overflow-hidden">
            <div
                role="button" tabIndex={0}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
                className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <span className="w-2 h-8 bg-purple-500 rounded-full flex-shrink-0"></span>
                    {open ? <ChevronDown size={20} className="text-purple-300 flex-shrink-0" />
                        : <ChevronRight size={20} className="text-purple-300 flex-shrink-0" />}
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            {t('manager.title')}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                            {summary?.count > 0
                                ? t('manager.countLabel').replace('{count}', summary.count.toLocaleString())
                                : t('manager.empty')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {summary?.count > 0 && (
                        <div className="hidden sm:flex items-center gap-2 text-xs">
                            {summary.hundo > 0 && (
                                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                    {summary.hundo} Hundo
                                </span>
                            )}
                            {summary.shundo > 0 && (
                                <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                    {summary.shundo} Shundo
                                </span>
                            )}
                        </div>
                    )}
                    <a href={dashboardHref}
                        onClick={(e) => e.stopPropagation()}
                        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors shadow-md">
                        <ExternalLink size={13} />
                        {t('manager.list.viewAll')}
                    </a>
                </div>
            </div>

            {open && (
                <div className="px-4 md:px-6 pb-6 pt-2 space-y-4 border-t border-white/5">
                    {authMissing && (
                        <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                            <AlertCircle size={16} />
                            <span>{t('manager.importErrorAuth')}</span>
                        </div>
                    )}

                    <PokemonCollectionView
                        key={`compact-${listRefreshKey}`}
                        variant="compact"
                        onChange={(s) => setSummary(s)}
                    />

                    <div className="flex gap-1 border-b border-white/10">
                        <TabButton active={tab === 'ocr'} onClick={() => setTab('ocr')} icon={Camera} label={t('manager.tabOcr')} />
                        <TabButton active={tab === 'csv'} onClick={() => setTab('csv')} icon={FileText} label={t('manager.tabCsv')} />
                        <TabButton active={tab === 'manual'} onClick={() => setTab('manual')} icon={Pencil} label={t('manager.tabManual')} />
                    </div>

                    {tab === 'csv' && <CsvTab summary={summary} onChange={(s) => { setSummary(s); setListRefreshKey((k) => k + 1); }} t={t} />}
                    {tab === 'ocr' && <PokemonOcrImport onSavedPokemon={() => { refreshSummary(); setListRefreshKey((k) => k + 1); }} />}
                    {tab === 'manual' && <ManualTab onSavedPokemon={() => { refreshSummary(); setListRefreshKey((k) => k + 1); }} t={t} />}
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                ${active
                    ? 'border-purple-400 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20'}`}
        >
            <Icon size={16} />
            <span>{label}</span>
        </button>
    );
}

// ─── Manual tab ───

function ManualTab({ onSavedPokemon, t }) {
    const [savedAt, setSavedAt] = useState(null);

    const handleSave = async (payload) => {
        const res = await fetch('/api/pokemon-collection/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pokemon: { ...payload, source: 'manual' } }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t('manager.form.errorGeneric'));
        setSavedAt(Date.now());
        if (onSavedPokemon) onSavedPokemon(data);
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-400">{t('manager.ocrManualHelp')}</p>
            {savedAt && (
                <div key={savedAt} className="flex items-center gap-2 text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                    <CheckCircle2 size={16} />
                    <span>{t('manager.ocrSavedSuccess')}</span>
                </div>
            )}
            <PokemonEditForm
                key={savedAt || 'fresh'}
                initialValues={{}}
                onSave={handleSave}
            />
        </div>
    );
}

// ─── CSV tab ───

function CsvTab({ summary, onChange, t }) {
    const [mode, setMode] = useState('append');
    const [dragOver, setDragOver] = useState(false);
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [showErrors, setShowErrors] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
            setStatus('error');
            setResult({ error: t('manager.importErrorSize') });
            return;
        }
        if (mode === 'replace' && summary?.count > 0) {
            if (!window.confirm(t('manager.confirmReplace'))) return;
        }

        setStatus('reading');
        setResult(null);

        let csvContent;
        try { csvContent = await file.text(); }
        catch { setStatus('error'); setResult({ error: t('manager.importErrorGeneric') }); return; }

        setStatus('uploading');
        try {
            const res = await fetch('/api/pokemon-collection/import-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ csvContent, mode }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 401) { setStatus('error'); setResult({ error: t('manager.importErrorAuth') }); return; }
            if (res.status === 413) { setStatus('error'); setResult({ error: t('manager.importErrorSize') }); return; }
            if (res.status === 429) { setStatus('error'); setResult({ error: t('manager.importErrorRate') }); return; }
            if (!res.ok) {
                setStatus('error');
                setResult({ error: data?.error || t('manager.importErrorFormat'), errors: data?.errors });
                return;
            }

            setStatus('done');
            setResult({ success: true, imported: data.imported, format: data.format, errors: data.errors || [] });
            if (onChange && data.summary) onChange(data.summary);
        } catch {
            setStatus('error');
            setResult({ error: t('manager.importErrorGeneric') });
        }
    }, [mode, summary, t, onChange]);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const onFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-400">{t('manager.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="csv-mode" value="append"
                        checked={mode === 'append'} onChange={() => setMode('append')}
                        className="accent-purple-500" />
                    <span className="text-gray-200">{t('manager.modeAppend')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="csv-mode" value="replace"
                        checked={mode === 'replace'} onChange={() => setMode('replace')}
                        className="accent-red-500" />
                    <span className="text-gray-200">{t('manager.modeReplace')}</span>
                </label>
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20 hover:border-white/40 bg-black/20'}
                    ${status === 'reading' || status === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
            >
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onFileInput} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                    {status === 'reading' || status === 'uploading' ? (
                        <>
                            <Loader2 size={36} className="text-purple-300 animate-spin" />
                            <p className="text-sm text-gray-300">{t('manager.importing')}</p>
                        </>
                    ) : (
                        <>
                            <Upload size={36} className="text-purple-300" />
                            <p className="text-sm text-gray-200">
                                {dragOver ? t('manager.dropActive') : t('manager.dropHere')}
                            </p>
                            <button type="button"
                                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            >
                                <FileText size={16} />
                                {t('manager.browseButton')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {status === 'done' && result?.success && (
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <CheckCircle2 size={16} />
                        <span>
                            {result.errors?.length > 0
                                ? t('manager.importPartial')
                                    .replace('{count}', result.imported)
                                    .replace('{errors}', result.errors.length)
                                : t('manager.importSuccess')
                                    .replace('{count}', result.imported)
                                    .replace('{format}', formatLabel(result.format, t))}
                        </span>
                    </div>
                    {result.errors?.length > 0 && (
                        <div>
                            <button type="button" onClick={() => setShowErrors((v) => !v)}
                                className="text-xs text-amber-300 hover:underline">
                                {showErrors ? '▼' : '▶'} {t('manager.errorsToggle').replace('{count}', result.errors.length)}
                            </button>
                            {showErrors && (
                                <ul className="mt-2 max-h-40 overflow-y-auto bg-black/30 rounded-lg p-3 text-xs text-gray-300 space-y-1">
                                    {result.errors.slice(0, 50).map((err, i) => (
                                        <li key={i}>L{err.row}: {err.message}</li>
                                    ))}
                                    {result.errors.length > 50 && (
                                        <li className="text-gray-500">… {result.errors.length - 50} more</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}

            {status === 'error' && result?.error && (
                <div className="flex items-start gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p>{result.error}</p>
                        {result.errors?.length > 0 && (
                            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-red-200/80 space-y-1">
                                {result.errors.slice(0, 10).map((err, i) => (
                                    <li key={i}>L{err.row}: {err.message}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <details className="text-sm group">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-200 flex items-center gap-2 select-none">
                    <Info size={14} />
                    <span>{t('manager.helpTitle')}</span>
                </summary>
                <div className="mt-2 pl-6 space-y-1 text-xs text-gray-400">
                    <p>{t('manager.helpPokegenie')}</p>
                    <p>{t('manager.helpCalcyiv')}</p>
                </div>
            </details>
        </div>
    );
}
