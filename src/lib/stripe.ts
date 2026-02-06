import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
    get(_, prop) {
        if (!_stripe) {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
            }
            _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2026-01-28.clover', // Using the latest stable version
                appInfo: {
                    name: 'Artha Trades',
                    version: '1.0.0',
                },
            });
        }
        return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
    }
});
