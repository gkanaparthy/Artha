"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

const faqs = [
    {
        question: "How does auto-sync work?",
        answer: "Connect your brokerage account securely through SnapTrade (trusted by millions). Your trades sync automatically - no manual entry, no CSV uploads, no spreadsheets. We pull your complete trade history and keep it updated daily."
    },
    {
        question: "Is my data secure?",
        answer: "Absolutely. We use AES-256-GCM encryption for all sensitive data. We never store your brokerage login credentials - SnapTrade handles authentication with bank-level security. Your trade data stays private and encrypted."
    },
    {
        question: "What brokers do you support?",
        answer: "100+ brokerages including Robinhood, Fidelity, Interactive Brokers, Zerodha (India), Schwab, Webull, Trading 212, Coinbase, Binance, and more. Coverage includes US, Canada, India, Europe, and Australia."
    },
    {
        question: "Is this really free?",
        answer: "Yes - during early access, everything is free. We're focused on building the best trading journal possible, and your feedback helps us get there. Paid tiers may come later, but early adopters will always get special treatment."
    },
    {
        question: "How is this different from other trading journals?",
        answer: "Most journals just track P&L. Artha tracks your psychology. Tag every trade with setups (Breakout, Support Bounce), mistakes (FOMO, Revenge Trade), and emotions (Fear, Greed, Focused). Then see your 'Behavioral Alpha' - exactly how much your mistakes cost you and which setups actually make money."
    },
    {
        question: "Do you support options trading?",
        answer: "Yes! Full options support including standard and mini options, with proper contract multipliers (100x and 10x). P&L is calculated using FIFO matching across your entire position history."
    }
];

export function FAQSection() {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-[#2E4A3B]/70 mx-auto">
                        Everything you need to know about Artha.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((faq, idx) => (
                        <AccordionItem
                            key={idx}
                            value={`item-${idx}`}
                            className="border border-[#2E4A3B]/10 rounded-2xl px-6 bg-[#FAFBF6]/50"
                        >
                            <AccordionTrigger className="text-left font-bold text-[#2E4A3B] hover:no-underline py-6">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-[#2E4A3B]/70 pb-6 leading-relaxed">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
