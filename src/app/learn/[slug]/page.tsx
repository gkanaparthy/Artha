import { getPostData, getAllPostSlugs } from '@/lib/blog/utils';
import { Playfair_Display } from 'next/font/google';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

const playfair = Playfair_Display({ subsets: ['latin'] });

export async function generateStaticParams() {
    return getAllPostSlugs();
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const postData = await getPostData(slug);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": postData.title,
        "description": postData.description,
        "image": postData.image || "https://arthatrades.com/blog/revenge-trading.png",
        "datePublished": postData.date,
        "author": {
            "@type": "Person",
            "name": postData.author || "Gautham Kanaparthy",
            "url": "https://arthatrades.com/learn"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Artha",
            "logo": {
                "@type": "ImageObject",
                "url": "https://arthatrades.com/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://arthatrades.com/learn/${slug}`
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFBF6]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <header className="border-b border-[#2E4A3B]/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
                    <Link href="/learn" className="flex items-center gap-2 text-[#2E4A3B]/70 hover:text-[#2E4A3B] transition-colors font-medium text-sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Learn
                    </Link>
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Artha Logo" width={24} height={24} />
                        <span className={cn("text-[#2E4A3B] font-bold", playfair.className)}>Artha</span>
                    </Link>
                </div>
            </header>

            <article className="container mx-auto px-4 py-16 max-w-3xl">
                <header className="mb-12">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE0] text-[#2E4A3B] text-[10px] font-bold mb-6 w-max uppercase tracking-widest">
                        <Tag className="h-3 w-3" />
                        {postData.category}
                    </div>
                    <h1 className={cn("text-4xl md:text-5xl lg:text-6xl font-bold text-[#2E4A3B] leading-[1.15] mb-8", playfair.className)}>
                        {postData.title}
                    </h1>

                    <div className="relative aspect-[21/9] w-full mb-12 rounded-2xl overflow-hidden shadow-lg border border-[#2E4A3B]/5">
                        <Image
                            src={postData.image || "/blog/revenge-trading.png"}
                            alt={postData.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-[#2E4A3B]/50 border-y border-[#2E4A3B]/5 py-6">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-[#2E4A3B]">{postData.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(postData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </header>

                <div className="prose prose-lg prose-slate max-w-none prose-h1:font-serif prose-h1:text-[#2E4A3B] prose-h1:text-4xl prose-h1:font-bold prose-h1:mt-12 prose-h1:mb-6 prose-h1:leading-tight prose-h2:font-serif prose-h2:text-[#2E4A3B] prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[#2E4A3B]/10 prose-h3:font-serif prose-h3:text-[#2E4A3B] prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-p:text-[#2E4A3B]/80 prose-p:leading-[1.8] prose-p:mb-6 prose-p:text-[17px] prose-strong:text-[#2E4A3B] prose-strong:font-bold prose-a:text-[#E59889] prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-ul:my-6 prose-ul:pl-6 prose-ol:my-6 prose-ol:pl-6 prose-li:text-[#2E4A3B]/80 prose-li:mb-3 prose-li:leading-[1.7] prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-8 prose-blockquote:border-l-4 prose-blockquote:border-[#E59889] prose-blockquote:bg-[#E59889]/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:my-8 prose-blockquote:not-italic prose-blockquote:text-[#2E4A3B]/90 prose-blockquote:font-medium prose-code:text-[#E59889] prose-code:bg-[#E8EFE0] prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-hr:border-[#2E4A3B]/10 prose-hr:my-10">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {postData.content}
                    </ReactMarkdown>
                </div>

                <footer className="mt-16 pt-8 border-t border-[#2E4A3B]/10 flex flex-col items-center text-center">
                    <h3 className={cn("text-2xl text-[#2E4A3B] mb-4", playfair.className)}>Ready to master your trading psychology?</h3>
                    <p className="text-[#2E4A3B]/70 mb-8 max-w-md">Start your automated trading journal today and find your behavioral alpha.</p>
                    <Link href="/login">
                        <button className="px-8 py-4 rounded-full bg-[#2E4A3B] text-white font-bold hover:bg-[#2E4A3B]/90 transition-all shadow-xl shadow-[#2E4A3B]/20">
                            Get Started for Free
                        </button>
                    </Link>
                </footer>
            </article>
        </div>
    );
}
