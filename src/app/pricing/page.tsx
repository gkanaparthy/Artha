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
                    <PricingSection className="py-10" />
                    <FAQSection />
                </main>
            </div>
        </PageTransition>
    );
}
