"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Check,
    Tag as TagIcon,
    ChevronDown,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TagCategory, TagDefinition } from "@/types/tags";
import { cn } from "@/lib/utils";

interface TagPickerProps {
    onSelect: (tagId: string) => void;
    disabled?: boolean;
}

export function TagPicker({ onSelect, disabled }: TagPickerProps) {
    const [open, setOpen] = useState(false);
    const [tags, setTags] = useState<TagDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchTags = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/tags");
            if (res.ok) {
                const data = await res.json();
                setTags(data.tags);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchTags();
    }, [open]);

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedTags = filteredTags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {} as Record<TagCategory, TagDefinition[]>);

    const categoryLabels: Record<TagCategory, string> = {
        [TagCategory.SETUP]: "Setups",
        [TagCategory.MISTAKE]: "Mistakes",
        [TagCategory.EMOTION]: "Emotions",
        [TagCategory.CUSTOM]: "Custom",
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    disabled={disabled}
                    className="rounded-full px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold gap-2"
                >
                    <TagIcon className="h-4 w-4" />
                    Apply Tag
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 shadow-2xl" align="center" side="top" sideOffset={12}>
                <div className="flex flex-col">
                    <div className="p-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tags..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9 pl-9 text-sm"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : Object.keys(groupedTags).length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground italic">
                                No tags found
                            </div>
                        ) : (
                            Object.entries(groupedTags).map(([category, catTags]) => (
                                <div key={category} className="mb-2 last:mb-0">
                                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-70">
                                        {categoryLabels[category as TagCategory]}
                                    </div>
                                    {catTags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            onClick={() => {
                                                onSelect(tag.id);
                                                setOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="flex-1 truncate">{tag.name}</span>
                                            {tag.icon && <span className="text-xs opacity-60">{tag.icon}</span>}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
