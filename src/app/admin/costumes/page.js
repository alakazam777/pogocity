'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Save, Search, ArrowUp, ArrowDown, Trash2, Plus, RefreshCw } from 'lucide-react';

export default function CostumeAdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [files, setFiles] = useState([]);
    const [mapping, setMapping] = useState({});

    // New state for Checklist Costumes (Pikachu Array)
    const [costumesArray, setCostumesArray] = useState([]);
    const [hasArrayChanges, setHasArrayChanges] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingArray, setSavingArray] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);

    const [filter, setFilter] = useState('');
    const [labelFilter, setLabelFilter] = useState('');
    const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' or 'sprites'

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem('admin_auth', 'true');
                loadData();
            } else {
                alert('Mot de passe incorrect');
            }
        } catch (err) {
            alert('Erreur de connexion au serveur');
        }
    };

    useEffect(() => {
        const adminSession = localStorage.getItem('admin_auth');
        if (adminSession === 'true') {
            setIsAuthenticated(true);
            loadData();
        }
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [filesRes, mappingRes, arrayRes] = await Promise.all([
                fetch('/api/admin/costumes/list'),
                fetch('/api/admin/costumes/save'),
                fetch('/api/admin/costumes/array') // Fetch new endpoints
            ]);

            if (filesRes.ok) setFiles(await filesRes.json());
            if (mappingRes.ok) setMapping(await mappingRes.json());
            if (arrayRes.ok) {
                const data = await arrayRes.json();
                setCostumesArray(data.costumes || []);
                setHasArrayChanges(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-xl border border-white/10 backdrop-blur-md">
                    <h1 className="text-2xl font-bold mb-4 text-white text-center">Administration Costumes</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-black/50 border border-white/20 p-2 w-full mb-4 rounded text-white focus:outline-none focus:border-purple-500"
                        placeholder="Mot de passe"
                    />
                    <button type="submit" className="bg-purple-600 text-white font-bold px-4 py-2 rounded w-full hover:bg-purple-500 transition-colors">Connexion</button>
                    <div className="mt-4 text-center">
                        <a href="/admin" className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1">
                            <ChevronLeft size={14} /> Retour Dashboard
                        </a>
                    </div>
                </form>
            </div>
        );
    }

    // Handlers for Sprites Mapping tab
    const handleNameChange = (filename, newName) => {
        setMapping(prev => ({ ...prev, [filename]: newName }));
    };

    const saveMapping = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/costumes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapping })
            });
            if (res.ok) alert('Mapping sauvegardé !');
            else alert('Erreur lors de la sauvegarde.');
        } catch (e) {
            console.error(e);
            alert('Erreur réseau.');
        } finally {
            setSaving(false);
        }
    };

    // Handlers for Checklist array tab
    const handleCostumeChange = (index, field, value) => {
        const updated = [...costumesArray];
        updated[index][field] = value;
        setCostumesArray(updated);
        setHasArrayChanges(true);
    };

    const moveCostume = (index, direction) => {
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === costumesArray.length - 1) return;
        const updated = [...costumesArray];
        const temp = updated[index];
        updated[index] = updated[index + direction];
        updated[index + direction] = temp;
        setCostumesArray(updated);
        setHasArrayChanges(true);
    };

    const deleteCostume = (index) => {
        if (confirm('Supprimer ce costume de la liste ?')) {
            const updated = costumesArray.filter((_, i) => i !== index);
            setCostumesArray(updated);
            setHasArrayChanges(true);
        }
    };

    const addCostume = () => {
        const newId = `c_${Math.floor(Math.random() * 90000) + 10000}`;
        setCostumesArray([{ id: newId, label: 'Nouveau Costume', costumeOnly: true, localAsset: '', shinyAsset: '' }, ...costumesArray]);
        setHasArrayChanges(true);
    };

    const saveCostumesArray = async () => {
        setSavingArray(true);
        try {
            const res = await fetch('/api/admin/costumes/array', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ costumes: costumesArray })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`${data.count} costumes sauvegardés ! Cliquez ensuite sur "Appliquer & Redémarrer".`);
                setHasArrayChanges(false);
            } else {
                alert('Erreur lors de la sauvegarde.');
            }
        } catch (e) {
            console.error(e);
            alert('Erreur réseau.');
        } finally {
            setSavingArray(false);
        }
    };

    const deleteSprite = async (filename) => {
        if (!confirm(`Supprimer définitivement l'image ${filename} ?`)) return;
        try {
            const res = await fetch('/api/admin/costumes/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (res.ok) {
                setFiles(files.filter(f => f !== filename));
            } else {
                alert('Erreur: impossible de supprimer le fichier.');
            }
        } catch (e) {
            console.error(e);
            alert('Erreur réseau lors de la suppression.');
        }
    };

    const rebuildSite = async () => {
        if (!confirm('Êtes-vous sûr de vouloir reconstruire le site ? Cela le mettra hors ligne pendant ~30 secondes et appliquera les nouveaux noms. (Si une sauvegarde est en attente, annulez et sauvegardez d\'abord).')) {
            return;
        }
        setRebuilding(true);
        try {
            const res = await fetch('/api/admin/rebuild', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(data.message);
            } else {
                alert('Erreur lors du déclenchement du build.');
            }
        } catch (e) {
            console.error(e);
            alert('Erreur réseau.');
        } finally {
            setRebuilding(false);
        }
    };

    if (loading && isAuthenticated) return <div className="p-8 text-white">Chargement...</div>;

    return (
        <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6 bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-xl">
                    <div>
                        <h3 className="text-yellow-400 font-bold flex items-center gap-2">
                            ⚠️ À LiRE : Comment appliquer les changements
                        </h3>
                        <p className="text-sm text-yellow-200/80 mt-1 max-w-2xl">
                            Les modifications (noms, images, ordre) sont enregistrées dans le backend.
                            Vous <b>devez</b> utiliser le bouton "Reconstruire le Site" pour que les utilisateurs voient le nouveau Check-list.
                        </p>
                    </div>
                    <button
                        onClick={rebuildSite}
                        disabled={rebuilding}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <RefreshCw size={16} className={rebuilding ? "animate-spin" : ""} />
                        {rebuilding ? 'Reconstruction en cours...' : '⚙️ Appliquer & Redémarrer'}
                    </button>
                </div>

                {/* Tab navigation */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('checklist')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${activeTab === 'checklist' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        📝 Éditeur Liste Costumes (Pikachu)
                    </button>
                    <button
                        onClick={() => setActiveTab('sprites')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${activeTab === 'sprites' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        🖼️ Labels d'Images ({files.length})
                    </button>
                </div>

                {/* TAB: Checklist Edit Array */}
                {activeTab === 'checklist' && (
                    <>
                        <div className="flex justify-between items-center mb-6 sticky top-20 bg-black/95 p-4 z-20 border-b border-white/10 rounded-xl">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-500 hidden sm:block">
                                    Pikachu ({costumesArray.length} formes)
                                </h2>
                                <button onClick={addCostume} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors border border-white/20">
                                    <Plus size={16} /> Ajouter
                                </button>
                            </div>

                            <button
                                onClick={saveCostumesArray}
                                disabled={savingArray || !hasArrayChanges}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 px-6 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <Save size={16} />
                                {savingArray ? 'Sauvegarde...' : 'Sauvegarder l\'Ordre'}
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher / Filtrer temporairement..."
                                    value={labelFilter}
                                    onChange={(e) => setLabelFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>
                            {labelFilter && <p className="text-xs text-yellow-500 mt-2">Mode filtre actif. Désactivez le filtre pour pouvoir tout réordonner facilement.</p>}
                        </div>

                        <div className="space-y-2">
                            {costumesArray.map((costume, index) => {
                                // Filter logic
                                if (labelFilter && !costume.label.toLowerCase().includes(labelFilter.toLowerCase()) && !costume.id.toLowerCase().includes(labelFilter.toLowerCase())) return null;

                                return (
                                    <div key={`${costume.id}-${index}`} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">

                                        {/* Actions Order/Delete */}
                                        <div className="flex items-center gap-1 self-center lg:self-auto bg-black/40 p-1 rounded-lg">
                                            <button
                                                onClick={() => moveCostume(index, -1)}
                                                disabled={index === 0}
                                                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => moveCostume(index, 1)}
                                                disabled={index === costumesArray.length - 1}
                                                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteCostume(index)}
                                                className="p-1.5 text-red-400 hover:text-red-300 ml-2 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Preview Image */}
                                        <div className="w-16 h-16 flex-shrink-0 bg-black/50 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center p-1">
                                            <img
                                                src={costume.localAsset || costume.shinyAsset || '/fallback.png'}
                                                alt={costume.label}
                                                className="max-w-full max-h-full object-contain pixelated"
                                                loading="lazy"
                                                onError={(e) => { e.target.style.opacity = '0.3'; }}
                                            />
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">ID (Unique)</label>
                                                <input
                                                    type="text"
                                                    value={costume.id}
                                                    onChange={(e) => handleCostumeChange(index, 'id', e.target.value)}
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-pink-500 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-pink-400 mb-1 block">Nom Affiché *</label>
                                                <input
                                                    type="text"
                                                    value={costume.label}
                                                    onChange={(e) => handleCostumeChange(index, 'label', e.target.value)}
                                                    className="w-full bg-black/50 border border-pink-500/30 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Chemin Image Normal</label>
                                                <input
                                                    type="text"
                                                    value={costume.localAsset || ''}
                                                    onChange={(e) => handleCostumeChange(index, 'localAsset', e.target.value)}
                                                    placeholder="/Costumes/imgXXX.webp"
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Chemin Image Shiny</label>
                                                <input
                                                    type="text"
                                                    value={costume.shinyAsset || ''}
                                                    onChange={(e) => handleCostumeChange(index, 'shinyAsset', e.target.value)}
                                                    placeholder="/Costumes/imgXXX_s.webp"
                                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* TAB: Sprite Mapping (original functionality) */}
                {activeTab === 'sprites' && (
                    <>
                        <div className="flex justify-between items-center mb-8 sticky top-20 bg-black/90 p-4 z-20 border-b border-white/10">
                            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                                Gestion des Noms de Costumes
                            </h1>
                            <button
                                onClick={saveMapping}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
                            >
                                {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="relative max-w-md">
                                <input
                                    type="text"
                                    placeholder="Filtrer par nom de fichier..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {files.filter(f => f.toLowerCase().includes(filter.toLowerCase())).map(file => (
                                <div key={file} className="relative bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-white/10 transition-colors">
                                    <button
                                        onClick={() => deleteSprite(file)}
                                        className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-1"
                                        title="Supprimer l'image définitivement"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="w-24 h-24 relative bg-black/20 rounded-lg p-2 mt-2">
                                        <img
                                            src={`/Costumes/${file}`}
                                            alt={file}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="w-full text-center">
                                        <p className="text-[10px] text-gray-500 mb-1 truncate" title={file}>{file}</p>
                                        <input
                                            type="text"
                                            placeholder="Nom du Set / Costume"
                                            value={mapping[file] || ''}
                                            onChange={(e) => handleNameChange(file, e.target.value)}
                                            className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm text-center text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
