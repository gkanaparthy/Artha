import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();
        const cookieHeader = req.headers.get("cookie") || "";
        const cookieNames = cookieHeader.split(";").map(c => c.split("=")[0].trim());

        return NextResponse.json({
            authenticated: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            cookieNames,
            host: req.headers.get("host"),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            error: "Failed to fetch session",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
