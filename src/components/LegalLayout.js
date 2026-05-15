'use client';

export default function LegalLayout({ content, lastUpdated }) {
    return (
        <main
            className="min-h-screen bg-[#050510] text-white px-4 sm:px-8 py-16 sm:py-24"
            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
            <article className="max-w-2xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        {content.title}
                    </h1>
                    <p className="text-xs uppercase tracking-wider text-white/40">
                        {content.lastUpdated} · {lastUpdated}
                    </p>
                </header>

                <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-10">
                    {content.intro}
                </p>

                <div className="space-y-7">
                    {content.sections.map((s, i) => (
                        <section key={i}>
                            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
                                {s.heading}
                            </h2>
                            {/* Render \n\n in body strings as paragraph breaks for readability */}
                            {s.body.split(/\n\n+/).map((para, j) => (
                                <p key={j} className="text-sm text-white/70 leading-relaxed mb-2 whitespace-pre-line">
                                    {para}
                                </p>
                            ))}
                        </section>
                    ))}
                </div>

                <footer className="mt-16 pt-8 border-t border-white/10 text-xs text-white/40 text-center">
                    <a href="/" className="hover:text-white/70 transition-colors">← PogoSphere</a>
                </footer>
            </article>
        </main>
    );
}
