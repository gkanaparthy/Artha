import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/onboarding/', '/api/'],
            },
            {
                userAgent: ['OAI-SearchBot', 'GPTBot', 'Claude-Web', 'PerplexityBot', 'Googlebot-Extended'],
                allow: '/',
            }
        ],
        sitemap: 'https://arthatrades.com/sitemap.xml',
    };
}
