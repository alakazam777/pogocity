// Circular IV-percentage indicator. Background ring is faded, foreground arc
// fills clockwise to match the percentage. Color tracks the IV tier
// (Hundo / Excellent / Great / Good / Trash) using the same scale the
// dashboard uses for cell-level coloring elsewhere.
export default function IvRing({ percent, size = 48, strokeWidth = 3 }) {
    if (percent === null || percent === undefined) {
        return (
            <div className="inline-flex items-center justify-center text-gray-500"
                style={{ width: size, height: size }}>
                <span className="text-xs">—</span>
            </div>
        );
    }
    const clamped = Math.max(0, Math.min(100, percent));
    const radius = size / 2 - strokeWidth - 1;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;
    const color =
        clamped === 100 ? '#f87171' :
        clamped >= 90 ? '#fbbf24' :
        clamped >= 75 ? '#4ade80' :
        clamped >= 50 ? '#60a5fa' : '#9ca3af';
    const fontSize = size <= 36 ? 9 : size <= 48 ? 11 : 13;

    return (
        <div className="relative inline-flex" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-bold tabular-nums"
                style={{ color, fontSize }}>
                {clamped}%
            </span>
        </div>
    );
}
