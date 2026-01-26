"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    MoreVertical,
    Pencil,
    Trash2,
    Archive,
    RotateCcw,
    GripVertical,
    ChevronDown,
    Info
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, Reorder } from "framer-motion";
import { TagCategory, TagDefinition } from "@/types/tags";
import { cn } from "@/lib/utils";
import { clearTagCache } from "./tag-assignment";

interface TagManagerProps {
    initialCategory?: TagCategory;
}

export function TagManager({ initialCategory = TagCategory.SETUP }: TagManagerProps) {
    const [tags, setTags] = useState<TagDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<TagCategory>(initialCategory);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        category: TagCategory.SETUP,
        color: "#6B7280",
        description: "",
        icon: ""
    });

    const categories = [
        { id: TagCategory.SETUP, label: "Setups", color: "bg-green-500/10 text-green-500" },
        { id: TagCategory.MISTAKE, label: "Mistakes", color: "bg-red-500/10 text-red-500" },
        { id: TagCategory.EMOTION, label: "Emotions", color: "bg-amber-500/10 text-amber-500" },
        { id: TagCategory.CUSTOM, label: "Custom", color: "bg-blue-500/10 text-blue-500" },
    ];

    const fetchTags = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/tags");
            if (!res.ok) throw new Error("Failed to fetch tags");
            const data = await res.json();
            setTags(data.tags);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tags");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleCreateOrUpdate = async () => {
        if (!formData.name) {
            toast.error("Name is required");
            return;
        }

        try {
            const url = editingTag ? `/api/tags/${editingTag.id}` : "/api/tags";
            const method = editingTag ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save tag");
            }

            toast.success(editingTag ? "Tag updated" : "Tag created");
            setIsDialogOpen(false);
            setEditingTag(null);
            clearTagCache(); // Bug #12: Invalidate cache
            fetchTags();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleArchive = async (id: string) => {
        const tag = tags.find(t => t.id === id);
        const usageCount = tag?._count?.usages || 0;

        if (usageCount > 0) {
            if (!confirm(`This tag is currently used on ${usageCount} positions. Archiving it will hide it from the journal but keep historical data. Continue?`)) {
                return;
            }
        }

        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to archive tag");
            toast.success("Tag archived");
            clearTagCache(); // Bug #12: Invalidate cache
            fetchTags();
        } catch (error) {
            toast.error("Failed to archive tag");
        }
    };

    const handleEdit = (tag: TagDefinition) => {
        setEditingTag(tag);
        setFormData({
            name: tag.name,
            category: tag.category,
            color: tag.color,
            description: tag.description || "",
            icon: tag.icon || ""
        });
        setIsDialogOpen(true);
    };

    const handleOpenCreate = () => {
        setEditingTag(null);
        setFormData({
            name: "",
            category: activeCategory,
            color: "#6B7280",
            description: "",
            icon: ""
        });
        setIsDialogOpen(true);
    };

    // Bug #17: Clear search when switching categories
    useEffect(() => {
        setSearchTerm("");
    }, [activeCategory]);

    const handleReorder = async (newOrder: TagDefinition[]) => {
        // Optimistic update
        const otherCategoryTags = tags.filter(t => t.category !== activeCategory);
        const updatedTags = [...otherCategoryTags, ...newOrder];
        setTags(updatedTags);

        try {
            const tagOrders = newOrder.map((tag, index) => ({
                id: tag.id,
                sortOrder: index
            }));

            const res = await fetch("/api/tags/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tagOrders }),
            });

            if (!res.ok) throw new Error("Failed to save order");
        } catch (error) {
            toast.error("Failed to save new order");
            fetchTags(); // Revert
        }
    };

    const filteredTags = tags
        .filter(t => t.category === activeCategory)
        .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    if (loading && tags.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex-1 sm:flex-none",
                                activeCategory === cat.id
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {cat.label}
                            <span className="ml-1.5 text-xs opacity-60">
                                ({tags.filter(t => t.category === cat.id).length})
                            </span>
                        </button>
                    ))}
                </div>
                <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    New Tag
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search ${activeCategory.toLowerCase()} tags...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {categories.find(c => c.id === activeCategory)?.label}
                        <Badge variant="outline" className={cn("ml-2 font-normal", categories.find(c => c.id === activeCategory)?.color)}>
                            {filteredTags.length} Active
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        {activeCategory === TagCategory.SETUP && "Strategies and trade setups you execute."}
                        {activeCategory === TagCategory.MISTAKE && "Common errors or rule violations to avoid."}
                        {activeCategory === TagCategory.EMOTION && "Your emotional state during the trade."}
                        {activeCategory === TagCategory.CUSTOM && "Your personalized tracking categories."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredTags.length === 0 ? (
                        <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4 text-muted-foreground">
                                <Info className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-medium mb-1">No tags found</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                {searchTerm ? "No tags match your search." : `You haven't added any ${activeCategory.toLowerCase()} tags yet.`}
                            </p>
                            {!searchTerm && (
                                <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add your first tag
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={filteredTags}
                            onReorder={handleReorder}
                            className="space-y-2"
                        >
                            {filteredTags.map((tag) => (
                                <Reorder.Item
                                    key={tag.id}
                                    value={tag}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {tag.icon && <span>{tag.icon}</span>}
                                                {tag.name}
                                                {tag.isDefault && (
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-tight opacity-70">
                                                        Default
                                                    </Badge>
                                                )}
                                                {/* Bug #22: Usage count badge */}
                                                {tag._count && tag._count.usages > 0 && (
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal opacity-50">
                                                        {tag._count.usages} uses
                                                    </Badge>
                                                )}
                                            </div>
                                            {tag.description && (
                                                <div className="text-sm text-muted-foreground line-clamp-1">
                                                    {tag.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(tag)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(tag)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleArchive(tag.id)}
                                                >
                                                    <Archive className="h-4 w-4 mr-2" />
                                                    Archive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
                        <DialogDescription>
                            Tags help you categorize and analyze your trading performance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="e.g. Breakout, FOMO, Early Exit"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val as TagCategory })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TagCategory.SETUP}>Setup</SelectItem>
                                    <SelectItem value={TagCategory.MISTAKE}>Mistake</SelectItem>
                                    <SelectItem value={TagCategory.EMOTION}>Emotion</SelectItem>
                                    <SelectItem value={TagCategory.CUSTOM}>Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "#10B981", "#3B82F6", "#F59E0B", "#EF4444",
                                    "#8B5CF6", "#EC4899", "#6B7280", "#1E293B",
                                    "#0EA5E9", "#F97316", "#DC2626", "#475569"
                                ].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        className={cn(
                                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                            formData.color === c ? "border-primary scale-110" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-12 h-8 p-0 border-none bg-transparent"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Input
                                placeholder="What does this tag mean?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateOrUpdate}>{editingTag ? "Update Tag" : "Create Tag"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
