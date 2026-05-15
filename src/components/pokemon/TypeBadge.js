// Pokémon type badge using the official PoGo-style icons via mask-image.
// Same icon set that powers the rankings/attackers pages
// (duiker101/pokemon-type-svg-icons), masked over a colored circle.

export const TYPE_COLORS = {
    normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850',
    electric: '#F8D030', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
    steel: '#B8B8D0', fairy: '#EE99AC',
};

export const TYPE_IDS = Object.keys(TYPE_COLORS);

const ICON_BASE = 'https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons';

export default function TypeBadge({ typeId, size = 24, active = true, onClick, title }) {
    const color = TYPE_COLORS[typeId];
    if (!color) return null;
    const isClickable = !!onClick;
    const url = `${ICON_BASE}/${typeId}.svg`;
    const innerSize = Math.round(size * 0.65);

    return (
        <span
            role={isClickable ? 'button' : undefined}
            onClick={onClick}
            title={title || typeId}
            className={`rounded-full inline-flex items-center justify-center transition-all flex-shrink-0
                ${isClickable ? 'cursor-pointer' : ''}
                ${active ? 'shadow-md' : 'opacity-50 saturate-50 hover:opacity-80'}`}
            style={{ width: size, height: size, backgroundColor: color }}
        >
            <span
                className="block"
                style={{
                    width: innerSize,
                    height: innerSize,
                    backgroundColor: '#ffffff',
                    maskImage: `url(${url})`,
                    WebkitMaskImage: `url(${url})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                }}
            />
        </span>
    );
}
