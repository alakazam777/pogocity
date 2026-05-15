'use client';

import { useState, useMemo } from 'react';
import { Save, X, Loader2, Star } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const TYPE_IDS = [
    'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const TYPE_COLORS = {
    normal: 'bg-gray-500', fire: 'bg-orange-500', water: 'bg-blue-500', grass: 'bg-green-500',
    electric: 'bg-yellow-400', ice: 'bg-cyan-300', fighting: 'bg-red-700', poison: 'bg-purple-600',
    ground: 'bg-yellow-700', flying: 'bg-indigo-400', psychic: 'bg-pink-500', bug: 'bg-lime-600',
    rock: 'bg-yellow-800', ghost: 'bg-purple-800', dragon: 'bg-indigo-700', dark: 'bg-gray-800',
    steel: 'bg-gray-400', fairy: 'bg-pink-300',
};

function clamp(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

// Parse "2,00" or "2.00" → 2. HTML <input type=number> only accepts ".",
// but French users type ",". We use type=text + this helper instead.
function parseDecimal(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

export default function PokemonEditForm({ initialValues = {}, onSave, onCancel, submitLabel, customTags = [], leagueTags = [] }) {
    const { t } = useLanguage();
    const [name, setName] = useState(initialValues.name || '');
    const [nickname, setNickname] = useState(initialValues.nickname || '');
    const [dexNumber, setDexNumber] = useState(initialValues.dexNumber ?? '');
    const [cp, setCp] = useState(initialValues.cp ?? '');
    const [hp, setHp] = useState(initialValues.hp ?? '');
    const [level, setLevel] = useState(initialValues.level ?? '');
    const [ivAtk, setIvAtk] = useState(initialValues.iv?.atk ?? 0);
    const [ivDef, setIvDef] = useState(initialValues.iv?.def ?? 0);
    const [ivSta, setIvSta] = useState(initialValues.iv?.sta ?? 0);
    const [fastMove, setFastMove] = useState(initialValues.fastMove || '');
    const [chargedMove, setChargedMove] = useState(initialValues.chargedMove || '');
    const [chargedMove2, setChargedMove2] = useState(initialValues.chargedMove2 || '');
    const [type1, setType1] = useState(initialValues.types?.[0] || '');
    const [type2, setType2] = useState(initialValues.types?.[1] || '');
    const [weight, setWeight] = useState(initialValues.weight ?? '');
    const [height, setHeight] = useState(initialValues.height ?? '');
    const [gender, setGender] = useState(initialValues.gender || '');
    const [shiny, setShiny] = useState(!!initialValues.shiny);
    const [lucky, setLucky] = useState(!!initialValues.lucky);
    const [shadow, setShadow] = useState(!!initialValues.shadow);
    const [purified, setPurified] = useState(!!initialValues.purified);
    const [favorite, setFavorite] = useState(!!initialValues.favorite);
    const [caughtDate, setCaughtDate] = useState(initialValues.caughtDate || '');
    const [tagsInput, setTagsInput] = useState((initialValues.tags || []).join(', '));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const ivPercent = useMemo(() => {
        const sum = clamp(ivAtk, 0, 15) + clamp(ivDef, 0, 15) + clamp(ivSta, 0, 15);
        return Math.round((sum / 45) * 1000) / 10;
    }, [ivAtk, ivDef, ivSta]);

    const autoTags = useMemo(() => {
        const tags = [];
        if (ivPercent === 100) tags.push(shiny ? 'Shundo' : 'Hundo');
        return tags;
    }, [ivPercent, shiny]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) { setError(t('manager.form.errorName')); return; }
        if (shadow && purified) { setError(t('manager.form.errorShadowPurified')); return; }
        setSaving(true);
        setError(null);
        try {
            const userTags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
            const tags = [...new Set([...autoTags, ...userTags])];

            // Detect whether the IV sliders have meaningfully diverged from
            // their initial values. Edit mode for a Pokémon imported from
            // CSV may have an IV percent but no atk/def/sta breakdown — in
            // that case we don't want to overwrite the existing % with 0/0/0
            // just because the user opened the form and didn't touch the IV.
            const initialAtk = initialValues.iv?.atk ?? 0;
            const initialDef = initialValues.iv?.def ?? 0;
            const initialSta = initialValues.iv?.sta ?? 0;
            const ivChanged = ivAtk !== initialAtk || ivDef !== initialDef || ivSta !== initialSta;

            const payload = {
                name: name.trim(),
                nickname: nickname.trim() || null,
                dexNumber: dexNumber === '' ? null : Number(dexNumber),
                cp: cp === '' ? null : Number(cp),
                hp: hp === '' ? null : Number(hp),
                level: parseDecimal(level),
                fastMove: fastMove.trim() || null,
                ...(ivChanged ? {
                    iv: {
                        atk: clamp(ivAtk, 0, 15),
                        def: clamp(ivDef, 0, 15),
                        sta: clamp(ivSta, 0, 15),
                    },
                } : {}),
                chargedMove: chargedMove.trim() || null,
                chargedMove2: chargedMove2.trim() || null,
                types: [type1, type2].filter(Boolean),
                weight: parseDecimal(weight),
                height: parseDecimal(height),
                gender: gender || null,
                shiny, lucky, shadow, purified, favorite,
                caughtDate: caughtDate || null,
                tags,
                source: initialValues.source || 'manual',
            };
            await onSave(payload);
        } catch (err) {
            setError(err.message || t('manager.form.errorGeneric'));
        } finally {
            setSaving(false);
        }
    }

    const inputCls = 'w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors';
    const labelCls = 'block text-xs uppercase tracking-wider text-gray-400 mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* Identity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                    <label className={labelCls}>{t('manager.form.name')} *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
                        placeholder="Mewtwo" maxLength={60} required />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.dexNumber')}</label>
                    <input type="number" value={dexNumber} onChange={(e) => setDexNumber(e.target.value)}
                        className={inputCls} min={1} max={1025} />
                </div>
            </div>

            <div>
                <label className={labelCls}>{t('manager.form.nickname')}</label>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputCls}
                    placeholder="Sparky" maxLength={30} />
            </div>

            {/* Combat stats */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={labelCls}>{t('manager.form.cp')}</label>
                    <input type="number" value={cp} onChange={(e) => setCp(e.target.value)} className={inputCls} min={10} max={9999} />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.hp')}</label>
                    <input type="number" value={hp} onChange={(e) => setHp(e.target.value)} className={inputCls} min={1} max={999} />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.level')}</label>
                    <input type="text" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls} placeholder="40" />
                </div>
            </div>

            {/* Types */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>{t('manager.form.type1')}</label>
                    <select value={type1} onChange={(e) => setType1(e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        {TYPE_IDS.map((id) => (
                            <option key={id} value={id}>{t(`types.${id}`)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.type2')}</label>
                    <select value={type2} onChange={(e) => setType2(e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        {TYPE_IDS.filter((id) => id !== type1).map((id) => (
                            <option key={id} value={id}>{t(`types.${id}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Moves */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className={labelCls}>{t('manager.form.fastMove')}</label>
                    <input value={fastMove} onChange={(e) => setFastMove(e.target.value)} className={inputCls}
                        placeholder="Confusion" maxLength={40} />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.chargedMove')}</label>
                    <input value={chargedMove} onChange={(e) => setChargedMove(e.target.value)} className={inputCls}
                        placeholder="Psystrike" maxLength={40} />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.chargedMove2')}</label>
                    <input value={chargedMove2} onChange={(e) => setChargedMove2(e.target.value)} className={inputCls}
                        placeholder="—" maxLength={40} />
                </div>
            </div>

            {/* IV sliders */}
            <div className="bg-black/20 rounded-lg p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                    <label className={labelCls + ' mb-0'}>{t('manager.form.iv')}</label>
                    <span className={`text-base font-bold ${ivPercent === 100 ? 'text-red-400' : ivPercent >= 80 ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {ivPercent}%
                    </span>
                </div>
                {[
                    [t('manager.form.ivAtk'), ivAtk, setIvAtk, 'red'],
                    [t('manager.form.ivDef'), ivDef, setIvDef, 'blue'],
                    [t('manager.form.ivSta'), ivSta, setIvSta, 'green'],
                ].map(([label, val, setter, accent]) => (
                    <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-10">{label}</span>
                        <input type="range" min={0} max={15} step={1} value={val}
                            onChange={(e) => setter(Number(e.target.value))}
                            className={`flex-1 accent-${accent}-500`} />
                        <input type="number" min={0} max={15} step={1} value={val}
                            onChange={(e) => setter(clamp(e.target.value, 0, 15))}
                            className="w-14 px-2 py-1 bg-black/40 border border-white/10 rounded text-white text-center text-sm" />
                    </div>
                ))}
                {autoTags.length > 0 && (
                    <div className="flex gap-2 pt-1">
                        {autoTags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Physical */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>{t('manager.form.weight')}</label>
                    <input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls}
                        placeholder="122,00" />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.height')}</label>
                    <input type="text" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls}
                        placeholder="2,00" />
                </div>
            </div>

            {/* Gender */}
            <div>
                <label className={labelCls}>{t('manager.form.gender')}</label>
                <div className="flex gap-3 text-sm">
                    {['male', 'female', 'genderless'].map((g) => (
                        <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="gender" value={g} checked={gender === g}
                                onChange={() => setGender(g)} className="accent-purple-500" />
                            <span className="text-gray-200">{t(`manager.form.${g}`)}</span>
                        </label>
                    ))}
                    <button type="button" onClick={() => setGender('')}
                        className="text-xs text-gray-500 hover:text-gray-300 underline">×</button>
                </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-3 text-sm">
                {[
                    ['shiny', shiny, setShiny, 'text-yellow-400'],
                    ['lucky', lucky, setLucky, 'text-orange-400'],
                    ['shadow', shadow, setShadow, 'text-purple-400'],
                    ['purified', purified, setPurified, 'text-cyan-300'],
                ].map(([key, val, setter, color]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)}
                            className="accent-purple-500" />
                        <span className={color}>{t(`manager.form.${key}`)}</span>
                    </label>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                    <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)}
                        className="accent-pink-500" />
                    <Star size={14} className={favorite ? 'fill-pink-400 text-pink-400' : 'text-gray-500'} />
                    <span className="text-pink-300">{t('manager.form.favorite')}</span>
                </label>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>{t('manager.form.caughtDate')}</label>
                    <input type="date" value={caughtDate?.slice(0, 10) || ''}
                        onChange={(e) => setCaughtDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>{t('manager.form.tags')}</label>
                    <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={inputCls}
                        placeholder={t('manager.form.tagsPlaceholder')} />
                    {(leagueTags.length + customTags.length) > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {[...leagueTags, ...customTags].map((tag) => {
                                const tagsArr = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
                                const active = tagsArr.includes(tag);
                                const isLeague = leagueTags.includes(tag);
                                return (
                                    <button key={tag} type="button"
                                        onClick={() => {
                                            const next = active
                                                ? tagsArr.filter((t) => t !== tag)
                                                : [...tagsArr, tag];
                                            setTagsInput(next.join(', '));
                                        }}
                                        className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${active
                                            ? (isLeague ? 'bg-purple-500/40 text-purple-100 border-purple-400' : 'bg-pink-500/40 text-pink-100 border-pink-400')
                                            : (isLeague ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20' : 'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:bg-pink-500/20')}`}>
                                        {active ? '✓ ' : '+ '}{tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                    {error}
                </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={saving}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                        <X size={16} />
                        {t('manager.form.cancel')}
                    </button>
                )}
                <button type="submit" disabled={saving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? t('manager.form.saving') : (submitLabel || t('manager.form.save'))}
                </button>
            </div>
        </form>
    );
}
