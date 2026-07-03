import * as z from "zod";

export const AppointmentSchema = z.object({
  customer_id: z.coerce.number().min(1, "Please select a customer"),
  staff_id: z.coerce.number().min(1, "Please select a staff member"),
  service_id: z.coerce.number().min(1, "Please select a service"),
  appointment_date: z.string().min(1, "Please select a date"),
  start_time: z.string().min(1, "Please select a start time"),
  end_time: z.string().min(1, "Please select an end time"),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).default("confirmed"),
  notes: z.string().optional(),
});

export type AppointmentFormValues = z.infer<typeof AppointmentSchema>;
