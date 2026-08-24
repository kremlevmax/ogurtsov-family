"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personFormSchema, type PersonFormInput } from "@/lib/validation/person";
import type { DateValue } from "@/lib/dates/date-value";
import { createPersonAction, updatePersonAction } from "@/server/actions/people";
import { createRelationshipAction } from "@/server/actions/relationships";
import { buildQuickRelationInput, quickRelationHint, type QuickRelation } from "@/features/people/quick-relation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "./form-field";
import { DateValueField } from "./date-value-field";
import { ColorPresetSwatches, COLOR_PRESETS } from "./color-preset-swatches";

const EMPTY_DATE: DateValue = { precision: "unknown", start: null, end: null, text: null };
const DEFAULT_MARK_COLOR = COLOR_PRESETS[0];

/** Quick-fill chips for the "Имя" field when the person's identity isn't known — CLAUDE.md 3.5's placeholder concept, made easier to use than typing "Неизвестная мать" by hand. */
const PLACEHOLDER_NAME_SUGGESTIONS: Record<QuickRelation["relationKind"], string[]> = {
  mother: ["Мать"],
  father: ["Отец"],
  parent: ["Мать", "Отец", "Родитель"],
  spouse: ["Жена", "Муж"],
  child: ["Сын", "Дочь"],
};
const DEFAULT_PLACEHOLDER_NAME_SUGGESTIONS = ["Сын", "Дочь", "Жена", "Муж", "Мать", "Отец"];

export interface PersonFormProps {
  mode: "create" | "edit";
  personId?: string;
  defaultValues?: Partial<PersonFormInput>;
  quickRelation?: QuickRelation | null;
}

export function PersonForm({ mode, personId, defaultValues, quickRelation }: PersonFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormInput>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      maidenName: "",
      isPlaceholder: false,
      isDeceased: false,
      birth: EMPTY_DATE,
      death: EMPTY_DATE,
      birthPlace: "",
      deathPlace: "",
      profession: "",
      education: "",
      shortBio: "",
      branchColor: null,
      highlightColor: null,
      ...defaultValues,
    },
  });

  const isDeceased = useWatch({ control, name: "isDeceased" });
  const isPlaceholder = useWatch({ control, name: "isPlaceholder" });
  const branchColor = useWatch({ control, name: "branchColor" });
  const highlightColor = useWatch({ control, name: "highlightColor" });
  const markMode: "none" | "highlight" | "branch" = branchColor ? "branch" : highlightColor ? "highlight" : "none";

  function setMarkMode(mode: "none" | "highlight" | "branch") {
    const carriedColor = branchColor ?? highlightColor ?? DEFAULT_MARK_COLOR;
    setValue("branchColor", mode === "branch" ? carriedColor : null);
    setValue("highlightColor", mode === "highlight" ? carriedColor : null);
  }
  const nameSuggestions = quickRelation
    ? PLACEHOLDER_NAME_SUGGESTIONS[quickRelation.relationKind]
    : DEFAULT_PLACEHOLDER_NAME_SUGGESTIONS;

  async function onSubmit(data: PersonFormInput) {
    setFormError(null);

    const result =
      mode === "create" ? await createPersonAction(data) : await updatePersonAction(personId as string, data);

    if (!result.ok || !result.personId) {
      setFormError(result.error ?? "Не удалось сохранить. Попробуйте ещё раз.");
      return;
    }

    if (mode === "create" && quickRelation) {
      const relationResult = await createRelationshipAction(
        buildQuickRelationInput(quickRelation, result.personId),
      );
      if (!relationResult.ok) {
        router.push(`/people/${result.personId}`);
        return;
      }
    }

    router.push(`/people/${result.personId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {quickRelation && (
        <p className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) px-4 py-2.5 text-sm text-(--color-fg-muted)">
          {quickRelationHint(quickRelation)}
        </p>
      )}

      <FormSection title="Имя">
        <Field label="Имя" error={errors.firstName?.message}>
          <Input {...register("firstName")} autoComplete="off" />
        </Field>
        <Field label="Отчество">
          <Input {...register("middleName")} autoComplete="off" />
        </Field>
        <Field label="Фамилия">
          <Input {...register("lastName")} autoComplete="off" />
        </Field>
        <Field label="Девичья фамилия">
          <Input {...register("maidenName")} autoComplete="off" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-(--color-fg)">
          <input type="checkbox" {...register("isPlaceholder")} className="h-4 w-4" />
          Данные человека неизвестны
        </label>

        {isPlaceholder && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-(--color-fg-muted)">Подставить в поле «Имя»:</span>
            {nameSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setValue("firstName", suggestion)}
                className="text-label rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-2 py-1 text-[10px] text-(--color-fg-muted) hover:border-(--color-accent) hover:text-(--color-accent)"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Даты">
        <Controller
          control={control}
          name="birth"
          render={({ field }) => (
            <DateValueField label="Дата рождения" value={field.value} onChange={field.onChange} />
          )}
        />

        <label className="flex items-center gap-2 text-sm text-(--color-fg)">
          <input
            type="checkbox"
            checked={!isDeceased}
            onChange={(event) => {
              const alive = event.target.checked;
              setValue("isDeceased", !alive);
              if (alive) {
                setValue("death", EMPTY_DATE);
                setValue("deathPlace", "");
              }
            }}
            className="h-4 w-4"
          />
          Человек жив
        </label>

        {isDeceased && (
          <Controller
            control={control}
            name="death"
            render={({ field }) => (
              <DateValueField label="Дата смерти" value={field.value} onChange={field.onChange} />
            )}
          />
        )}
      </FormSection>

      <FormSection title="Места">
        <Field label="Место рождения">
          <Input {...register("birthPlace")} autoComplete="off" />
        </Field>
        {isDeceased && (
          <Field label="Место погребения">
            <Input {...register("deathPlace")} autoComplete="off" />
          </Field>
        )}
      </FormSection>

      <FormSection title="Выделение в дереве">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-(--color-fg)">
            <input
              type="radio"
              name="markMode"
              className="h-4 w-4"
              checked={markMode === "none"}
              onChange={() => setMarkMode("none")}
            />
            Обычная карточка, без цвета
          </label>
          <label className="flex items-center gap-2 text-sm text-(--color-fg)">
            <input
              type="radio"
              name="markMode"
              className="h-4 w-4"
              checked={markMode === "highlight"}
              onChange={() => setMarkMode("highlight")}
            />
            Просто выделить эту карточку
          </label>
          <p className="ml-6 text-xs text-(--color-fg-muted)">
            Цвет получит только эта карточка. На детей, родителей и супругов это никак не повлияет.
          </p>
          <label className="flex items-center gap-2 text-sm text-(--color-fg)">
            <input
              type="radio"
              name="markMode"
              className="h-4 w-4"
              checked={markMode === "branch"}
              onChange={() => setMarkMode("branch")}
            />
            Родоначальник отдельной ветки
          </label>
          <p className="ml-6 text-xs text-(--color-fg-muted)">
            Цвет унаследуют все кровные потомки этого человека в дереве. Супруги и партнёры цвет не наследуют.
          </p>
        </div>

        {markMode !== "none" && (
          <Field label="Цвет">
            <div className="flex flex-col gap-2">
              <ColorPresetSwatches
                value={(markMode === "branch" ? branchColor : highlightColor) ?? DEFAULT_MARK_COLOR}
                onChange={(hex) => setValue(markMode === "branch" ? "branchColor" : "highlightColor", hex)}
              />
              <input
                type="color"
                {...register(markMode === "branch" ? "branchColor" : "highlightColor")}
                className="h-10 w-20 cursor-pointer rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated)"
              />
            </div>
          </Field>
        )}
      </FormSection>

      <FormSection title="Дополнительно">
        <Field label="Профессия">
          <Input {...register("profession")} autoComplete="off" />
        </Field>
        <Field label="Образование">
          <Input {...register("education")} autoComplete="off" />
        </Field>
        <Field label="Краткая биография">
          <textarea
            {...register("shortBio")}
            rows={5}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-fg) focus-visible:outline-none"
          />
        </Field>
      </FormSection>

      {formError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {formError}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
