"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Share2, Twitter, MessageCircle, MessageSquare, Download, Loader2 } from "lucide-react";
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

    const generateImage = async () => {
        const node = document.getElementById(elementId);
        if (!node) return null;

        setIsGenerating(true);
        try {
            node.classList.add("is-exporting");
            // Small delay to ensure any layout changes from the class are applied
            await new Promise((resolve) => setTimeout(resolve, 100));

            const dataUrl = await toPng(node, {
                backgroundColor: "oklch(0.12 0 0)", // Dark theme background
                style: {
                    padding: "24px",
                    borderRadius: "16px",
                },
                filter: (childNode) => {
                    // Exclude sharing UI itself if it's inside
                    if (childNode instanceof HTMLElement) {
                        return !childNode.classList?.contains('no-export');
                    }
                    return true;
                }
            });
            node.classList.remove("is-exporting");
            setPreviewImage(dataUrl);
            return dataUrl;
        } catch (error) {
            console.error("Error generating image:", error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const shareToTwitter = () => {
        const text = `Check out my trading performance on Artha! 📈 #Trading #Artha`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    };

    const shareToWhatsApp = () => {
        const text = `Check out my trading performance on Artha! 📈 ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const shareToSMS = () => {
        const text = `Check out my trading performance on Artha! 📈 ${window.location.href}`;
        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
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
                        Share your trading stats with your network.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Generating preview...</p>
                            </div>
                        ) : previewImage ? (
                            <img src={previewImage} alt="Performance Preview" className="h-full w-full object-contain" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Failed to generate preview</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2" onClick={shareToTwitter}>
                            <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                            X (Twitter)
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={shareToWhatsApp}>
                            <MessageCircle className="h-4 w-4 text-[#25D366]" />
                            WhatsApp
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={shareToSMS}>
                            <MessageSquare className="h-4 w-4 text-[#34B7F1]" />
                            Messages
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={downloadImage}>
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start">
                    <p className="text-[10px] text-muted-foreground">
                        Tip: High-quality images look better on social media. Artha exports in PNG format.
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
