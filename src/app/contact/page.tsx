"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Mail, MessageSquare, HelpCircle } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function ContactPage() {
    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2E4A3B]/5 bg-[#FAFBF6]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha" fill className="object-contain" />
                        </div>
                        <span className={cn("text-[#2E4A3B] text-2xl font-bold tracking-tight", playfair.className)}>
                            Artha
                        </span>
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="flex-1 py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-16">
                        <h1 className={cn("text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                            Get in Touch
                        </h1>
                        <p className="text-[#2E4A3B]/60 text-lg max-w-2xl mx-auto">
                            Have questions, feedback, or need help? We&apos;d love to hear from you.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <ContactCard
                            icon={Mail}
                            title="General Inquiries"
                            description="For general questions about Artha"
                            email="hello@arthatrades.com"
                        />
                        <ContactCard
                            icon={HelpCircle}
                            title="Support"
                            description="Need help with your account or trades?"
                            email="support@arthatrades.com"
                        />
                        <ContactCard
                            icon={MessageSquare}
                            title="Feedback"
                            description="Share your ideas and suggestions"
                            email="feedback@arthatrades.com"
                        />
                    </div>

                    <div className="bg-white rounded-2xl p-8 md:p-12 border border-[#2E4A3B]/5 shadow-sm">
                        <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                            About WELLTHY Products LLC
                        </h2>
                        <div className="text-[#2E4A3B]/70 space-y-4">
                            <p className="leading-relaxed">
                                Artha is developed and operated by WELLTHY Products LLC. We&apos;re dedicated to building
                                tools that help traders improve their performance through better journaling and analytics.
                            </p>
                            <p className="leading-relaxed">
                                Our mission is to make professional-grade trading tools accessible to everyone,
                                from beginners to experienced traders.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-[#2E4A3B] text-white py-8">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <p className="text-white/40 text-sm">
                        © {new Date().getFullYear()} WELLTHY Products LLC. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function ContactCard({
    icon: Icon,
    title,
    description,
    email
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    email: string;
}) {
    return (
        <div className="p-8 rounded-2xl bg-white border border-[#2E4A3B]/5 hover:shadow-lg transition-all duration-300 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8EFE0] flex items-center justify-center mb-6 mx-auto text-[#2E4A3B]">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-[#2E4A3B] mb-2">{title}</h3>
            <p className="text-[#2E4A3B]/60 text-sm mb-4">{description}</p>
            <a
                href={`mailto:${email}`}
                className="text-[#2E4A3B] font-semibold hover:underline text-sm"
            >
                {email}
            </a>
        </div>
    );
}
