"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Share2, Download, Loader2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

interface ShareReportProps {
    elementId: string;
    title?: string;
}

export function ShareReport({ elementId, title = "Trading Performance" }: ShareReportProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [canShare, setCanShare] = useState(false);

    const generateImage = async () => {
        const node = document.getElementById(elementId);
        if (!node) return null;

        setIsGenerating(true);
        try {
            node.classList.add("is-exporting");
            await new Promise((resolve) => setTimeout(resolve, 100));

            const dataUrl = await toPng(node, {
                backgroundColor: "oklch(0.12 0 0)", // Dark theme background
                style: {
                    padding: "24px",
                    borderRadius: "16px",
                },
                filter: (childNode) => {
                    if (childNode instanceof HTMLElement) {
                        return !childNode.classList?.contains('no-export');
                    }
                    return true;
                }
            });
            node.classList.remove("is-exporting");
            setPreviewImage(dataUrl);

            // Check if Web Share API with files is supported
            if (typeof navigator !== 'undefined' && navigator.share && typeof navigator.canShare === 'function') {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], `artha-performance.png`, { type: 'image/png' });
                    setCanShare(navigator.canShare({ files: [file] }));
                } catch (e) {
                    setCanShare(false);
                }
            }

            return dataUrl;
        } catch (error) {
            console.error("Error generating image:", error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNativeShare = async () => {
        const dataUrl = previewImage || await generateImage();
        if (!dataUrl) return;

        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `artha-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Artha Trading Performance',
                    text: 'Check out my trading performance on Artha! 📈 Track your trades at arthatrades.com',
                });
            } else {
                // Fallback to download if sharing fails or is unsupported
                downloadImage();
            }
        } catch (error) {
            console.error("Error sharing:", error);
            downloadImage();
        }
    };

    const downloadImage = async () => {
        const dataUrl = previewImage || await generateImage();
        if (!dataUrl) return;

        const link = document.createElement("a");
        link.download = `artha-performance-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) {
                setPreviewImage(null);
                generateImage();
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Performance</DialogTitle>
                    <DialogDescription>
                        Share your trading stats directly to WhatsApp, Twitter, or Messages.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Generating image...</p>
                            </div>
                        ) : previewImage ? (
                            <img src={previewImage} alt="Performance Preview" className="h-full w-full object-contain" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Failed to generate image</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            className="gap-2 w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90"
                            onClick={handleNativeShare}
                            disabled={isGenerating}
                        >
                            <Share className="h-5 w-5" />
                            {canShare ? "Share to Apps" : "Share Image"}
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 w-full"
                            onClick={downloadImage}
                            disabled={isGenerating}
                        >
                            <Download className="h-4 w-4" />
                            Download for Manual Sharing
                        </Button>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start">
                    <p className="text-[10px] text-muted-foreground">
                        {canShare
                            ? "Opens your system share menu to pick WhatsApp, Messages, or social apps."
                            : "Your browser doesn't support direct image sharing. Please download and attach the image manually."}
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
