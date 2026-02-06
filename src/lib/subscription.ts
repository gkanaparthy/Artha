import { prisma } from './prisma';
import { SubscriptionStatus, SubscriptionPlan, SubscriptionTier } from '@prisma/client';

export type SubscriptionInfo = {
    status: SubscriptionStatus;
    plan: SubscriptionPlan | null;
    tier: SubscriptionTier;
    isActive: boolean;
    isTrialing: boolean;
    isLifetime: boolean;
    isFounder: boolean;
    isGrandfathered: boolean;
    trialDaysRemaining: number | null;
    currentPeriodEnd: Date | null;
    canAccessPro: boolean;
};

export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            subscriptionStatus: true,
            subscriptionPlan: true,
            subscriptionTier: true,
            isFounder: true,
            isGrandfathered: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
        }
    });

    if (!user) {
        return {
            status: 'NONE',
            plan: null,
            tier: 'REGULAR',
            isActive: false,
            isTrialing: false,
            isLifetime: false,
            isFounder: false,
            isGrandfathered: false,
            trialDaysRemaining: null,
            currentPeriodEnd: null,
            canAccessPro: false,
        };
    }

    const now = Date.now();

    const trialDaysRemaining = user.trialEndsAt
        ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)))
        : null;

    // Time-based access checks to prevent indefinite access if webhooks are delayed
    const isTrialingAndValid = user.subscriptionStatus === 'TRIALING'
        && !!user.trialEndsAt
        && user.trialEndsAt.getTime() > now;

    const isCancelledButStillActive = user.subscriptionStatus === 'CANCELLED'
        && !!user.currentPeriodEnd
        && user.currentPeriodEnd.getTime() > now;

    const canAccessPro: boolean =
        user.subscriptionStatus === 'ACTIVE'
        || user.subscriptionStatus === 'LIFETIME'
        || user.subscriptionStatus === 'GRANDFATHERED'
        || user.subscriptionStatus === 'PAST_DUE' // Grace period while Stripe retries
        || isTrialingAndValid
        || isCancelledButStillActive;

    return {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        tier: user.subscriptionTier,
        isActive: user.subscriptionStatus === 'ACTIVE',
        isTrialing: user.subscriptionStatus === 'TRIALING',
        isLifetime: user.subscriptionStatus === 'LIFETIME',
        isFounder: user.isFounder,
        isGrandfathered: user.isGrandfathered,
        trialDaysRemaining,
        currentPeriodEnd: user.currentPeriodEnd,
        canAccessPro,
    };
}

/**
 * Helper to check if a user has access to a specific feature based on their subscription
 */
export async function checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const sub = await getSubscriptionInfo(userId);

    // Core gating logic
    switch (feature) {
        case 'sync_trades':
        case 'connect_broker':
        case 'ai_insights':
        case 'export':
        case 'calendar_view':
            return sub.canAccessPro;

        case 'unlimited_ai_insights':
            // Currently giving unlimited to Lifetime/Grandfathered
            // Regular Pro might have a monthly limit in the future
            return sub.isLifetime || sub.isGrandfathered;

        default:
            return sub.canAccessPro;
    }
}
