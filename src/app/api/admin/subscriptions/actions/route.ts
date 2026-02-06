import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendGrandfatherAnnouncementEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, action, data } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, subscriptionStatus: true, subscriptionTier: true, trialEndsAt: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        switch (action) {
            case 'grandfather':
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: 'GRANDFATHERED',
                        subscriptionPlan: 'LIFETIME',
                        subscriptionTier: 'REGULAR',
                        isGrandfathered: true,
                        isFounder: false, // Grandfathered isn't technically a "Founder" purchase
                        trialStartedAt: null,
                        trialEndsAt: null,
                    }
                });

                // Optionally send email
                if (data?.sendEmail && targetUser.email) {
                    await sendGrandfatherAnnouncementEmail(targetUser.email, targetUser.name?.split(' ')[0]);
                }

                return NextResponse.json({ success: true, message: 'User marked as grandfathered' });

            case 'extend-trial': {
                const days = data?.days || 14;
                const currentTrialEnd = targetUser.subscriptionStatus === 'TRIALING' && targetUser.trialEndsAt
                    ? new Date(targetUser.trialEndsAt)
                    : new Date();

                const newTrialEnd = new Date(currentTrialEnd.getTime() + (days * 24 * 60 * 60 * 1000));

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: 'TRIALING',
                        trialEndsAt: newTrialEnd,
                        subscriptionTier: targetUser.subscriptionTier || 'REGULAR'
                    }
                });

                return NextResponse.json({
                    success: true,
                    message: `Trial extended by ${days} days`,
                    newTrialEnd
                });
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('[Admin Action Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
