import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSubscriptionInfo } from '@/lib/subscription';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await getSubscriptionInfo(session.user.id);
        return NextResponse.json(subscription);

    } catch (error: any) {
        console.error('[Subscription API Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
