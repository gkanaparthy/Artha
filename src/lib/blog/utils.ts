import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/learn');

export function getSortedPostsData() {
    // Get file names under /content/learn
    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => {
            // Remove ".md" from file name to get slug
            const slug = fileName.replace(/\.md$/, '');

            // Read markdown file as string
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');

            // Use gray-matter to parse the post metadata section
            const matterResult = matter(fileContents);

            // Combine the data with the slug
            return {
                slug,
                title: matterResult.data.title,
                date: matterResult.data.date,
                description: matterResult.data.description,
                image: matterResult.data.image,
                author: matterResult.data.author,
                category: matterResult.data.category,
                ...matterResult.data,
            };
        });

    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getAllPostSlugs() {
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => {
            return {
                params: {
                    slug: fileName.replace(/\.md$/, ''),
                },
            };
        });
}

export async function getPostData(slug: string) {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    return {
        slug,
        content: matterResult.content,
        title: matterResult.data.title,
        date: matterResult.data.date,
        description: matterResult.data.description,
        image: matterResult.data.image,
        author: matterResult.data.author,
        category: matterResult.data.category,
        ...matterResult.data,
    };
}
