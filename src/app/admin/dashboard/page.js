'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Search, Trash2, Edit2, X, Upload, Loader2, EyeOff } from 'lucide-react';

export default function AdminDashboard() {
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.status === 401) {
                router.push('/admin');
                return;
            }
            const data = await res.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!selectedUser || !editForm) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: selectedUser,
                    data: editForm
                })
            });

            if (res.ok) {
                alert('Sauvegardé !');
                fetchUsers();
                // Don't clear selected user so we can keep editing
            } else {
                alert('Erreur lors de la sauvegarde');
            }
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const deleteUser = async (username) => {
        if (!confirm(`Supprimer définitivement ${username} ?`)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    data: null // Null to delete
                })
            });

            if (res.ok) {
                fetchUsers();
                setSelectedUser(null);
            }
        } catch (error) {
            alert('Erreur suppression');
        }
    };

    const deleteHistoryEntry = (entryId) => {
        if (!confirm('Supprimer cette entrée d\'historique ?')) return;
        const newHistory = (editForm.history || []).filter(h => h.id !== entryId);
        setEditForm({ ...editForm, history: newHistory });
    };

    const handleAdminImageUpload = async (e) => {
        let file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            // HEIC conversion (client-side)
            if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
                try {
                    const heic2any = (await import('heic2any')).default;
                    const blob = await heic2any({
                        blob: file,
                        toType: "image/jpeg",
                        quality: 0.8
                    });
                    file = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                } catch (error) {
                    throw new Error('Impossible de convertir l\'image HEIC.');
                }
            }

            // 0. Preprocess (Upscale)
            let processedFile = file;
            try {
                const blob = await preprocessImage(file);
                processedFile = new File([blob], "processed.jpg", { type: "image/jpeg" });
            } catch (e) {
                console.warn("Preprocessing failed:", e);
            }

            // 1. Client-Side OCR
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('fra');
            const ret = await worker.recognize(processedFile);
            const text = ret.data.text;
            await worker.terminate();

            console.log("Admin Client OCR:", text);
            // DEBUG: Show user what was read to diagnose issues
            // alert("DEBUG OCR (First 1000 chars):\n" + text.substring(0, 1000));

            const detectedStats = parsePokemonStatsClient(text);

            if (!detectedStats || Object.keys(detectedStats).length === 0) {
                throw new Error('Aucune statistique reconnue. (OCR vide)');
            }

            // 2. Upload
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });

            if (!uploadRes.ok) throw new Error('Upload failed');
            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.url;


            // 3. Update Edit Form
            const newStats = { ...editForm.stats };

            if (detectedStats.xp) newStats.xp = detectedStats.xp;
            // if (detectedStats.level) newStats.level = detectedStats.level; // Auto detection disabled
            if (detectedStats.distance) newStats.distance = detectedStats.distance;
            if (detectedStats.caught) newStats.caught = detectedStats.caught;
            if (detectedStats.stops) newStats.stops = detectedStats.stops;

            // Update form
            setEditForm({
                ...editForm,
                stats: newStats,
                trainerImage: imageUrl, // Update main image too? Yes usually desired.
                history: [
                    ...(editForm.history || []),
                    {
                        id: `admin-upload-${Date.now()}`,
                        date: new Date().toISOString(),
                        stats: newStats,
                        screenshot: imageUrl
                    }
                ]
            });

            alert('Analyse terminée et formulaire mis à jour ! Pensez à sauvegarder.');

        } catch (error) {
            console.error(error);
            alert('Erreur: ' + error.message);
        } finally {
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const filteredUsers = Object.entries(users).filter(([username]) =>
        username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-white">Chargement...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-8 text-purple-400">Administration Dresseurs</h1>

            <div className="flex gap-8">
                {/* Sidebar List */}
                <div className="w-1/3 bg-white/5 rounded-2xl border border-white/10 p-4 h-[calc(100vh-120px)] flex flex-col">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Chercher un dresseur..."
                            className="w-full pl-10 pr-4 py-2 bg-black/40 rounded-lg border border-white/10 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-2">
                        {filteredUsers.map(([username, data]) => (
                            <div
                                key={username}
                                onClick={() => {
                                    setSelectedUser(username);
                                    setEditForm(JSON.parse(JSON.stringify(data)));
                                }}
                                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedUser === username ? 'bg-purple-600' : 'hover:bg-white/10 bg-black/20'} ${data.hidden ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    {data.hidden && <EyeOff size={14} />}
                                    <span className="font-medium">{username}</span>
                                </div>
                                <span className="text-xs opacity-70">Niv. {data.stats?.level || '?'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-6 h-[calc(100vh-120px)] overflow-y-auto relative">
                    {selectedUser && editForm ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold">{selectedUser} {editForm.hidden && <span className="text-sm bg-red-500/20 text-red-400 px-2 py-1 rounded ml-2">Masqué</span>}</h2>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => deleteUser(selectedUser)}
                                        className="text-red-400 hover:text-red-300 transition-colors p-2"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 font-bold"
                                    >
                                        <Save size={18} />
                                        Sauvegarder
                                    </button>
                                </div>
                            </div>

                            {/* Screenshots & OCR */}
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
                                    <Upload size={18} />
                                    Gestion des Captures
                                </h3>

                                <div className="flex items-start gap-6">
                                    {/* Upload New */}
                                    <div className="w-1/3">
                                        <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isProcessing ? <Loader2 className="animate-spin mb-2" /> : <Upload className="mb-2" />}
                                            <span className="text-sm text-center px-4">
                                                {isProcessing ? 'Analyse en cours...' : 'Uploader une capture pour ce joueur'}
                                            </span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAdminImageUpload} />
                                        </label>
                                    </div>

                                    {/* History Gallery */}
                                    <div className="flex-1 overflow-x-auto">
                                        <div className="flex gap-2 pb-2">
                                            {editForm.trainerImage && (
                                                <div className="relative shrink-0 w-24 h-32 rounded-lg border-2 border-green-500 overflow-hidden group">
                                                    <img src={editForm.trainerImage} className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 text-[10px] w-full text-center bg-green-500 text-white">Actuelle</span>
                                                </div>
                                            )}
                                            {editForm.history?.filter(h => h.screenshot && h.id && h.screenshot !== editForm.trainerImage).map((h, i) => (
                                                <div key={i} className="relative shrink-0 w-24 h-32 rounded-lg border border-white/10 overflow-hidden group">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); deleteHistoryEntry(h.id); }}
                                                        className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                        title="Supprimer cette capture"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <img src={h.screenshot} className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 text-[8px] w-full text-center bg-black/60 text-white">
                                                        {new Date(h.date).toLocaleDateString()}
                                                    </span>
                                                    <a href={h.screenshot} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs">Voir</a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Basic Stats */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-purple-300 border-b border-white/5 pb-2">Statistiques Principales</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 mb-1">Visibilité</label>
                                        <select
                                            value={editForm.hidden ? 'true' : 'false'}
                                            onChange={e => setEditForm({ ...editForm, hidden: e.target.value === 'true' })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                        >
                                            <option value="false">Visible</option>
                                            <option value="true">Masqué (Hidden)</option>
                                        </select>
                                    </div>
                                    {['level', 'xp', 'caught', 'stops', 'distance'].map(stat => (
                                        <div key={stat}>
                                            <label className="block text-xs uppercase text-gray-400 mb-1">{stat}</label>
                                            <input
                                                type="number"
                                                value={editForm.stats?.[stat] || 0}
                                                onChange={e => setEditForm({
                                                    ...editForm,
                                                    stats: { ...editForm.stats, [stat]: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 mb-1">Équipe (Bravoure/Sagesse/Intuition)</label>
                                        <select
                                            value={editForm.team || ''}
                                            onChange={e => setEditForm({ ...editForm, team: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                        >
                                            <option value="">-- Aucune --</option>
                                            <option value="Bravoure">Bravoure (Rouge)</option>
                                            <option value="Sagesse">Sagesse (Bleu)</option>
                                            <option value="Intuition">Intuition (Jaune)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 mb-1">Code Ami</label>
                                        <input
                                            type="text"
                                            value={editForm.friendCode || ''}
                                            onChange={e => setEditForm({ ...editForm, friendCode: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 mb-1">Ville</label>
                                        <input
                                            type="text"
                                            value={editForm.stats?.city || ''}
                                            onChange={e => setEditForm({
                                                ...editForm,
                                                stats: { ...editForm.stats, city: e.target.value }
                                            })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 mb-1">Couleur</label>
                                        <input
                                            type="text"
                                            value={editForm.trainerColor || ''}
                                            onChange={e => setEditForm({ ...editForm, trainerColor: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Medals (Simplified) */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-purple-300 border-b border-white/5 pb-2">Médailles & Dex</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {['pokedex', 'shinydex', 'xxldex', 'xxsdex', 'shadow', 'purified', 'hundo'].map(medal => (
                                        <div key={medal}>
                                            <label className="block text-xs uppercase text-gray-400 mb-1">{medal}</label>
                                            <input
                                                type="number"
                                                value={editForm.medals?.[medal] || 0}
                                                onChange={e => setEditForm({
                                                    ...editForm,
                                                    medals: { ...editForm.medals, [medal]: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw JSON fallback */}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-lg font-semibold text-gray-400">Raw JSON (Avancé)</h3>
                                <textarea
                                    value={JSON.stringify(editForm, null, 2)}
                                    onChange={e => {
                                        try {
                                            setEditForm(JSON.parse(e.target.value));
                                        } catch (err) {/* invalid JSON */ }
                                    }}
                                    className="w-full h-64 bg-black/40 font-mono text-xs border border-white/10 rounded p-4"
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            Sélectionnez un dresseur pour l'éditer
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper function (Client Side)
function parsePokemonStatsClient(text) {
    const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
    const stats = {};

    // Helper to find number in a line
    const extractNumber = (str) => {
        const cleanStr = str.replace(/km/g, '');
        // Match number with possible separators (space, comma, dot)
        const matches = cleanStr.match(/(\d[\d\s,.]*\d|\d)/g);
        if (!matches) return null;

        const numbers = matches.map(m => {
            // Remove all non-numeric characters except initial comma if it was a decimal
            // Actually, for stats like 27600,0 we want 27600.
            // If it matches numbers like "27 600,0", extractNumber logic:
            // 1. Remove "km" (already done)
            // 2. We matched `(\d[\d\s,.]*\d|\d)`
            // User issue: "27600,0" became "276000" because replace(/[\s,.]/g, '') removed the comma but kept the 0.

            // Fix: If there is a decimal separator (, or .), take only the part BEFORE it.
            // But be careful about thousands separators.
            // Assumption: Decimal part is usually small (1-2 digits) at end of string or logic
            // Better heuristic for OCR: Stats are integers. Distance might have comma.
            // If the string contains a comma or dot near the end (1 or 2 digits after), treat as decimal separator.
            let integerPart = m;
            if (/[,.]\d{1,2}$/.test(m)) {
                integerPart = m.replace(/[,.]\d{1,2}$/, '');
            }
            // Now remove spaces and remaining dots/commas (thousands separators)
            return parseInt(integerPart.replace(/[\s,.]/g, ''), 10);
        });

        return numbers[0];
    };

    const findStat = (keywords) => {
        for (const line of lines) {
            if (keywords.some(k => line.includes(k))) {
                let num = extractNumber(line);
                if (num !== null) return num;
                const index = lines.indexOf(line);
                if (index < lines.length - 1) {
                    num = extractNumber(lines[index + 1]);
                    if (num !== null) return num;
                }
                if (index > 0) {
                    num = extractNumber(lines[index - 1]);
                    if (num !== null) return num;
                }
            }
        }
        return null;
    };

    const xpMatch = text.replace(/\s/g, '').match(/total(?:de)?(?:xp|px)[:\s]*(\d+)/i) ||
        text.match(/total\s+(?:de\s+)?(?:xp|px)\s*[:\s]*([\d\s]+)/i);

    if (xpMatch) {
        // remove non-digits
        stats.xp = parseInt(xpMatch[1].replace(/\D/g, ''));
    } else {
        stats.xp = findStat(['total xp', 'xp total', 'expérience', 'experience', 'total de px']);
    }

    // Fallback: If no XP found, look for largest number > 1,000,000
    if (!stats.xp) {
        const allNumbers = lines.map(l => extractNumber(l)).filter(n => n !== null && n > 1000000);
        if (allNumbers.length > 0) {
            stats.xp = Math.max(...allNumbers);
        }
    }

    const levelMatch = text.match(/(?:niveau|level|lvl|niv)[\s.:]*(\d{1,3})/i);
    if (levelMatch && parseInt(levelMatch[1]) <= 100) {
        stats.level = parseInt(levelMatch[1]);
    } else {
        const nivIndex = lines.findIndex(l => /niveau|level/.test(l));
        if (nivIndex !== -1) {
            // Try same line
            let num = extractNumber(lines[nivIndex]);
            if (num && num <= 100) stats.level = num;

            // Try prev lines (up to 3) - Looking for circle text like "80" above "NIVEAU"
            if (!stats.level && nivIndex > 0) {
                for (let i = 1; i <= 3; i++) {
                    if (nivIndex - i < 0) break;
                    const prevLine = lines[nivIndex - i];

                    const num = extractNumber(prevLine);

                    if (num !== null && num >= 1 && num <= 100) {
                        stats.level = num;
                        break; // Found it closest to NIVEAU
                    }
                }
            }

            // Try next line (Niveau \n 80)
            if (!stats.level && nivIndex < lines.length - 1) {
                num = extractNumber(lines[nivIndex + 1]);
                if (num && num <= 100) stats.level = num;
            }
        }
    }

    stats.distance = findStat(['distance', 'km', 'walked', 'marchée']);
    stats.caught = findStat(['caught', 'attrapés', 'pokemon caught']);
    stats.stops = findStat(['stops', 'visités', 'visited']);

    return stats;
}

// Helper to preprocess image for better OCR (Upscaling)
const preprocessImage = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Scale up 2x for better small text recognition
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};
