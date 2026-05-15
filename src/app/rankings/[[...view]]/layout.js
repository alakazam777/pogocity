import cityConfig from '@/lib/cityConfig';

const viewMeta = {
    dynamax: {
        title: "Classement Dynamax",
        ogTitle: "Classement Dynamax",
        description: "Les meilleurs attackers Dynamax & Gigamax classés par type. Trouvez le Pokémon idéal pour vos combats Dynamax !",
    },
    trainers: {
        title: "Classement Dresseurs",
        ogTitle: "Classement Dresseurs",
        description: "Classement des meilleurs trainers Pokémon GO. Comparez vos performances PvP et Raids !",
    },
    master: {
        title: "Classement Master League",
        ogTitle: "Master League",
        description: "Les meilleurs Pokémon pour la Ligue Master en PvP. Tier list et movesets optimaux.",
    },
    hyper: {
        title: "Classement Hyper League",
        ogTitle: "Hyper League",
        description: "Les meilleurs Pokémon pour la Ligue Hyper en PvP. Tier list et movesets optimaux.",
    },
    super: {
        title: "Classement Super League",
        ogTitle: "Super League",
        description: "Les meilleurs Pokémon pour la Super League en PvP. Tier list et movesets optimaux.",
    },
    rocket: {
        title: "Contre Team Rocket",
        ogTitle: "Contre Team Rocket",
        description: "Les meilleurs contres pour battre les Sbires et Leaders Team GO Rocket.",
    },
};

export async function generateMetadata({ params }) {
    const p = await params;
    const view = p?.view?.[0];
    const meta = viewMeta[view] || viewMeta.trainers;

    return {
        title: meta.title,
        description: meta.description,
        openGraph: {
            title: `${meta.ogTitle} — ${cityConfig.siteName}`,
            description: meta.description,
            ...(view === 'dynamax' ? {
                images: [{
                    url: '/api/og-dynamax?v=5',
                    width: 1200,
                    height: 630,
                    alt: 'Classement Dynamax',
                }],
            } : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: `${meta.ogTitle} — ${cityConfig.siteName}`,
            description: meta.description,
            ...(view === 'dynamax' ? {
                images: ['/api/og-dynamax?v=5'],
            } : {}),
        },
    };
}

export default function ClassementsLayout({ children }) {
    return children;
}
