import { SubscriptionPlan } from "@prisma/client";

export const PRICING_CONFIG = {
    FOUNDER_LIMIT: 100,
    TRIAL_DAYS: 30,

    PLANS: {
        MONTHLY: {
            id: 'MONTHLY',
            name: 'Monthly',
            priceIds: {
                FOUNDER: process.env.STRIPE_PRICE_FOUNDER_MONTHLY || '',
                REGULAR: process.env.STRIPE_PRICE_REGULAR_MONTHLY || '',
            }
        },
        ANNUAL: {
            id: 'ANNUAL',
            name: 'Annual',
            priceIds: {
                FOUNDER: process.env.STRIPE_PRICE_FOUNDER_ANNUAL || '',
                REGULAR: process.env.STRIPE_PRICE_REGULAR_ANNUAL || '',
            }
        },
        LIFETIME: {
            id: 'LIFETIME',
            name: 'Lifetime',
            priceIds: {
                FOUNDER: process.env.STRIPE_PRICE_FOUNDER_LIFETIME || '',
                REGULAR: process.env.STRIPE_PRICE_REGULAR_LIFETIME_149 || '', // Default or dynamic
            }
        }
    }
};

export function getPriceId(plan: string, tier: 'FOUNDER' | 'REGULAR'): string {
    const planConfig = PRICING_CONFIG.PLANS[plan as keyof typeof PRICING_CONFIG.PLANS];
    if (!planConfig) throw new Error(`Invalid plan: ${plan}`);

    const priceId = planConfig.priceIds[tier];
    if (!priceId) {
        console.error(`Missing Price ID for plan ${plan} and tier ${tier}`);
        return '';
    }

    return priceId;
}

export function getPlanFromPriceId(priceId: string): SubscriptionPlan | null {
    for (const [planKey, planConfig] of Object.entries(PRICING_CONFIG.PLANS)) {
        if (Object.values(planConfig.priceIds).includes(priceId)) {
            return planKey as SubscriptionPlan;
        }
    }
    return null;
}
