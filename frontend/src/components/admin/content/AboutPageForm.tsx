"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { SingleImageUpload } from "@/components/admin/ui/SingleImageUpload";
import { FormField } from "@/components/admin/ui/FormField";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { formatDateTime } from "@/lib/admin/utils";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { AboutPageFormSchema, ICON_OPTIONS, type AboutPageFormValues } from "@/lib/admin/schemas/aboutPageSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import type { AboutPage } from "@/types/aboutPage";

function toFormValues(page: AboutPage): AboutPageFormValues {
  return {
    hero: page.hero,
    story: page.story,
    values: page.values,
    timeline: page.timeline,
  };
}

const VALUE_LABELS = ["Value 1", "Value 2", "Value 3", "Value 4"];
const MILESTONE_LABELS = ["Milestone 1", "Milestone 2", "Milestone 3", "Milestone 4"];

// Keyed by page.updated_at in the parent, so a successful save (which bumps
// updated_at and refetches) remounts this component with the freshly-saved
// values as defaultValues instead of leaving stale dirty state around.
export function AboutPageForm({ page }: { page: AboutPage }) {
  const queryClient = useQueryClient();
  const initialValues = toFormValues(page);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<AboutPageFormValues>({
    resolver: zodResolver(AboutPageFormSchema),
    defaultValues: initialValues,
  });

  const { confirmDiscard } = useUnsavedChangesGuard(isDirty);

  const save = useMutation({
    mutationFn: (payload: AboutPageFormValues) => adminApi.put<AboutPage>("/about-page", payload),
    onSuccess: () => {
      showSuccess("About Us page updated");
      queryClient.invalidateQueries({ queryKey: ["about-page"] });
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the About Us page."),
  });

  const onSubmit = handleSubmit((values) => save.mutate(values), onFormInvalid);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-6">
        {/* Image and icons are language-neutral, shown once regardless of the active tab below */}
        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">Our Story — Image</h2>
          </CardHeader>
          <CardBody>
            <FormField label="Story Image" required>
              <Controller
                name="story.image_url"
                control={control}
                render={({ field }) => <SingleImageUpload value={field.value} onChange={(url) => field.onChange(url ?? "")} />}
              />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">Value Card Icons</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_LABELS.map((label, i) => (
              <FormField key={label} label={label} htmlFor={`icon-${i}`}>
                <Controller
                  name={`values.items.${i}.icon`}
                  control={control}
                  render={({ field }) => (
                    <Select id={`icon-${i}`} value={field.value} onChange={field.onChange}>
                      {ICON_OPTIONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </FormField>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Tabs defaultValue="en">
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">Hero</h3>
                  <FormField label="Eyebrow"><Input {...register("hero.eyebrow_en")} /></FormField>
                  <FormField label="Title" required><Input {...register("hero.title_en")} /></FormField>
                  <FormField label="Subtitle"><Textarea rows={2} {...register("hero.subtitle_en")} /></FormField>
                  <FormField label="Breadcrumb Label"><Input {...register("hero.crumb_en")} /></FormField>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">Our Story</h3>
                  <FormField label="Eyebrow"><Input {...register("story.eyebrow_en")} /></FormField>
                  <FormField label="Title"><Input {...register("story.title_en")} /></FormField>
                  <FormField label="Paragraph 1"><Textarea rows={4} {...register("story.body1_en")} /></FormField>
                  <FormField label="Paragraph 2"><Textarea rows={4} {...register("story.body2_en")} /></FormField>
                  <FormField label="Image Caption"><Input {...register("story.image_tag_en")} /></FormField>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">Values Section</h3>
                  <FormField label="Eyebrow"><Input {...register("values.eyebrow_en")} /></FormField>
                  <FormField label="Title"><Input {...register("values.title_en")} /></FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {VALUE_LABELS.map((label, i) => (
                      <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                        <p className="text-caption font-bold text-ink-muted">{label}</p>
                        <FormField label="Title"><Input {...register(`values.items.${i}.title_en`)} /></FormField>
                        <FormField label="Body"><Textarea rows={3} {...register(`values.items.${i}.body_en`)} /></FormField>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">Milestones Section</h3>
                  <FormField label="Eyebrow"><Input {...register("timeline.eyebrow_en")} /></FormField>
                  <FormField label="Title"><Input {...register("timeline.title_en")} /></FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {MILESTONE_LABELS.map((label, i) => (
                      <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                        <p className="text-caption font-bold text-ink-muted">{label}</p>
                        <FormField label="Year"><Input {...register(`timeline.items.${i}.year_en`)} /></FormField>
                        <FormField label="Title"><Input {...register(`timeline.items.${i}.title_en`)} /></FormField>
                        <FormField label="Body"><Textarea rows={3} {...register(`timeline.items.${i}.body_en`)} /></FormField>
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="ar">
                <div className="space-y-6" dir="rtl">
                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">الترويسة</h3>
                  <FormField label="النص العلوي"><Input dir="rtl" {...register("hero.eyebrow_ar")} /></FormField>
                  <FormField label="العنوان" required><Input dir="rtl" {...register("hero.title_ar")} /></FormField>
                  <FormField label="النص الفرعي"><Textarea dir="rtl" rows={2} {...register("hero.subtitle_ar")} /></FormField>
                  <FormField label="مسار التنقل"><Input dir="rtl" {...register("hero.crumb_ar")} /></FormField>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">قصتنا</h3>
                  <FormField label="النص العلوي"><Input dir="rtl" {...register("story.eyebrow_ar")} /></FormField>
                  <FormField label="العنوان"><Input dir="rtl" {...register("story.title_ar")} /></FormField>
                  <FormField label="الفقرة الأولى"><Textarea dir="rtl" rows={4} {...register("story.body1_ar")} /></FormField>
                  <FormField label="الفقرة الثانية"><Textarea dir="rtl" rows={4} {...register("story.body2_ar")} /></FormField>
                  <FormField label="تعليق الصورة"><Input dir="rtl" {...register("story.image_tag_ar")} /></FormField>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">قسم القيم</h3>
                  <FormField label="النص العلوي"><Input dir="rtl" {...register("values.eyebrow_ar")} /></FormField>
                  <FormField label="العنوان"><Input dir="rtl" {...register("values.title_ar")} /></FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {VALUE_LABELS.map((label, i) => (
                      <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                        <p className="text-caption font-bold text-ink-muted">{label}</p>
                        <FormField label="العنوان"><Input dir="rtl" {...register(`values.items.${i}.title_ar`)} /></FormField>
                        <FormField label="الوصف"><Textarea dir="rtl" rows={3} {...register(`values.items.${i}.body_ar`)} /></FormField>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">قسم المحطات</h3>
                  <FormField label="النص العلوي"><Input dir="rtl" {...register("timeline.eyebrow_ar")} /></FormField>
                  <FormField label="العنوان"><Input dir="rtl" {...register("timeline.title_ar")} /></FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {MILESTONE_LABELS.map((label, i) => (
                      <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                        <p className="text-caption font-bold text-ink-muted">{label}</p>
                        <FormField label="السنة"><Input dir="rtl" {...register(`timeline.items.${i}.year_ar`)} /></FormField>
                        <FormField label="العنوان"><Input dir="rtl" {...register(`timeline.items.${i}.title_ar`)} /></FormField>
                        <FormField label="الوصف"><Textarea dir="rtl" rows={3} {...register(`timeline.items.${i}.body_ar`)} /></FormField>
                      </div>
                    ))}
                  </div>
                </section>
                </div>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-caption text-ink-muted">
            <p>Last updated {formatDateTime(page.updated_at)}</p>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-4 shadow-md md:-mx-8 md:px-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (confirmDiscard()) reset(initialValues);
          }}
        >
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} loading={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
