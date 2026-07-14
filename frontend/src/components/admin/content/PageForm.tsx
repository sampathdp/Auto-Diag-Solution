"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { FormField } from "@/components/admin/ui/FormField";
import { Switch } from "@/components/admin/ui/Switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { TranslateLabel } from "@/components/admin/ui/TranslateLabel";
import { PageRichTextEditor } from "./PageRichTextEditor";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { formatDateTime } from "@/lib/admin/utils";
import { slugify } from "@/lib/admin/utils";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { useTranslate } from "@/lib/admin/hooks/useTranslate";
import { PageFormSchema, PAGE_FORM_DEFAULTS, type PageFormValues } from "@/lib/admin/schemas/pageSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { Page } from "@/types/page";

function pageToFormValues(page: Page): PageFormValues {
  return {
    title_en: page.title_en,
    title_ar: page.title_ar,
    slug: page.slug,
    content_en: page.content_en,
    content_ar: page.content_ar,
    is_published: page.is_published,
  };
}

export function PageForm({ mode, page }: { mode: "create" | "edit"; page?: Page }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PageFormValues>({
    resolver: zodResolver(PageFormSchema),
    defaultValues: page ? pageToFormValues(page) : PAGE_FORM_DEFAULTS,
  });

  const { confirmDiscard } = useUnsavedChangesGuard(isDirty);
  const title = useTranslate();

  const translateTitle = async () => {
    const translated = await title.translate(watch("title_en"));
    if (translated) setValue("title_ar", translated, { shouldValidate: true });
  };

  const save = useMutation({
    mutationFn: (payload: PageFormValues) =>
      mode === "edit" && page
        ? adminApi.put<Page>(`/pages/${page.id}`, payload)
        : adminApi.post<Page>("/pages", payload),
    onSuccess: () => {
      showSuccess(mode === "edit" ? "Page updated" : "Page created");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.pages.all });
      router.push("/admin/content/pages");
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the page."),
  });

  const onSubmit = handleSubmit((values) => save.mutate(values), onFormInvalid);

  const cancel = () => {
    if (confirmDiscard()) router.push("/admin/content/pages");
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <FormField label="URL Slug" htmlFor="slug" error={errors.slug?.message} required>
                <Input id="slug" {...register("slug")} />
              </FormField>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Content</h2>
            </CardHeader>
            <CardBody>
              <Tabs defaultValue="en">
                <TabsList className="mb-4">
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                </TabsList>

                <TabsContent value="en" className="space-y-4">
                  <FormField label="Title" htmlFor="title_en" error={errors.title_en?.message} required>
                    <Input
                      id="title_en"
                      {...register("title_en")}
                      onBlur={(e) => {
                        if (!watch("slug")) setValue("slug", slugify(e.target.value));
                        if (!watch("title_ar")) translateTitle();
                      }}
                    />
                  </FormField>
                  <FormField label="Body">
                    <Controller
                      name="content_en"
                      control={control}
                      render={({ field }) => (
                        <PageRichTextEditor value={field.value ?? ""} onChange={field.onChange} dir="ltr" />
                      )}
                    />
                  </FormField>
                </TabsContent>

                <TabsContent value="ar" className="space-y-4">
                  <FormField
                    label={
                      <TranslateLabel
                        label="العنوان"
                        required
                        translating={title.translating}
                        disabled={!watch("title_en")?.trim()}
                        onTranslate={translateTitle}
                      />
                    }
                    htmlFor="title_ar"
                    error={errors.title_ar?.message}
                  >
                    <Input id="title_ar" dir="rtl" {...register("title_ar")} />
                  </FormField>
                  <FormField label="المحتوى">
                    <Controller
                      name="content_ar"
                      control={control}
                      render={({ field }) => (
                        <PageRichTextEditor value={field.value ?? ""} onChange={field.onChange} dir="rtl" />
                      )}
                    />
                  </FormField>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-h4 font-bold text-ink">Status</h2>
            </CardHeader>
            <CardBody>
              <Controller
                name="is_published"
                control={control}
                render={({ field }) => (
                  <Switch
                    label={field.value ? "Published" : "Draft"}
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </CardBody>
          </Card>

          {page && (
            <Card>
              <CardBody className="space-y-1.5 text-caption text-ink-muted">
                <p>Created {formatDateTime(page.created_at)}</p>
                <p>Last updated {formatDateTime(page.updated_at)}</p>
              </CardBody>
            </Card>
          )}

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => window.open(`/${watch("slug") || ""}`, "_blank")}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-4 shadow-md md:-mx-8 md:px-8">
        <Button type="button" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} loading={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
