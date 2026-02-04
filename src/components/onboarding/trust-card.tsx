import { motion } from "framer-motion";
import { ShieldCheck, Lock, EyeOff, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectBrokerButton } from "@/components/connect-broker-button";
import Image from "next/image";

export function TrustOnboardingCard() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto"
        >
            <Card className="overflow-hidden border-0 bg-white shadow-2xl relative">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                <CardContent className="p-8 sm:p-12 text-center relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                        Securely connect your brokerage
                    </h2>

                    <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                        Artha uses <span className="font-semibold text-slate-900">SnapTrade</span> to securely sync your performance data.
                        We never see your passwords or have access to move funds.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 text-slate-600">
                                <Lock className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bank-Level Security</span>
                            <p className="text-[10px] text-slate-400 mt-1">AES-256 Encryption</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 text-slate-600">
                                <EyeOff className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Read-Only Access</span>
                            <p className="text-[10px] text-slate-400 mt-1">We can't place trades</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 text-slate-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">SOC2 Type II</span>
                            <p className="text-[10px] text-slate-400 mt-1">Industry standard auditor</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="scale-110">
                            <ConnectBrokerButton />
                        </div>
                        <p className="text-xs text-slate-400">
                            Support for 25+ brokers including Robinhood, Schwab, Fidelity, and IBKR.
                        </p>
                    </div>

                    <div className="mt-12">
                        <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-6">Trusted by leading brokers</div>
                        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-40 grayscale">
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">Robinhood</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">Schwab</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">Fidelity</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">Zerodha</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">Webull</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
