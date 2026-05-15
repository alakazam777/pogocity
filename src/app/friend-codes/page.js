'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function CodesAmisPage() {
    const { t } = useLanguage();
    const [trainers, setTrainers] = useState([]);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const fetchTrainers = async () => {
            try {
                const res = await fetch('/api/pokemon/leaderboard');
                if (res.ok) {
                    const data = await res.json();
                    setTrainers(data.filter(t => t.friendCode));
                }
            } catch (error) {
                console.error('Failed to load trainers:', error);
            }
        };
        fetchTrainers();
    }, []);

    const formatFriendCode = (code) => {
        if (!code) return '';
        return code.replace(/\D/g, '');
    };

    const copyToClipboard = async (code, id) => {
        try {
            await navigator.clipboard.writeText(code);
        } catch (err) {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent">
                    {t('rankings.friendCodes')}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
                    {trainers.map((trainer, index) => (
                        <motion.div
                            key={trainer.username}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors group w-full max-w-md"
                        >
                            <div className="w-16 h-16 rounded-full border-2 border-white/10 overflow-hidden bg-black flex-shrink-0">
                                {trainer.trainerImage ? (
                                    <img
                                        src={trainer.trainerImage}
                                        alt={trainer.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-xl">
                                        {trainer.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate text-lg" style={{ color: trainer.trainerColor }}>
                                    {trainer.username}
                                </h3>
                                <div
                                    className="mt-1 flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5 w-fit cursor-pointer hover:bg-black/50 transition-colors"
                                    onClick={() => copyToClipboard(trainer.friendCode, trainer.username)}
                                >
                                    <span className="font-mono text-pink-300 font-bold tracking-wider">
                                        {formatFriendCode(trainer.friendCode)}
                                    </span>
                                    {copiedId === trainer.username ? (
                                        <Check size={14} className="text-green-400" />
                                    ) : (
                                        <Copy size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {trainers.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {t('rankings.noFriendCodes')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
