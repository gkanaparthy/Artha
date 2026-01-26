"use client";

import { useState, useEffect } from "react";
import {
    Tags,
    Check,
    ChevronDown,
    X,
    PlusCircle,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/contexts/filter-context";
import { TagCategory, TagDefinition } from "@/types/tags";
import { cn } from "@/lib/utils";

export function TagFilterDropdown() {
    const { filters, setFilters } = useFilters();
    const [tags, setTags] = useState<TagDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await fetch("/api/tags");
                if (res.ok) {
                    const data = await res.json();
                    setTags(data.tags);
                }
            } catch (error) {
                console.error("Error fetching tags for filter:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTags();
    }, []);

    const toggleTag = (tagId: string) => {
        const currentIds = filters.tagIds || [];
        const newIds = currentIds.includes(tagId)
            ? currentIds.filter(id => id !== tagId)
            : [...currentIds, tagId];

        setFilters(prev => ({ ...prev, tagIds: newIds }));
    };

    const clearTags = () => {
        setFilters(prev => ({ ...prev, tagIds: [] }));
    };

    const setMode = (mode: 'any' | 'all') => {
        setFilters(prev => ({ ...prev, tagFilterMode: mode }));
    };

    const selectedCount = filters.tagIds?.length || 0;

    // Group tags by category
    const groupedTags = tags.reduce((acc, tag) => {
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 gap-2",
                        selectedCount > 0 && "border-primary bg-primary/5 text-primary"
                    )}
                >
                    <Tags className="h-4 w-4" />
                    <span>Tags</span>
                    {selectedCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 py-0 bg-primary/10 text-primary border-none text-[10px]">
                            {selectedCount}
                        </Badge>
                    )}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Filter by Tags</span>
                    {selectedCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                clearTags();
                            }}
                            className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary"
                        >
                            Clear
                        </Button>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <div className="p-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mode</span>
                    </div>
                    <div className="flex bg-muted p-0.5 rounded-md">
                        {(['any', 'all'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setMode(m);
                                }}
                                className={cn(
                                    "flex-1 text-[10px] py-1 rounded transition-all",
                                    filters.tagFilterMode === m
                                        ? "bg-background shadow-sm font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Match {m.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <DropdownMenuSeparator />

                <div className="max-h-[300px] overflow-y-auto">
                    {Object.entries(groupedTags).map(([category, catTags]) => (
                        <div key={category}>
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground py-1">
                                {categoryLabels[category as TagCategory]}
                            </DropdownMenuLabel>
                            {catTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                    key={tag.id}
                                    checked={filters.tagIds?.includes(tag.id)}
                                    onCheckedChange={() => toggleTag(tag.id)}
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                        <span className="text-sm">{tag.name}</span>
                                    </div>
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                        </div>
                    ))}

                    {tags.length === 0 && !loading && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No tags found. Manage tags in settings.
                        </div>
                    )}

                    {loading && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            Loading tags...
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
