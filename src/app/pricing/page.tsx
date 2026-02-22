"use client";

import { PricingSection } from "@/components/subscription/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { PageTransition } from "@/components/motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
    return (
        <PageTransition>
            <div className="min-h-screen bg-[#FAFBF6] pb-20">
                <header className="container mx-auto px-4 py-8 max-w-6xl">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-[#2E4A3B] hover:bg-[#2E4A3B]/5">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </header>

                <main>
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "WebPage",
                                "name": "Artha Pricing Plans",
                                "description": "Affordable Artha plans including Pro and Lifetime access with R-multiple analytics, FIFO performance metrics, and psychology tracking.",
                                "publisher": {
                                    "@type": "Organization",
                                    "name": "Artha"
                                },
                                "mainEntity": {
                                    "@type": "SoftwareApplication",
                                    "name": "Artha Pro",
                                    "featureList": [
                                        "R-multiple analytics (Net R, Avg R, risk coverage)",
                                        "FIFO P&L and win-rate reporting",
                                        "Psychology and setup analytics"
                                    ],
                                    "offers": {
                                        "@type": "AggregateOffer",
                                        "priceCurrency": "USD",
                                        "lowPrice": "12",
                                        "offerCount": "3"
                                    }
                                }
                            })
                        }}
                    />
                    <div className="container mx-auto px-4 max-w-6xl mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4 text-center">
                            Pricing Plans for Every Trader
                        </h1>
                        <p className="text-[#2E4A3B]/60 text-center text-lg max-w-2xl mx-auto">
                            Every new user gets 30 days of full Pro access free, including R-multiple analytics. No credit card required.
                        </p>
                    </div>
                    <PricingSection className="py-10" />
                    <FAQSection />
                </main>
            </div>
        </PageTransition>
    );
}
