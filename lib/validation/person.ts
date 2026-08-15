import { z } from "zod";
import { dateValueSchema } from "./date-value";

/** Trims and turns an empty string into null — most optional text fields work this way. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

/**
 * Server-side validation for the person editing form (create + update).
 * The exact same schema runs client-side (RHF resolver) and server-side
 * (Server Action) — CLAUDE.md 13: client validation is never trusted alone.
 */
export const personFormSchema = z.object({
  firstName: z.string().trim().min(1, "Укажите имя").max(200),
  middleName: optionalText(200),
  lastName: optionalText(200),
  maidenName: optionalText(200),
  isPlaceholder: z.boolean(),
  isDeceased: z.boolean(),
  birth: dateValueSchema,
  death: dateValueSchema,
  birthPlace: optionalText(300),
  deathPlace: optionalText(300),
  profession: optionalText(300),
  education: optionalText(300),
  shortBio: optionalText(5000),
});

export type PersonFormInput = z.infer<typeof personFormSchema>;

export const relationshipTypeSchema = z.enum([
  "biological_parent",
  "adoptive_parent",
  "foster_parent",
  "guardian",
  "spouse",
  "former_spouse",
  "partner",
]);

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

export const parentRoleSchema = z.enum(["mother", "father", "parent"]).nullable();

export type ParentRole = z.infer<typeof parentRoleSchema>;

const PARENT_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "biological_parent",
  "adoptive_parent",
  "foster_parent",
  "guardian",
]);

/** Server-side validation for creating a `relationships` row. */
export const relationshipInputSchema = z
  .object({
    fromPersonId: z.uuid(),
    toPersonId: z.uuid(),
    relationshipType: relationshipTypeSchema,
    parentRole: parentRoleSchema,
    note: optionalText(1000),
  })
  .refine((value) => value.fromPersonId !== value.toPersonId, {
    message: "Человек не может быть в связи сам с собой",
    path: ["toPersonId"],
  })
  .refine(
    (value) => PARENT_RELATIONSHIP_TYPES.has(value.relationshipType) === (value.parentRole !== null),
    {
      message: "Для родительской связи укажите роль (мать/отец/родитель), для остальных — оставьте пустой",
      path: ["parentRole"],
    },
  );

export type RelationshipInput = z.infer<typeof relationshipInputSchema>;
