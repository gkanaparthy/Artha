export enum TagCategory {
    SETUP = 'SETUP',
    MISTAKE = 'MISTAKE',
    EMOTION = 'EMOTION',
    CUSTOM = 'CUSTOM',
}

export interface TagDefinition {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    category: TagCategory;
    color: string;
    icon: string | null;
    isDefault: boolean;
    isArchived: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PositionTag {
    id: string;
    positionKey: string;
    tagDefinitionId: string;
    userId: string;
    notes: string | null;
    createdAt: Date;
    tagDefinition?: TagDefinition;
}

export interface TagAnalytics {
    tagId: string;
    tagName: string;
    category: TagCategory;
    color: string;
    tradeCount: number;
    winRate: number;
    totalPnL: number;
    avgPnL: number;
}

export interface TagCostAnalysis {
    tagId: string;
    tagName: string;
    totalCost: number;
    tradeCount: number;
}
