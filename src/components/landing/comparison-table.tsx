"use client";

import { Check, X, Crown } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

const features = [
    { name: "Auto-sync trades", spreadsheet: false, other: "Some / CSV only", artha: "100+ brokers, automatic" },
    { name: "Manual entry needed", spreadsheet: "All of it", other: "Most of it", artha: "None" },
    { name: "R-multiple analytics", spreadsheet: "DIY", other: "Rare", artha: "Built in" },
    { name: "FIFO P&L", spreadsheet: "Manual", other: "Varies", artha: "Automatic" },
    { name: "Behavioral cost in $", spreadsheet: "No", other: "No", artha: "Yes" },
    { name: "AI insights", spreadsheet: "No", other: "No", artha: "Yes" },
    { name: "Price", spreadsheet: "Free", other: "$20-50/mo", artha: "$12/mo or $99 lifetime" },
];

export function ComparisonTable() {
    return (
        <section className="py-20 bg-[#FAFBF6]">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                        How Artha compares
                    </h2>
                    <p className="text-lg text-[#2E4A3B]/70 max-w-2xl mx-auto">
                        The biggest difference is simple: Artha removes manual logging and focuses on behavioral edge.
                    </p>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-[#2E4A3B]/10 shadow-lg bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAFBF6]">
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider">Features</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider text-center">Spreadsheets</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B]/50 uppercase tracking-wider text-center">Other Journals</th>
                                <th className="p-6 text-sm font-bold text-[#2E4A3B] uppercase tracking-wider text-center bg-[#E8EFE0]/50">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Crown className="h-4 w-4 text-[#E59889]" />
                                        Artha
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2E4A3B]/5">
                            {features.map((feature, idx) => (
                                <tr key={idx} className="hover:bg-[#FAFBF6]/80 transition-colors">
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
                                            <span className="text-sm font-bold text-green-600">{feature.artha}</span>
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
