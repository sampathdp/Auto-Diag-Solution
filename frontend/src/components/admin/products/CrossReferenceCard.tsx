"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function CrossReferenceCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "cross_reference_numbers" });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-h4 font-bold text-ink">Cross Reference Numbers</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ value: "" })}>
          <Plus className="h-3.5 w-3.5" />
          Add number
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-body text-ink-muted">
            No cross-reference numbers yet — add any OEM or competitor part numbers this product matches.
          </p>
        ) : (
          fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g. 04465-0K250"
                  error={!!formState.errors.cross_reference_numbers?.[index]?.value}
                  {...register(`cross_reference_numbers.${index}.value`)}
                />
                {formState.errors.cross_reference_numbers?.[index]?.value && (
                  <p className="mt-1 text-caption text-danger">
                    {formState.errors.cross_reference_numbers[index]?.value?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                aria-label="Remove cross reference number"
                className="text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
