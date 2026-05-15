import cityConfig from '@/lib/cityConfig';

export const metadata = {
    title: "Pokémon Régionaux",
    description: "Naviguez sur le globe pour repérer les Pokémon régionaux, Prismillon et autres exclusivités !",
    openGraph: {
        title: `Pokémon Régionaux — ${cityConfig.siteName}`,
        description: "Naviguez sur le globe pour repérer les Pokémon régionaux, Prismillon et autres exclusivités !",
        images: [
            {
                url: "/og-regionals.jpg",
                width: 1200,
                height: 630,
                alt: "Globe Pokémon — Pokémon régionaux vus de l'espace",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: `Pokémon Régionaux — ${cityConfig.siteName}`,
        description: "Naviguez sur le globe pour repérer les Pokémon régionaux, Prismillon et autres exclusivités !",
        images: ["/og-regionals.jpg"],
    },
};

export default function RegionauxLayout({ children }) {
    return children;
}
