"use client";

import { ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { moveItemById } from "@/lib/layout-preferences";

interface DraggableTileGridProps {
  items: Record<string, ReactNode>;
  order: string[];
  onReorder: (nextOrder: string[]) => void;
  className?: string;
  disabled?: boolean;
}

export function DraggableTileGrid({
  items,
  order,
  onReorder,
  className,
  disabled = false,
}: DraggableTileGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const orderedIds = useMemo(() => {
    const itemIds = Object.keys(items);
    const existing = order.filter((id) => itemIds.includes(id));
    const missing = itemIds.filter((id) => !existing.includes(id));
    return [...existing, ...missing];
  }, [items, order]);

  const resetDragState = () => {
    setDraggedId(null);
    setHoverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      resetDragState();
      return;
    }

    const nextOrder = moveItemById(orderedIds, draggedId, targetId);
    onReorder(nextOrder);
    resetDragState();
  };

  return (
    <div className={className}>
      {orderedIds.map((id) => {
        const content = items[id];
        if (!content) return null;

        const isDragged = draggedId === id;
        const isHoverTarget = hoverId === id && draggedId !== id;

        return (
          <div
            key={id}
            draggable={!disabled}
            onDragStart={() => setDraggedId(id)}
            onDragOver={(event) => {
              event.preventDefault();
              if (!disabled) setHoverId(id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!disabled) handleDrop(id);
            }}
            onDragEnd={resetDragState}
            className={cn(
              !disabled && "cursor-grab active:cursor-grabbing",
              isDragged && "opacity-70",
              isHoverTarget && "ring-2 ring-primary/40 rounded-xl"
            )}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
