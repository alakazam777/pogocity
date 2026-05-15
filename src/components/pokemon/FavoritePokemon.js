'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Loader2, X, Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function FavoritePokemon({ favorites = [], onUpdate, onUpsertHistory }) {
    const { t } = useLanguage();
    const [processingIndex, setProcessingIndex] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // { index, date, stardust, url }
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

    // Dnd Kit Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Ensure we work with an array
    const safeFavorites = Array.isArray(favorites) ? favorites.map(f => {
        // Migration: handle string urls
        if (typeof f === 'string') return { url: f, date: new Date().toISOString(), stardust: 0 };
        return f;
    }) : [];

    // We ensure we always have at least 3 slots visible, or more if we have data
    const displayCount = Math.max(3, safeFavorites.length);
    // Create an array of IDs based on index to serve as sortable items
    const slotIds = Array.from({ length: displayCount }, (_, i) => `slot-${i}`);

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = slotIds.indexOf(active.id);
            const newIndex = slotIds.indexOf(over.id);

            // Create a copy of the array with sufficient length
            const newFavs = [...safeFavorites];
            while (newFavs.length < displayCount) newFavs.push(null);

            const reordered = arrayMove(newFavs, oldIndex, newIndex);
            // Trim trailing nulls if we want to clean up, but keeping slots is fine
            onUpdate(reordered);
        }
    };

    const handleUpload = async (index, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessingIndex(index);
        try {
            // 1. Upload Image
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Erreur upload");

            const data = await uploadRes.json();

            if (data.url) {
                let foundStardust = 0;

                // 2. OCR for Stardust
                try {
                    // Resize for OCR to prevent crashes on mobile
                    // Mobile-friendly Resize
                    const resizeForOcr = (file) => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.src = URL.createObjectURL(file);
                            img.onload = () => {
                                const maxWidth = 1100; // Safer for mobile memory
                                let width = img.width;
                                let height = img.height;
                                if (width > maxWidth) {
                                    height = Math.round((height * maxWidth) / width);
                                    width = maxWidth;
                                }
                                const canvas = document.createElement('canvas');
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                // White background to help OCR
                                ctx.fillStyle = "#FFFFFF";
                                ctx.fillRect(0, 0, width, height);
                                ctx.drawImage(img, 0, 0, width, height);
                                canvas.toBlob((blob) => {
                                    resolve(blob);
                                    URL.revokeObjectURL(img.src);
                                }, 'image/jpeg', 0.9);
                            };
                            img.onerror = () => resolve(file);
                        });
                    };

                    const ocrBlob = await resizeForOcr(file);

                    const { createWorker } = await import('tesseract.js');
                    // 'eng' is safer for general numbers and English-like keywords in code, 
                    // even if 'fra' is better for French words. Numbers are universal.
                    const worker = await createWorker('eng');

                    const ret = await worker.recognize(ocrBlob);
                    const lines = ret?.data?.lines || [];
                    await worker.terminate();

                    const keywordRegex = /(?:stardust|poussi|étoile|etoile|toile|bonbon|candy)/i;

                    const cleanAndParse = (text) => {
                        // Remove common OCR artifacts
                        let clean = text
                            .replace(/[^0-9oOIlS\s]/gi, '')
                            .replace(/[oO]/g, '0')
                            .replace(/[Il|]/g, '1')
                            .replace(/[S]/g, '5');
                        clean = clean.replace(/\s/g, '');
                        return parseInt(clean, 10);
                    };

                    const extractCandidates = (text) => {
                        const candidates = [];
                        // 1. Triplets format (e.g. 56 477 214)
                        const formatRegex = /\b(\d{1,3}(?:\s\d{3})+)\b/g;
                        let match;
                        while ((match = formatRegex.exec(text)) !== null) {
                            const raw = match[1].replace(/\s/g, '');
                            const val = parseInt(raw, 10);
                            if (!isNaN(val)) candidates.push(val);
                        }
                        // 2. Wide split
                        const parts = text.split(/\s{2,}/);
                        for (const part of parts) {
                            const val = cleanAndParse(part);
                            if (!isNaN(val)) candidates.push(val);
                        }
                        // 3. Whole clean
                        const val = cleanAndParse(text);
                        if (!isNaN(val)) candidates.push(val);
                        return candidates;
                    };

                    const validCandidates = [];
                    for (let i = 0; i < lines.length; i++) {
                        // Check keywords or if line matches strict number format
                        const isKeyword = keywordRegex.test(lines[i].text.toLowerCase());
                        const strictFormatRegex = /\b\d{1,3}(?:\s\d{3})+\b/;

                        if (isKeyword || strictFormatRegex.test(lines[i].text)) {
                            // Scan surroundings
                            const checkIndices = [i - 1, i + 1, i, i - 2, i + 2];
                            for (const idx of checkIndices) {
                                if (idx >= 0 && idx < lines.length) {
                                    let content = lines[idx].text;
                                    // Strip keyword if same line
                                    if (idx === i) content = content.toLowerCase().replace(keywordRegex, '');
                                    validCandidates.push(...extractCandidates(content));
                                }
                            }
                        }
                    }

                    if (validCandidates.length === 0) {
                        for (const line of lines) validCandidates.push(...extractCandidates(line.text));
                    }

                    const finalSet = validCandidates.filter(v => v > 500 && v < 2000000000);
                    if (finalSet.length > 0) {
                        foundStardust = Math.max(...finalSet);
                    }
                } catch (ocrErr) {
                    console.error("OCR Failed:", ocrErr);
                    alert(t('dashboard.ocrError', { error: ocrErr.message }));
                }

                // Create Item
                const newItem = {
                    url: data.url,
                    date: new Date().toISOString(),
                    stardust: foundStardust || 0
                };

                const newFavorites = [...safeFavorites];
                // Fill gaps
                while (newFavorites.length <= index) newFavorites.push(null);
                newFavorites[index] = newItem;
                onUpdate(newFavorites);

                if (foundStardust > 0) {
                    alert(t('dashboard.stardustUpdated', { count: foundStardust.toLocaleString() }));
                    if (onUpsertHistory) onUpsertHistory(newItem);
                } else {
                    alert(t('dashboard.stardustDetectFail'));
                }
            }
        } catch (err) {
            console.error("Favorite Upload Error:", err);
            alert(t('dashboard.uploadError'));
        } finally {
            setProcessingIndex(null);
            e.target.value = '';
        }
    };

    const addSlot = () => {
        const newFavs = [...safeFavorites, null];
        onUpdate(newFavs);
    };

    const saveEdit = () => {
        if (!editingItem) return;
        const newFavs = [...safeFavorites];
        if (editingItem.index >= 0 && editingItem.index < newFavs.length) {
            const updated = { ...newFavs[editingItem.index], date: editingItem.date, stardust: parseInt(editingItem.stardust) || 0 };
            newFavs[editingItem.index] = updated;
            onUpdate(newFavs);
            if (onUpsertHistory) onUpsertHistory(updated);
        }
        setEditingItem(null);
    };

    return (
        <div className="w-full p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-8">
            <h3 className="text-xl font-semibold text-white flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                    {t('dashboard.favoritePokemon')}
                </div>
            </h3>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-col items-center gap-6">
                    <div className="flex justify-center gap-4 md:gap-6 flex-wrap w-full">
                        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
                            {slotIds.map((id, i) => {
                                const item = safeFavorites[i];
                                return (
                                    <SortableItem
                                        key={id}
                                        id={id}
                                        item={item}
                                        index={i}
                                        processingIndex={processingIndex}
                                        handleUpload={handleUpload}
                                        onEdit={(it) => setEditingItem({ ...it, index: i })}
                                        onDelete={() => {
                                            const newFavs = [...safeFavorites];
                                            newFavs.splice(i, 1);
                                            onUpdate(newFavs);
                                        }}
                                    />
                                );
                            })}
                        </SortableContext>

                        <button
                            onClick={addSlot}
                            className="w-24 h-40 md:w-32 md:h-52 rounded-xl border-2 border-dashed border-white/10 hover:border-pink-500/50 bg-white/5 flex flex-col items-center justify-center text-gray-500 hover:text-white transition-all"
                            title={t('dashboard.addFavoriteSlot')}
                        >
                            <Plus size={32} />
                        </button>
                    </div>
                </div>
            </DndContext>

            {/* Edit Modal */}
            {editingItem && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl space-y-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Edit2 size={18} /> {t('dashboard.editFavorite')}
                        </h4>

                        <div className="w-full aspect-[2/3] bg-black/50 rounded-lg overflow-hidden border border-white/5">
                            <img src={editingItem.url} className="w-full h-full object-contain" />
                        </div>

                        <div className="space-y-3">



                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingItem(null);
                                        setIsDeleteConfirm(false);
                                    }}
                                    className="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={() => {
                                        saveEdit();
                                        setIsDeleteConfirm(false);
                                    }}
                                    className="flex-1 py-2 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600 font-semibold"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (isDeleteConfirm) {
                                        const newFavs = [...safeFavorites];
                                        newFavs.splice(editingItem.index, 1);
                                        onUpdate(newFavs);
                                        setEditingItem(null);
                                        setIsDeleteConfirm(false);
                                    } else {
                                        setIsDeleteConfirm(true);
                                    }
                                }}
                                className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${isDeleteConfirm
                                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse font-bold'
                                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                    }`}
                            >
                                <Trash2 size={16} />
                                {isDeleteConfirm ? t('dashboard.confirmDeleteFavorite') : t('dashboard.deleteFavorite')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function SortableItem({ id, item, index, processingIndex, handleUpload, onEdit, onDelete }) {
    const { t } = useLanguage();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative w-24 h-40 md:w-32 md:h-52 rounded-xl border-2 hover:border-pink-500/50 flex items-center justify-center overflow-hidden group transition-all shadow-inner ${isDragging ? "border-pink-500 shadow-2xl scale-110 opacity-90" : "border-white/10 bg-black/30"}`}
        >
            {item ? (
                <>
                    <div
                        className="w-full h-full relative"
                        onClick={() => onEdit(item)}
                    >
                        <img src={item.url} className="w-full h-full object-cover pointer-events-none" alt={t('dashboard.favoriteAlt', { index: index + 1 })} />

                        {item.stardust > 0 && (
                            <div className="absolute top-0 right-0 bg-pink-500/80 px-1 text-[9px] font-bold text-white rounded-bl-md">
                                {(item.stardust / 1000).toFixed(0)}k
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                        }}
                        className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/80"
                        title={t('dashboard.edit')}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <Edit2 className="text-white w-3 h-3" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="absolute top-1 left-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title={t('dashboard.delete')}
                        onPointerDown={e => e.stopPropagation()} // Prevent drag start
                    >
                        <X className="text-white w-4 h-4" />
                    </button>
                </>
            ) : (
                <label
                    className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-gray-600 hover:text-pink-400 transition-colors"
                    // Prevent drag sort on specific interactive areas if needed, but whole card is draggable.
                    onClick={(e) => e.stopPropagation()}
                >
                    {processingIndex === index ? (
                        <Loader2 className="animate-spin w-8 h-8" />
                    ) : (
                        <>
                            <Plus size={24} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 group-hover:opacity-100">{t('common.add')}</span>
                        </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(index, e)} disabled={processingIndex !== null} />
                </label>
            )}
        </div>
    );
}

// Imports for dnd-kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
