import { BLOG_POSTS, BlogPost } from './posts';

export function getSortedPostsData() {
    return [...BLOG_POSTS].sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getAllPostSlugs() {
    return BLOG_POSTS.map((post) => ({
        slug: post.slug,
    }));
}

export async function getPostData(slug: string): Promise<BlogPost> {
    const post = BLOG_POSTS.find((p) => p.slug === slug);

    if (!post) {
        throw new Error(`Post not found: ${slug}`);
    }

    return post;
}
