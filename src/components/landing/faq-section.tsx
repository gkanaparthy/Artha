"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { FAQ_DATA } from "@/lib/constants/faq-data";

const playfair = Playfair_Display({ subsets: ["latin"] });

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
                    {FAQ_DATA.map((faq, idx) => (
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
