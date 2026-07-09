"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderTree } from "lucide-react";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Button } from "@/components/admin/ui/Button";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { CategoryTree } from "@/components/admin/categories/CategoryTree";
import { CategoryDrawerForm } from "@/components/admin/categories/CategoryDrawerForm";
import { showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import type { PaginatedResponse } from "@/types/api";
import type { Category } from "@/mocks/admin/db";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  // Real backend paginates (default 15/page); the hierarchy tree below needs the
  // full set in one call, so request a page large enough to cover any realistic
  // category count — same "fetch everything in one call" convention already used
  // by the Reports page for orders/products.
  const categoriesQuery = useAdminQuery<PaginatedResponse<Category>>(
    adminQueryKeys.categories.all,
    "/categories",
    { per_page: 100 }
  );
  const categories = categoriesQuery.data?.items ?? [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories.all });

  const reorder = useMutation({
    mutationFn: (updates: { id: number; sort_order: number }[]) =>
      Promise.all(updates.map((u) => adminApi.put(`/categories/${u.id}`, { sort_order: u.sort_order }))),
    onSuccess: invalidate,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/categories/${id}`),
    onSuccess: () => {
      showSuccess("Category deleted");
      setDeleteTarget(null);
      invalidate();
    },
  });

  const childCount = deleteTarget ? categories.filter((c) => c.parent_id === deleteTarget.id).length : 0;
  const deleteWarning =
    deleteTarget && (deleteTarget.products_count > 0 || childCount > 0)
      ? "Warning: " +
        [
          deleteTarget.products_count > 0 ? `${deleteTarget.products_count} product(s)` : null,
          childCount > 0 ? `${childCount} subcategory(ies)` : null,
        ]
          .filter(Boolean)
          .join(" and ") +
        " will be left uncategorized."
      : undefined;

  return (
    <div>
      <PageHeader
        title="Categories"
        description={`${categories.length} categories`}
        actions={
          <Button
            onClick={() => {
              setEditingCategory(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        }
      />

      {categoriesQuery.isLoading ? (
        <p className="text-body text-ink-muted">Loading…</p>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          message="Create your first category to start organizing products."
          action={
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          }
        />
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={(category) => {
            setEditingCategory(category);
            setDrawerOpen(true);
          }}
          onDelete={setDeleteTarget}
          onReorder={(parentId, orderedIds) =>
            reorder.mutate(orderedIds.map((id, index) => ({ id, sort_order: index })))
          }
        />
      )}

      <CategoryDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        category={editingCategory}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteCategory.mutate(deleteTarget.id)}
        itemName={deleteTarget?.name_en ?? ""}
        itemLabel="category"
        extraWarning={deleteWarning}
        loading={deleteCategory.isPending}
      />
    </div>
  );
}
