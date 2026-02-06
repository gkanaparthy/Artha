import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();
        return NextResponse.json({
            authenticated: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            error: "Failed to fetch session",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
