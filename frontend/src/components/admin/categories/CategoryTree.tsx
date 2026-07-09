"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/admin/ui/Badge";
import { cn } from "@/lib/utils";
import type { Category } from "@/mocks/admin/db";

function TreeRow({
  category,
  depth,
  hasChildren,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  category: Category;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, paddingLeft: depth * 28 }}
      className={cn(
        "flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2.5",
        isDragging && "z-10 opacity-70 shadow-md"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab p-1 text-ink-muted hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {hasChildren ? (
        <button type="button" onClick={onToggleExpand} className="p-0.5 text-ink-muted hover:text-ink">
          <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="w-5" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">{category.name_en}</p>
        <p className="truncate text-caption text-ink-muted" dir="rtl">
          {category.name_ar}
        </p>
      </div>

      <span className="hidden text-caption text-ink-muted sm:inline">{category.products_count} products</span>
      <Badge variant={category.is_active ? "success" : "neutral"}>{category.is_active ? "Active" : "Inactive"}</Badge>

      <button type="button" onClick={onEdit} aria-label={`Edit ${category.name_en}`} className="rounded-sm p-1.5 text-ink-muted hover:bg-app hover:text-ink">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${category.name_en}`} className="rounded-sm p-1.5 text-danger hover:bg-app">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface LevelProps {
  parentId: number | null;
  depth: number;
  categories: Category[];
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onReorder: (parentId: number | null, orderedIds: number[]) => void;
}

function TreeLevel({ parentId, depth, categories, expandedIds, onToggleExpand, onEdit, onDelete, onReorder }: LevelProps) {
  const items = categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((c) => c.id);
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    onReorder(parentId, arrayMove(ids, oldIndex, newIndex));
  };

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {items.map((category) => {
            const hasChildren = categories.some((c) => c.parent_id === category.id);
            const expanded = expandedIds.has(category.id);
            return (
              <div key={category.id}>
                <TreeRow
                  category={category}
                  depth={depth}
                  hasChildren={hasChildren}
                  expanded={expanded}
                  onToggleExpand={() => onToggleExpand(category.id)}
                  onEdit={() => onEdit(category)}
                  onDelete={() => onDelete(category)}
                />
                {hasChildren && expanded && (
                  <div className="mt-1.5">
                    <TreeLevel
                      parentId={category.id}
                      depth={depth + 1}
                      categories={categories}
                      expandedIds={expandedIds}
                      onToggleExpand={onToggleExpand}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReorder={onReorder}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function CategoryTree({
  categories,
  onEdit,
  onDelete,
  onReorder,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onReorder: (parentId: number | null, orderedIds: number[]) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(categories.filter((c) => !c.parent_id).map((c) => c.id))
  );

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <TreeLevel
      parentId={null}
      depth={0}
      categories={categories}
      expandedIds={expandedIds}
      onToggleExpand={toggleExpand}
      onEdit={onEdit}
      onDelete={onDelete}
      onReorder={onReorder}
    />
  );
}
