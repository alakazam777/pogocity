import cityConfig from '@/lib/cityConfig';

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/admin/',
        },
        sitemap: `https://${cityConfig.domain}/sitemap.xml`,
    }
}
