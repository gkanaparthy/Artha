"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProgressBar } from "./progress-bar";
import { WelcomeStep, type TradingStyle } from "./steps/welcome-step";
import { ChallengeStep, type Challenge } from "./steps/challenge-step";
import { PainStep } from "./steps/pain-step";
import { SolutionStep } from "./steps/solution-step";
import { ConnectStep } from "./steps/connect-step";

const TOTAL_STEPS = 5;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 200 : -200,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 200 : -200,
        opacity: 0,
    }),
};

interface OnboardingWizardProps {
    userName?: string | null;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
    const router = useRouter();
    const { update } = useSession();
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [saving, setSaving] = useState(false);

    const [tradingStyle, setTradingStyle] = useState<TradingStyle | null>(null);
    const [challenge, setChallenge] = useState<Challenge | null>(null);

    const canContinue = (() => {
        switch (currentStep) {
            case 0: return !!tradingStyle;
            case 1: return !!challenge;
            case 2: return true; // Pain step is read-only
            case 3: return true; // Solution step is read-only
            case 4: return true; // Connect step has its own flow
            default: return false;
        }
    })();

    const saveAndRedirect = useCallback(async (skippedAtStep?: number) => {
        setSaving(true);
        try {
            await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tradingStyle,
                    biggestChallenge: challenge,
                    skippedAtStep: skippedAtStep ?? null,
                }),
            });
            // Refresh JWT to include onboardingCompleted = true
            await update();
            router.push("/dashboard");
        } catch {
            // Still redirect on error — don't trap users in onboarding
            router.push("/dashboard");
        }
    }, [tradingStyle, challenge, update, router]);

    const goNext = useCallback(() => {
        if (currentStep < TOTAL_STEPS - 1) {
            setDirection(1);
            setCurrentStep((s) => s + 1);
        }
    }, [currentStep]);

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((s) => s - 1);
        }
    }, [currentStep]);

    const handleSkip = useCallback(() => {
        saveAndRedirect(currentStep);
    }, [currentStep, saveAndRedirect]);

    const handleConnected = useCallback(() => {
        saveAndRedirect();
    }, [saveAndRedirect]);

    return (
        <div className="min-h-screen bg-[#FAFBF6] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-2">
                    <span className="text-[#2E4A3B] text-xl font-bold font-serif">Artha</span>
                </div>
                <button
                    onClick={handleSkip}
                    disabled={saving}
                    className="text-sm text-[#2E4A3B]/50 hover:text-[#2E4A3B]/70 transition-colors cursor-pointer"
                >
                    Skip for now
                </button>
            </header>

            {/* Progress */}
            <div className="flex justify-center px-6">
                <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>

            {/* Step content */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
                <div className="w-full max-w-2xl">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {currentStep === 0 && (
                                <WelcomeStep
                                    userName={userName}
                                    value={tradingStyle}
                                    onChange={setTradingStyle}
                                />
                            )}
                            {currentStep === 1 && (
                                <ChallengeStep
                                    value={challenge}
                                    onChange={setChallenge}
                                />
                            )}
                            {currentStep === 2 && (
                                <PainStep challenge={challenge} />
                            )}
                            {currentStep === 3 && (
                                <SolutionStep challenge={challenge} />
                            )}
                            {currentStep === 4 && (
                                <ConnectStep onConnected={handleConnected} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation (hidden on connect step — it has its own CTA) */}
            {currentStep < 4 && (
                <div className="px-6 pb-8 sm:pb-10">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                        <Button
                            variant="ghost"
                            onClick={goBack}
                            disabled={currentStep === 0}
                            className="text-[#2E4A3B]/60 hover:text-[#2E4A3B] hover:bg-[#2E4A3B]/5 gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>

                        <Button
                            onClick={goNext}
                            disabled={!canContinue}
                            className="bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white gap-2 px-6 h-11 rounded-xl shadow-lg shadow-[#2E4A3B]/20"
                        >
                            Continue
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
