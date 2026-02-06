import { MetadataRoute } from 'next';
import { getSortedPostsData } from '@/lib/blog/utils';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://arthatrades.com';
    const posts = getSortedPostsData();

    const staticRoutes = [
        '',
        '/pricing',
        '/contact',
        '/privacy',
        '/terms',
        '/demo',
        '/login',
        '/learn',
    ];

    const staticEntries = staticRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1 : 0.8,
    })) as MetadataRoute.Sitemap;

    const blogEntries = posts.map((post) => ({
        url: `${baseUrl}/learn/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.6,
    })) as MetadataRoute.Sitemap;

    return [...staticEntries, ...blogEntries];
}
