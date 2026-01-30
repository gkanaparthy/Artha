"use client";

import { Check, X } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

const features = [
    { name: "Auto-sync trades", spreadsheet: false, other: true, artha: true },
    { name: "Psychology tracking", spreadsheet: false, other: false, artha: true },
    { name: "Mistake patterns", spreadsheet: false, other: false, artha: true },
    { name: "Setup analytics", spreadsheet: false, other: false, artha: true },
    { name: "100+ broker support", spreadsheet: false, other: "Varies", artha: true },
    { name: "Price", spreadsheet: "Free", other: "$20-50/mo", artha: "Free" },
];

export function ComparisonTable() {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                        Why Choose Artha?
                    </h2>
                    <p className="text-lg text-[#2E4A3B]/70 max-w-2xl mx-auto">
                        See how Artha stacks up against traditional methods and other modern journals.
                    </p>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-[#2E4A3B]/10 shadow-lg">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAFBF6]">
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider">Features</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider text-center">Spreadsheets</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider text-center">Other Journals</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B] uppercase tracking-wider text-center bg-[#E8EFE0]/30">Artha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2E4A3B]/5">
                            {features.map((feature, idx) => (
                                <tr key={idx} className="hover:bg-[#FAFBF6]/50 transition-colors">
                                    <td className="p-6 font-medium text-[#2E4A3B]">{feature.name}</td>
                                    <td className="p-6 text-center">
                                        {typeof feature.spreadsheet === "boolean" ? (
                                            feature.spreadsheet ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-400 mx-auto" />
                                        ) : (
                                            <span className="text-sm text-[#2E4A3B]/60 font-medium">{feature.spreadsheet}</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-center">
                                        {typeof feature.other === "boolean" ? (
                                            feature.other ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-400 mx-auto" />
                                        ) : (
                                            <span className="text-sm text-[#2E4A3B]/60 font-medium">{feature.other}</span>
                                        )}
                                    </td>
                                    <td className="p-6 text-center bg-[#E8EFE0]/20">
                                        {typeof feature.artha === "boolean" ? (
                                            feature.artha ? <Check className="h-6 w-6 text-green-600 mx-auto font-bold" /> : <X className="h-6 w-6 text-red-400 mx-auto" />
                                        ) : (
                                            <span className="text-base text-[#2E4A3B] font-bold">{feature.artha}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
