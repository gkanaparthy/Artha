import crypto from 'crypto';

/**
 * Simulate a SnapTrade Webhook locally.
 * Usage: pnpm tsx scripts/simulate-webhook.ts <userId> <snapTradeUserId> <snapTradeAccountId>
 */

const WEBHOOK_SECRET = process.env.SNAPTRADE_WEBHOOK_SECRET || 'test_secret';
const LOCAL_URL = 'http://localhost:3000/api/webhooks/snaptrade';

async function simulate() {
    const [userId, snapTradeUserId, snapTradeAccountId] = process.argv.slice(2);

    if (!snapTradeUserId || !snapTradeAccountId) {
        console.error('Usage: pnpm tsx scripts/simulate-webhook.ts <userId> <snapTradeUserId> <snapTradeAccountId>');
        process.exit(1);
    }

    const payload: Record<string, string> = {
        accountId: snapTradeAccountId,
        eventTimestamp: new Date().toISOString(),
        type: 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE',
        userId: snapTradeUserId,
    };

    // SnapTrade signs over sorted, compact JSON → base64
    const sortedBody = JSON.stringify(payload, Object.keys(payload).sort());
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(sortedBody)
        .digest('base64');

    console.log(`Sending webhook for user ${snapTradeUserId}...`);
    console.log(`Payload: ${sortedBody}`);
    console.log(`Signature: ${signature}`);

    try {
        const response = await fetch(LOCAL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Signature': signature
            },
            body: sortedBody
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (response.status === 200) {
            console.log('✅ Webhook accepted! Check server logs to see if sync started.');
        } else {
            console.log('❌ Webhook rejected. Make sure SNAPTRADE_WEBHOOK_SECRET matches in .env');
        }
    } catch (err) {
        console.error('Error sending webhook:', err);
    }
}

simulate();
