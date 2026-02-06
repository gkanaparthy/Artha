import { getPostData, getAllPostSlugs } from '@/lib/blog/utils';
import { Playfair_Display } from 'next/font/google';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';

const playfair = Playfair_Display({ subsets: ['latin'] });

export async function generateStaticParams() {
    return getAllPostSlugs();
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const postData = await getPostData(slug);

    return (
        <div className="min-h-screen bg-[#FAFBF6]">
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

                <div className="prose prose-lg prose-slate max-w-none 
          prose-headings:font-serif prose-headings:text-[#2E4A3B] 
          prose-p:text-[#2E4A3B]/80 prose-p:leading-relaxed
          prose-strong:text-[#2E4A3B] prose-strong:font-bold
          prose-a:text-[#E59889] prose-a:no-underline hover:prose-a:underline
          prose-li:text-[#2E4A3B]/80
          prose-img:rounded-2xl
          prose-blockquote:border-[#E59889] prose-blockquote:bg-[#E59889]/5 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
        ">
                    <MDXRemote source={postData.content} />
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
