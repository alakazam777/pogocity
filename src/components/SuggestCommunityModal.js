'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import CommunityIcon from '@/components/CommunityIcon';

export default function SuggestCommunityModal({ city: presetCity, onClose, onSubmitted }) {
    const { t } = useLanguage();
    const cityEditable = !presetCity;
    const [city, setCity] = useState(presetCity || '');
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState('discord');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const TYPES = [
        { value: 'discord',   label: t('community.typeDiscord')   },
        { value: 'campfire',  label: t('community.typeCampfire')  },
        { value: 'messenger', label: t('community.typeMessenger') },
        { value: 'telegram',  label: t('community.typeTelegram')  },
        { value: 'whatsapp',  label: t('community.typeWhatsapp')  },
        { value: 'website',   label: t('community.typeWebsite')   },
    ];

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch('/api/community', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: city.toLowerCase().trim(), name, url, type }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('community.errMissingFields'));
            setSuccess(true);
            setTimeout(() => onSubmitted?.(), 1500);
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-md bg-[#0a0a18] border border-white/10 rounded-2xl p-6 text-white shadow-2xl"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                            {cityEditable ? t('community.modalTitleAdd') : t('community.modalTitleSuggest')}
                        </h3>
                        {!cityEditable && (
                            <p className="text-sm text-white/60 capitalize mt-0.5">
                                {t('community.forCity', { city: presetCity })}
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white text-xl leading-none">×</button>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-3">✓</div>
                        <p className="font-semibold">{t('community.thanks')}</p>
                        <p className="text-sm text-white/60 mt-1">{t('community.review')}</p>
                    </div>
                ) : (
                    <>
                        {cityEditable && (
                            <>
                                <label className="block text-xs text-white/60 mb-1.5">{t('community.cityLabel')}</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    required
                                    maxLength={60}
                                    placeholder={t('community.cityPlaceholder')}
                                    className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                                />
                            </>
                        )}

                        <label className="block text-xs text-white/60 mb-1.5">{t('community.typeLabel')}</label>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {TYPES.map(tp => (
                                <button
                                    type="button"
                                    key={tp.value}
                                    onClick={() => setType(tp.value)}
                                    className={`px-2 py-2 rounded-lg border text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 ${
                                        type === tp.value
                                            ? 'border-white/40 bg-white/10 text-white'
                                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                    }`}
                                >
                                    <CommunityIcon type={tp.value} size={16} brandColor={type === tp.value} />
                                    <span className="truncate">{tp.label}</span>
                                </button>
                            ))}
                        </div>

                        <label className="block text-xs text-white/60 mb-1.5">{t('community.nameLabel')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={80}
                            placeholder={t('community.namePlaceholder')}
                            className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />

                        <label className="block text-xs text-white/60 mb-1.5">{t('community.urlLabel')}</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                            placeholder={t('community.urlPlaceholder')}
                            className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />

                        {error && (
                            <p className="text-sm text-red-400 mb-3">{error}</p>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                {t('community.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-2 rounded-full disabled:opacity-50 transition-all font-semibold"
                                style={{
                                    background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
                                    color: '#1e293b',
                                    boxShadow: '0 4px 14px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
                                }}
                            >
                                {submitting ? t('community.sending') : t('community.submit')}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
