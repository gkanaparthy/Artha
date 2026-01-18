"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

interface UserIssue {
    userId: string;
    userName: string | null;
    email: string | null;
    issues: {
        phantomPositions?: {
            count: number;
            symbols: string[];
        };
        oldOpenPositions?: {
            count: number;
            oldestDate: string;
        };
        extremePositionCount?: {
            count: number;
        };
    };
    severity: 'low' | 'medium' | 'high';
}

interface HealthCheckResult {
    scannedUsers: number;
    usersWithIssues: number;
    issues: UserIssue[];
    timestamp: string;
    summary: {
        critical: number;
        medium: number;
        low: number;
    };
}

export default function DataHealthPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<HealthCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runHealthCheck = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/data-health-check');
            if (!res.ok) throw new Error('Health check failed');
            const data = await res.json();
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'text-red-500';
            case 'medium': return 'text-amber-500';
            case 'low': return 'text-blue-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="container mx-auto p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Data Health Monitor</h1>
                    <p className="text-muted-foreground">Scan for phantom positions and data quality issues</p>
                </div>
                <Button onClick={runHealthCheck} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Run Health Check
                </Button>
            </div>

            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="h-5 w-5" />
                            <p>{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {result && (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Scanned Users
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{result.scannedUsers}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Users with Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-500">{result.usersWithIssues}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Critical
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">{result.summary.critical}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Last Scan
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm">{new Date(result.timestamp).toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {result.issues.length === 0 ? (
                        <Card className="border-green-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-green-500">
                                    <CheckCircle className="h-5 w-5" />
                                    <p className="font-medium">All users have clean data! No issues detected.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Issues Found</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {result.issues.map((user) => (
                                        <div key={user.userId} className="border rounded-lg p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{user.userName || user.email}</p>
                                                    <p className="text-sm text-muted-foreground">{user.userId}</p>
                                                </div>
                                                <span className={`text-sm font-medium ${getSeverityColor(user.severity)}`}>
                                                    {user.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            {user.issues.phantomPositions && (
                                                <div className="bg-muted p-3 rounded">
                                                    <p className="text-sm font-medium">Phantom Positions: {user.issues.phantomPositions.count}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Symbols: {user.issues.phantomPositions.symbols.join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                            {user.issues.oldOpenPositions && (
                                                <div className="bg-muted p-3 rounded">
                                                    <p className="text-sm font-medium">Old Open Positions: {user.issues.oldOpenPositions.count}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Oldest: {user.issues.oldOpenPositions.oldestDate}
                                                    </p>
                                                </div>
                                            )}
                                            {user.issues.extremePositionCount && (
                                                <div className="bg-muted p-3 rounded">
                                                    <p className="text-sm font-medium">
                                                        Extreme Symbol Count: {user.issues.extremePositionCount.count}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
