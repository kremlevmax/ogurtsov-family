import { z } from "zod";

export const datePrecisionSchema = z.enum([
  "unknown",
  "exact",
  "year",
  "month",
  "approximate",
  "range",
]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ожидается дата в формате ГГГГ-ММ-ДД");

/**
 * Validates a DateValue, enforcing that the recorded precision is
 * consistent with which bounds are present (e.g. "exact" requires a
 * single start date, "unknown" requires no bounds at all).
 */
export const dateValueSchema = z
  .object({
    precision: datePrecisionSchema,
    start: isoDateSchema.nullable(),
    end: isoDateSchema.nullable(),
    text: z.string().max(500).nullable(),
  })
  .superRefine((value, ctx) => {
    switch (value.precision) {
      case "unknown":
        if (value.start !== null || value.end !== null) {
          ctx.addIssue({
            code: "custom",
            message: "Для неизвестной даты границы должны быть пустыми",
          });
        }
        break;
      case "exact":
      case "year":
      case "month":
      case "approximate":
        if (!value.start || value.end !== value.start) {
          ctx.addIssue({
            code: "custom",
            message: "Для этой точности начало и конец даты должны совпадать",
          });
        }
        break;
      case "range":
        if (!value.start && !value.end) {
          ctx.addIssue({
            code: "custom",
            message: "Для диапазона нужна хотя бы одна граница",
          });
        }
        break;
    }
  });

export type DateValueInput = z.infer<typeof dateValueSchema>;
