'use client';

import { useState, useEffect } from 'react';
import { Search, Save, X, Users } from 'lucide-react';
import PokemonChecklist from '@/components/pokemon/PokemonChecklist';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);

    // Trainer Management State
    const [trainers, setTrainers] = useState({});
    const [selectedTrainer, setSelectedTrainer] = useState(null);
    const [trainerSearch, setTrainerSearch] = useState('');
    const [checklistChanges, setChecklistChanges] = useState(null);

    // Presentations Management
    const [presentations, setPresentations] = useState([]);
    const [showPresentations, setShowPresentations] = useState(false);

    // Homepage Settings
    const [homepageSettings, setHomepageSettings] = useState({
        hazeOpacity: 0.3,
        starBlinkSpeed: 3,
        shootingStarFreq: 5,
        forceSnow: false
    });

    const fetchHomepageSettings = async () => {
        try {
            const res = await fetch(`/api/settings?t=${Date.now()}`);
            const data = await res.json();
            if (data) setHomepageSettings(prev => ({ ...prev, ...data }));
        } catch (e) { console.error(e); }
    };

    const saveHomepageSettings = async () => {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(homepageSettings)
            });
            alert("Paramètres homepage sauvegardés !");
        } catch (e) {
            alert("Erreur lors de la sauvegarde");
        }
    };


    const fetchPresentations = async () => {
        try {
            const res = await fetch('/api/presentations');
            const data = await res.json();
            setPresentations(data);
        } catch (error) {
            console.error('Failed to fetch presentations', error);
        }
    };

    // Toggle presentation visibility (using the same API as before)
    const handleHidePresentation = async (id) => {
        if (!confirm("Masquer cette présentation ?")) return;
        try {
            const res = await fetch('/api/admin/presentations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setPresentations(prev => prev.filter(p => p.id !== id));
            }
        } catch (e) { console.error(e); }
    };

    const handleEditPresentation = async (id, currentContent) => {
        const newContent = prompt("Modifier le contenu de la présentation :", currentContent);
        if (newContent === null || newContent === currentContent) return;

        try {
            const res = await fetch('/api/admin/presentations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, content: newContent })
            });

            if (res.ok) {
                setPresentations(prev => prev.map(p => p.id === id ? { ...p, content: newContent } : p));
                alert("Présentation mise à jour !");
            } else {
                alert("Erreur lors de la mise à jour");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur serveur");
        }
    };

    const fetchTrainers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            setTrainers(data);
        } catch (error) {
            console.error('Failed to fetch trainers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchTrainers();
            fetchHomepageSettings();
            fetchPresentations();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const savedAuth = localStorage.getItem('adminAuth');
        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            return;
        }
        // PogoSphere: also bypass password if logged in as a known admin Discord username
        try {
            const raw = localStorage.getItem('pokemon_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (['lcsnzh'].includes(parsed?.username)) {
                    setIsAuthenticated(true);
                }
            }
        } catch {}
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        const remember = e.target.elements.rememberMe?.checked;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                if (remember) {
                    localStorage.setItem('adminAuth', 'true');
                }
                fetchTrainers();
                fetchPresentations();
                fetchHomepageSettings();
            } else {
                alert('Mot de passe incorrect');
            }
        } catch (err) {
            alert('Erreur de connexion au serveur');
        }
    };

    const handleTrainerSave = async () => {
        if (!selectedTrainer) return;

        try {
            const updatedData = {
                ...(trainers[selectedTrainer].checklist || {}),
                ...(checklistChanges || {})
            };

            // Construct full user data to save (preserving other fields)
            const fullUserData = {
                ...trainers[selectedTrainer],
                checklist: updatedData
            };

            await fetch('/api/pokemon/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: selectedTrainer,
                    data: fullUserData
                })
            });

            // Update local state
            setTrainers(prev => ({
                ...prev,
                [selectedTrainer]: fullUserData
            }));

            alert('Sauvegardé avec succès !');
            setSelectedTrainer(null);
            setChecklistChanges(null);
        } catch (error) {
            console.error('Save error:', error);
            alert('Erreur lors de la sauvegarde');
        }
    };

    const filteredTrainers = Object.keys(trainers).filter(username =>
        username.toLowerCase().includes(trainerSearch.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-xl border border-white/10 backdrop-blur-md">
                    <h1 className="text-2xl font-bold mb-4 text-white text-center">Administration</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-black/50 border border-white/20 p-2 w-full mb-4 rounded text-white focus:outline-none focus:border-purple-500"
                        placeholder="Mot de passe"
                    />
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            className="rounded bg-black/50 border-white/20 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-300">Se souvenir de moi</label>
                    </div>
                    <button type="submit" className="bg-purple-600 text-white font-bold px-4 py-2 rounded w-full hover:bg-purple-500 transition-colors">Connexion</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pt-24">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-purple-400 flex items-center gap-3">
                    <Users size={32} />
                    Administration Dresseurs
                </h1>
                <a
                    href="/admin/costumes"
                    className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors mb-8 inline-flex"
                >
                    🎭 Gérer les Costumes
                </a>

                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un dresseur..."
                            value={trainerSearch}
                            onChange={(e) => setTrainerSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTrainers.sort().map(username => (
                            <div key={username} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors">
                                <div>
                                    <h3 className="font-bold text-lg">{username}</h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Niveau {trainers[username].stats?.level || 1} • {Object.keys(trainers[username].checklist || {}).length} cochés
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedTrainer(username);
                                        setChecklistChanges(null);
                                    }}
                                    className="bg-purple-600/20 text-purple-300 border border-purple-500/50 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-600 hover:text-white transition-all"
                                >
                                    Gérer
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Presentations Management Section */}
            <div className="max-w-6xl mx-auto mt-12 border-t border-white/10 pt-8">
                <button
                    onClick={() => setShowPresentations(!showPresentations)}
                    className="flex justify-between items-center w-full bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-colors mb-4"
                >
                    <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-3">
                        📣 Gestion des Présentations
                    </h2>
                    <span>{showPresentations ? 'Masquer' : 'Afficher'}</span>
                </button>

                {showPresentations && (
                    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-xs uppercase font-bold text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Auteur</th>
                                    <th className="px-4 py-3">Contenu</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {presentations.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(p.timestamp).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-white">
                                            {p.author.global_name || p.author.username}
                                        </td>
                                        <td className="px-4 py-3 max-w-md truncate">
                                            {p.content}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleHidePresentation(p.id)}
                                                className="text-red-500 hover:text-red-400 font-bold text-xs border border-red-500/30 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20"
                                            >
                                                Masquer
                                            </button>
                                            <button
                                                onClick={() => handleEditPresentation(p.id, p.content)}
                                                className="ml-2 text-blue-500 hover:text-blue-400 font-bold text-xs border border-blue-500/30 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                                            >
                                                Modifier
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {presentations.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center italic">
                                            Aucune présentation visible.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Homepage Settings Section */}
            <div className="max-w-6xl mx-auto mt-12 border-t border-white/10 pt-8">
                <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-3">
                    🎨 Paramètres Homepage
                </h2>

                <div className="bg-[#121212] rounded-xl border border-white/10 p-6 space-y-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Opacité du Brouillard (Haze) ({homepageSettings.hazeOpacity})</label>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={homepageSettings.hazeOpacity}
                            onChange={(e) => setHomepageSettings({ ...homepageSettings, hazeOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Vitesse clignotement étoiles (plus petit = plus rapide) ({homepageSettings.starBlinkSpeed}s)</label>
                        <input
                            type="range" min="0.1" max="5" step="0.1"
                            value={homepageSettings.starBlinkSpeed}
                            onChange={(e) => setHomepageSettings({ ...homepageSettings, starBlinkSpeed: parseFloat(e.target.value) })}
                            className="w-full accent-yellow-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Fréquence Étoiles Filantes : (0-20) ({homepageSettings.shootingStarFreq})</label>
                        <input
                            type="range" min="0" max="20" step="1"
                            value={homepageSettings.shootingStarFreq}
                            onChange={(e) => setHomepageSettings({ ...homepageSettings, shootingStarFreq: parseInt(e.target.value) })}
                            className="w-full accent-purple-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={homepageSettings.forceSnow}
                            onChange={(e) => setHomepageSettings({ ...homepageSettings, forceSnow: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-600 bg-black/50 text-blue-500 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-300">Forcer l'effet de Neige ?</label>
                    </div>
                    <button
                        onClick={saveHomepageSettings}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Sauvegarder les paramètres
                    </button>
                </div>
            </div>

            {/* Trainer Edit Modal */}
            {selectedTrainer && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-[#121212] p-0 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-white/10 text-white shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-white">Gestion de : <span className="text-purple-400">{selectedTrainer}</span></h2>
                                <p className="text-xs text-gray-400">Modification de la checklist</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleTrainerSave}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-500 flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                                >
                                    <Save size={18} /> Sauvegarder
                                </button>
                                <button
                                    onClick={() => setSelectedTrainer(null)}
                                    className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Stats Editing Section */}
                            <div className="p-4 bg-white/5 border-b border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Niveau</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.level || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, level: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">XP Total</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.xp || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, xp: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Pokémon Attrapés</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.caught || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, caught: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Pokéstops</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.stops || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, stops: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Distance (km)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.distance || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, distance: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Ville</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.city || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, city: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Équipe</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].team || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    team: val
                                                }
                                            }));
                                        }}
                                    >
                                        <option value="">Aucune</option>
                                        <option value="Bravoure">Bravoure (Rouge)</option>
                                        <option value="Sagesse">Sagesse (Bleu)</option>
                                        <option value="Intuition">Intuition (Jaune)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Code Ami</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                                        value={trainers[selectedTrainer].stats?.friendCode || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTrainers(prev => ({
                                                ...prev,
                                                [selectedTrainer]: {
                                                    ...prev[selectedTrainer],
                                                    stats: { ...prev[selectedTrainer].stats, friendCode: val }
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 bg-black/50 text-purple-600 focus:ring-purple-500"
                                            checked={!trainers[selectedTrainer].hidden}
                                            onChange={(e) => {
                                                const val = !e.target.checked;
                                                setTrainers(prev => ({
                                                    ...prev,
                                                    [selectedTrainer]: {
                                                        ...prev[selectedTrainer],
                                                        hidden: val
                                                    }
                                                }));
                                            }}
                                        />
                                        <span className="text-sm text-gray-300">Visible dans le classement</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-4">
                                <PokemonChecklist
                                    checklist={{
                                        ...(trainers[selectedTrainer]?.checklist || {}),
                                        ...(checklistChanges || {})
                                    }}
                                    onChange={(newChecklist) => setChecklistChanges(newChecklist)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
