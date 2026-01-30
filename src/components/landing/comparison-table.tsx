"use client";

import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Check, X, Minus } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

type FeatureValue = boolean | "varies" | "free" | "$20-50/mo";

interface ComparisonRow {
    feature: string;
    spreadsheets: FeatureValue;
    otherJournals: FeatureValue;
    artha: FeatureValue;
}

const comparisonData: ComparisonRow[] = [
    { feature: "Auto-sync trades", spreadsheets: false, otherJournals: true, artha: true },
    { feature: "Psychology tracking", spreadsheets: false, otherJournals: false, artha: true },
    { feature: "Mistake pattern analysis", spreadsheets: false, otherJournals: false, artha: true },
    { feature: "Setup performance", spreadsheets: false, otherJournals: false, artha: true },
    { feature: "25+ broker support", spreadsheets: false, otherJournals: "varies", artha: true },
    { feature: "FIFO P&L calculation", spreadsheets: false, otherJournals: "varies", artha: true },
    { feature: "Options support", spreadsheets: false, otherJournals: "varies", artha: true },
    { feature: "Price", spreadsheets: "free", otherJournals: "$20-50/mo", artha: "free" },
];

function ValueCell({ value }: { value: FeatureValue }) {
    if (value === true) {
        return (
            <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                </div>
            </div>
        );
    }
    if (value === false) {
        return (
            <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-400" />
                </div>
            </div>
        );
    }
    if (value === "varies") {
        return (
            <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-yellow-50 flex items-center justify-center">
                    <Minus className="w-4 h-4 text-yellow-600" />
                </div>
            </div>
        );
    }
    if (value === "free") {
        return <span className="text-green-600 font-semibold text-sm">Free</span>;
    }
    return <span className="text-[#2E4A3B]/70 text-sm">{value}</span>;
}

export function ComparisonTable() {
    return (
        <section className="py-16 sm:py-20 md:py-24 bg-white">
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-10 sm:mb-14"
                >
                    <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-3 sm:mb-4", playfair.className)}>
                        Why Traders Switch to Artha
                    </h2>
                    <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-2xl mx-auto px-4">
                        Compare the features that matter most for improving your trading.
                    </p>
                </motion.div>

                {/* Desktop Table */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="hidden md:block overflow-hidden rounded-2xl border border-[#2E4A3B]/10 bg-white shadow-lg"
                >
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#2E4A3B]/10">
                                <th className="text-left py-5 px-6 text-sm font-medium text-[#2E4A3B]/60 bg-[#FAFBF6]">
                                    Feature
                                </th>
                                <th className="py-5 px-4 text-sm font-medium text-[#2E4A3B]/60 bg-[#FAFBF6] text-center w-32">
                                    Spreadsheets
                                </th>
                                <th className="py-5 px-4 text-sm font-medium text-[#2E4A3B]/60 bg-[#FAFBF6] text-center w-32">
                                    Other Journals
                                </th>
                                <th className="py-5 px-4 text-sm font-medium text-[#2E4A3B] bg-[#E8EFE0] text-center w-32 border-x border-[#2E4A3B]/10">
                                    <span className="font-bold">Artha</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonData.map((row, index) => (
                                <tr
                                    key={row.feature}
                                    className={cn(
                                        "border-b border-[#2E4A3B]/5 last:border-b-0",
                                        index % 2 === 0 ? "bg-white" : "bg-[#FAFBF6]/50"
                                    )}
                                >
                                    <td className="py-4 px-6 text-sm text-[#2E4A3B] font-medium">
                                        {row.feature}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <ValueCell value={row.spreadsheets} />
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <ValueCell value={row.otherJournals} />
                                    </td>
                                    <td className="py-4 px-4 text-center bg-[#E8EFE0]/30 border-x border-[#2E4A3B]/5">
                                        <ValueCell value={row.artha} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {comparisonData.map((row, index) => (
                        <motion.div
                            key={row.feature}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className="bg-white rounded-xl border border-[#2E4A3B]/10 p-4 shadow-sm"
                        >
                            <h4 className="font-medium text-[#2E4A3B] mb-3">{row.feature}</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="space-y-1">
                                    <p className="text-xs text-[#2E4A3B]/50">Spreadsheets</p>
                                    <ValueCell value={row.spreadsheets} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-[#2E4A3B]/50">Others</p>
                                    <ValueCell value={row.otherJournals} />
                                </div>
                                <div className="space-y-1 bg-[#E8EFE0]/30 rounded-lg py-1">
                                    <p className="text-xs text-[#2E4A3B] font-medium">Artha</p>
                                    <ValueCell value={row.artha} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
