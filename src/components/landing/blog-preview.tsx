import Link from 'next/link';
import Image from 'next/image';
import { Playfair_Display } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock } from 'lucide-react';

const playfair = Playfair_Display({ subsets: ['latin'] });

const featuredPosts = [
    {
        title: "The Hidden Cost of Revenge Trading",
        description: "Learn how to identify the emotional patterns that kill accounts.",
        slug: "revenge-trading-costs",
        image: "/blog/revenge-trading.png",
        category: "Psychology"
    },
    {
        title: "The 'Silent Killer' of Trading Accounts",
        description: "Not all trades are created equal. Identify your toxic setups.",
        slug: "identifying-toxic-setups",
        image: "/blog/toxic-setups.png",
        category: "Analysis"
    },
    {
        title: "Artha vs. Traditional Trading Spreadsheets",
        description: "Is it time to ditch the Excel sheet for automated journaling?",
        slug: "artha-vs-spreadsheets",
        image: "/blog/artha-vs-spreadsheets.png",
        category: "Comparison"
    }
];

export function BlogPreview() {
    return (
        <section className="py-24 bg-[#FAFBF6]">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="max-w-2xl">
                        <h2 className={cn("text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                            Sharpen Your Edge with <span className="italic text-[#E59889]">Artha Insights</span>
                        </h2>
                        <p className="text-[#2E4A3B]/70 text-lg">
                            Explore our latest guides on trading psychology, data analysis, and professional consistency.
                        </p>
                    </div>
                    <Link href="/learn" className="inline-flex items-center gap-2 text-[#E59889] font-bold hover:underline group">
                        View all insights
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {featuredPosts.map((post, idx) => (
                        <Link key={idx} href={`/learn/${post.slug}`} className="group">
                            <div className="bg-white rounded-2xl overflow-hidden border border-[#2E4A3B]/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                <div className="aspect-[16/9] relative m-2 rounded-xl overflow-hidden">
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-6 pt-4 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2E4A3B]/40 mb-3">
                                        <span className="px-2 py-0.5 rounded-full bg-[#E8EFE0] text-[#2E4A3B]">{post.category}</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            5 MIN READ
                                        </span>
                                    </div>
                                    <h3 className={cn("text-xl font-bold text-[#2E4A3B] mb-3 group-hover:text-[#E59889] transition-colors", playfair.className)}>
                                        {post.title}
                                    </h3>
                                    <p className="text-sm text-[#2E4A3B]/70 leading-relaxed mb-6 flex-1">
                                        {post.description}
                                    </p>
                                    <div className="flex items-center gap-1 text-[#E59889] font-bold text-xs">
                                        Read Story
                                        <ArrowRight className="h-3 w-3 transform group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
