import Link from 'next/link';
import { getSortedPostsData } from '@/lib/blog/utils';
import { Playfair_Display } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ArrowRight, BookOpen, Clock, Tag } from 'lucide-react';

const playfair = Playfair_Display({ subsets: ['latin'] });

export default function LearnPage() {
    const allPostsData = getSortedPostsData();

    return (
        <div className="min-h-screen bg-[#FAFBF6]">
            {/* Simple Header */}
            <header className="border-b border-[#2E4A3B]/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "CollectionPage",
                            "name": "Artha Insights - Trading Masterclass",
                            "description": "Educational content for serious traders focused on psychology, risk management, and performance analytics.",
                            "author": {
                                "@type": "Person",
                                "name": "Gautham Kanaparthy"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Artha"
                            }
                        })
                    }}
                />
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Artha Logo" width={32} height={32} />
                        <span className={cn("text-[#2E4A3B] text-xl font-bold", playfair.className)}>Artha</span>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-[#2E4A3B]/70 hover:text-[#2E4A3B]">Home</Link>
                        <Link href="/login" className="text-sm font-medium text-[#2E4A3B]">Log in</Link>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-6xl">
                <div className="max-w-3xl mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE0] text-[#2E4A3B] text-xs font-bold mb-4">
                        <BookOpen className="h-3 w-3" />
                        ARTHA INSIGHTS
                    </div>
                    <h1 className={cn("text-4xl md:text-5xl lg:text-6xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                        Master Your Mind, <br />
                        <span className="italic text-[#E59889]">Master the Markets.</span>
                    </h1>
                    <div className="flex items-center gap-3 mb-8 text-[#2E4A3B]/60 italic">
                        <span className="text-sm font-medium">Curated by Gautham Kanaparthy &middot; Lead Strategist at Artha</span>
                    </div>
                    <p className="text-lg text-[#2E4A3B]/70 leading-relaxed">
                        Deep dives into trading psychology, risk management, and data-driven performance.
                        Automate your journal, identify your leaks, and scale your edge.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allPostsData.map((post) => (
                        <Link key={post.slug} href={`/learn/${post.slug}`} className="group">
                            <article className="bg-white rounded-2xl overflow-hidden border border-[#2E4A3B]/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                                <div className="aspect-[16/9] relative overflow-hidden m-2 rounded-xl">
                                    <Image
                                        src={post.image || "/blog/revenge-trading.png"}
                                        alt={post.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex items-center gap-4 mb-4 text-xs font-bold uppercase tracking-wider text-[#2E4A3B]/40">
                                        <span className="flex items-center gap-1">
                                            <Tag className="h-3 w-3" />
                                            {post.category}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            5 min read
                                        </span>
                                    </div>
                                    <h2 className={cn("text-xl font-bold text-[#2E4A3B] mb-3 group-hover:text-[#E59889] transition-colors", playfair.className)}>
                                        {post.title}
                                    </h2>
                                    <p className="text-[#2E4A3B]/70 text-sm leading-relaxed mb-6 flex-1">
                                        {post.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-[#E59889] font-bold text-sm">
                                        Read Article
                                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </main>

            {/* Newsletter simple */}
            <section className="bg-[#1A2F25] py-16 mt-20">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className={cn("text-3xl text-white mb-4", playfair.className)}>Join 5,000+ serious traders</h2>
                    <p className="text-white/60 mb-8">Get weekly insights on behavioral alpha and trading psychology straight to your inbox.</p>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input type="email" placeholder="trade@example.com" className="flex-1 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]" />
                        <button className="px-8 py-3 rounded-full bg-[#4ADE80] text-[#1A2F25] font-bold hover:bg-[#4ADE80]/90 transition-all">Subscribe</button>
                    </div>
                </div>
            </section>
        </div>
    );
}
