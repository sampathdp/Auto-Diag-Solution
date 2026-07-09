"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { RichTextEditor } from "./RichTextEditor";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function BilingualContentCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4 font-bold text-ink">Bilingual Content</h2>
      </CardHeader>
      <CardBody>
        <Tabs defaultValue="en">
          <TabsList className="mb-4">
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="ar">العربية</TabsTrigger>
          </TabsList>

          <TabsContent value="en" className="space-y-4">
            <FormField label="Name" htmlFor="name_en" error={errors.name_en?.message} required>
              <Input id="name_en" error={!!errors.name_en} {...register("name_en")} />
            </FormField>
            <FormField label="Short Description" htmlFor="short_description_en">
              <Textarea id="short_description_en" rows={2} {...register("short_description_en")} />
            </FormField>
            <FormField label="Full Description">
              <Controller
                name="description_en"
                control={control}
                render={({ field }) => (
                  <RichTextEditor value={field.value ?? ""} onChange={field.onChange} dir="ltr" />
                )}
              />
            </FormField>
          </TabsContent>

          <TabsContent value="ar" className="space-y-4">
            <FormField label="الاسم" htmlFor="name_ar" error={errors.name_ar?.message} required>
              <Input id="name_ar" dir="rtl" error={!!errors.name_ar} {...register("name_ar")} />
            </FormField>
            <FormField label="وصف قصير" htmlFor="short_description_ar">
              <Textarea id="short_description_ar" dir="rtl" rows={2} {...register("short_description_ar")} />
            </FormField>
            <FormField label="الوصف الكامل">
              <Controller
                name="description_ar"
                control={control}
                render={({ field }) => (
                  <RichTextEditor value={field.value ?? ""} onChange={field.onChange} dir="rtl" />
                )}
              />
            </FormField>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
}
