import { Snaptrade } from 'snaptrade-typescript-sdk';

const clientId = process.env.SNAPTRADE_CLIENT_ID;
const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

if (!clientId || !consumerKey) {
  console.warn(
    'Missing SNAPTRADE_CLIENT_ID or SNAPTRADE_CONSUMER_KEY environment variables.'
  );
}

export const snapTrade = new Snaptrade({
  clientId: clientId!,
  consumerKey: consumerKey!,
});

