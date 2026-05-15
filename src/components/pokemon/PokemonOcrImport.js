'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, Camera, Wand2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PokemonEditForm from './PokemonEditForm';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function PokemonOcrImport({ onSavedPokemon }) {
    const { t, lang } = useLanguage();
    const [stage, setStage] = useState('idle'); // idle | analyzing | review | success | error
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        if (!file) return;
        if (file.size > MAX_IMAGE_BYTES) {
            setStage('error');
            setError(t('manager.ocrErrorSize'));
            return;
        }

        // Show local preview while uploading
        const url = URL.createObjectURL(file);
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });

        setStage('analyzing');
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('lang', lang === 'fr' || lang === 'en' ? lang : 'fr');

        try {
            const res = await fetch('/api/pokemon-collection/import-ocr', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 401) { setStage('error'); setError(t('manager.importErrorAuth')); return; }
            if (res.status === 413) { setStage('error'); setError(t('manager.ocrErrorSize')); return; }
            if (res.status === 415) { setStage('error'); setError(t('manager.ocrErrorType')); return; }
            if (res.status === 429) {
                setStage('error');
                setError(data.error?.includes('Daily') ? t('manager.ocrErrorDailyLimit') : t('manager.importErrorRate'));
                return;
            }
            if (!res.ok) { setStage('error'); setError(data.error || t('manager.ocrErrorAnalysis')); return; }

            setAnalysis(data);
            setStage('review');
        } catch (err) {
            console.error(err);
            setStage('error');
            setError(t('manager.ocrErrorAnalysis'));
        }
    }, [lang, t]);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    };

    const onFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    const handleSavePokemon = async (payload) => {
        const res = await fetch('/api/pokemon-collection/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ pokemon: { ...payload, source: 'ocr' } }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t('manager.form.errorGeneric'));
        setStage('success');
        if (onSavedPokemon) onSavedPokemon(data);
    };

    const reset = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setAnalysis(null);
        setError(null);
        setStage('idle');
    };

    // ─── render ───

    if (stage === 'review' && analysis) {
        // Convert OCR stats → form initial values
        const s = analysis.stats || {};
        const initialValues = {
            name: s.name || '',
            cp: s.cp || '',
            hp: s.hpMax || s.hp || '',
            level: s.level || '',
            weight: s.weight || '',
            height: s.height || '',
            // OCR can't reliably extract these; user fills manually
            iv: { atk: 0, def: 0, sta: 0 },
            fastMove: '',
            chargedMove: '',
            types: [],
            source: 'ocr',
        };

        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm">
                    <Wand2 size={16} className="text-purple-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-purple-200 font-medium">
                            {analysis.source === 'vision' ? t('manager.ocrAnalyzedVision') : t('manager.ocrAnalyzedTesseract')}
                        </p>
                        {analysis.quota && (
                            <p className="text-xs text-gray-400 mt-1">
                                {t('manager.ocrQuotaInfo')
                                    .replace('{used}', analysis.quota.used)
                                    .replace('{limit}', analysis.quota.limit)}
                            </p>
                        )}
                    </div>
                </div>

                {previewUrl && (
                    <div className="flex justify-center">
                        <img src={previewUrl} alt="screenshot preview"
                            className="max-h-48 rounded-lg border border-white/10" />
                    </div>
                )}

                <PokemonEditForm
                    initialValues={initialValues}
                    onSave={handleSavePokemon}
                    onCancel={reset}
                />
            </div>
        );
    }

    if (stage === 'success') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm">
                    <CheckCircle2 size={20} />
                    <span>{t('manager.ocrSavedSuccess')}</span>
                </div>
                <button type="button" onClick={reset}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                    <Camera size={16} />
                    {t('manager.tabOcr')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20 hover:border-white/40 bg-black/20'}
                    ${stage === 'analyzing' ? 'pointer-events-none opacity-60' : ''}`}
            >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInput} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                    {stage === 'analyzing' ? (
                        <>
                            <Loader2 size={36} className="text-purple-300 animate-spin" />
                            <p className="text-sm text-gray-300">{t('manager.ocrAnalyzing')}</p>
                        </>
                    ) : (
                        <>
                            <Camera size={36} className="text-purple-300" />
                            <p className="text-sm text-gray-200">
                                {dragOver ? t('manager.ocrDropActive') : t('manager.ocrDropHere')}
                            </p>
                            <button type="button"
                                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            >
                                <Upload size={16} />
                                {t('manager.browseButton')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {stage === 'error' && error && (
                <div className="flex items-start gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
