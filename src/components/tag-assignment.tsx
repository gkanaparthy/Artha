"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    X,
    Tag as TagIcon,
    Loader2,
    ChevronDown,
    Search,
    Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TagCategory, TagDefinition, PositionTag } from "@/types/tags";
import { encodePositionKey } from "@/lib/utils/position-key";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TagAssignmentProps {
    positionKey: string; // Plain string, we'll encode it here
    className?: string;
}

// Simple module-level cache for tag definitions
let cachedTags: TagDefinition[] | null = null;
let cachedTagsTimestamp = 0;
const TAGS_CACHE_DURATION = 30000; // 30 seconds

export function clearTagCache() {
    cachedTags = null;
    cachedTagsTimestamp = 0;
}

export function TagAssignment({ positionKey, className }: TagAssignmentProps) {
    const [positionTags, setPositionTags] = useState<PositionTag[]>([]);
    const [allTags, setAllTags] = useState<TagDefinition[]>(cachedTags || []);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const encodedKey = encodePositionKey(positionKey);

    const fetchPositionTags = async () => {
        try {
            const res = await fetch(`/api/positions/${encodedKey}/tags`);
            if (!res.ok) throw new Error("Failed to fetch position tags");
            const data = await res.json();
            setPositionTags(data.tags);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAllTags = async () => {
        // Use cache if fresh
        const now = Date.now();
        if (cachedTags && now - cachedTagsTimestamp < TAGS_CACHE_DURATION) {
            setAllTags(cachedTags);
            return;
        }

        try {
            const res = await fetch("/api/tags");
            if (!res.ok) throw new Error("Failed to fetch all tags");
            const data = await res.json();
            cachedTags = data.tags;
            cachedTagsTimestamp = now;
            setAllTags(data.tags);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            // Parallel fetch, but fetchAllTags might verify cache immediately
            await Promise.all([fetchPositionTags(), fetchAllTags()]);
            setLoading(false);
        };
        init();
    }, [positionKey]);

    const handleAddTag = async (tagDef: TagDefinition) => {
        try {
            setSaving(true);
            const res = await fetch(`/api/positions/${encodedKey}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tagDefinitionIds: [tagDef.id] }),
            });

            if (!res.ok) throw new Error("Failed to add tag");

            await fetchPositionTags();
            toast.success(`Tagged as ${tagDef.name}`);
        } catch (error) {
            toast.error("Failed to add tag");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            setRemovingId(tagId);
            const res = await fetch(`/api/positions/${encodedKey}/tags/${tagId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to remove tag");

            setPositionTags(prev => prev.filter(pt => pt.tagDefinitionId !== tagId));
            // No need to fetch again if we update optimistic locally, but safe to do so silently?
            // fetchPositionTags(); 
            toast.success("Tag removed");
        } catch (error) {
            toast.error("Failed to remove tag");
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tags...
            </div>
        );
    }

    // Filter and group tags by category
    const filteredTags = allTags.filter(t =>
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
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-wrap gap-2 min-h-[32px] items-center">
                {positionTags.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No tags assigned</span>
                )}

                {positionTags.map((pt) => {
                    const tag = pt.tagDefinition;
                    if (!tag) return null;
                    return (
                        <Badge
                            key={pt.id}
                            variant="secondary"
                            className="pl-2 pr-1 py-1 flex items-center gap-1 group transition-all max-w-full"
                            style={{ backgroundColor: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}30` }}
                        >
                            {tag.icon && <span className="mr-1">{tag.icon}</span>}
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{tag.name}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent potential bubble up issues
                                    handleRemoveTag(tag.id);
                                }}
                                disabled={removingId === tag.id}
                                className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-1 -mr-0.5 disabled:opacity-50 touch-manipulation"
                                aria-label={`Remove ${tag.name} tag`}
                            >
                                {removingId === tag.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <X className="h-3 w-3" />
                                )}
                            </button>
                        </Badge>
                    );
                })}

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 border-dashed gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Tag
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                        <div className="flex flex-col">
                            <div className="p-2 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tags..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto p-1">
                                {Object.keys(groupedTags).length === 0 && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No tags found.
                                    </div>
                                )}
                                {Object.entries(groupedTags).map(([category, tags]) => (
                                    <div key={category} className="mb-2 last:mb-0">
                                        <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                            {categoryLabels[category as TagCategory]}
                                        </div>
                                        {tags.map((tag) => {
                                            const isSelected = positionTags.some(pt => pt.tagDefinitionId === tag.id);
                                            const isProcessing = saving || removingId === tag.id;

                                            return (
                                                <button
                                                    key={tag.id}
                                                    disabled={isProcessing}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleRemoveTag(tag.id);
                                                        } else {
                                                            handleAddTag(tag);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                                                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
                                                        isProcessing && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                        <span>{tag.name}</span>
                                                    </div>
                                                    {isSelected && (
                                                        removingId === tag.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )
                                                    )}
                                                    {!isSelected && saving && (
                                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
