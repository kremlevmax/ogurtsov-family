import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PassportPoster } from "@/components/passport/passport-poster";
import { PASSPORT_TREE_DATA } from "@/features/passport-tree/data";

export const metadata: Metadata = {
  title: "Паспорт родословного дерева Огурцовых",
  description:
    "Главный ствол рода Огурцовых и документы, подтверждающие переход между поколениями, от Емельяна Максимова до трёх современных ветвей.",
};

/**
 * PassportTree (owner's mother's package, approved mockup
 * "05_Дизайн/Утверждённый_макет"). Several items the package itself
 * flags as open (docs/DECISIONS.md): final "Примечания" text and its
 * frame style (Q1/Q2), real document card links (Q3), font/fidelity
 * sign-off (Q5).
 *
 * The "Примечания" block at the bottom of the diagram is still the
 * artwork's own baked-in placeholder text — unlike the tree above it,
 * nothing here was drawn over it with live data, because the real,
 * approved wording (Q2) and its frame style (Q1) don't exist yet to
 * draw. A second, separate note section was deliberately NOT added
 * here: the diagram's viewBox already includes that part of the
 * artwork, so a second copy would just duplicate it.
 */
export default function PassportTreePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1199px] flex-1 px-4 pb-10">
        <PassportPoster data={PASSPORT_TREE_DATA} instanceId="passport-tree" />

        <details className="mt-6 text-sm text-(--color-fg-muted)">
          <summary className="cursor-pointer font-medium text-(--color-fg)">Текстовое представление родословной</summary>
          <div className="mt-3 flex flex-col gap-2">
            <p>
              Главный ствол:{" "}
              {PASSPORT_TREE_DATA.trunk
                .map((id) => {
                  const person = PASSPORT_TREE_DATA.people.find((candidate) => candidate.id === id);
                  return person ? `${person.name} (${person.life.label})` : id;
                })
                .join(" → ")}
              .
            </p>
            <p>От Гаврилы Егорова отходят три ветви:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {PASSPORT_TREE_DATA.terminalBranches.map((branch) => {
                const person = PASSPORT_TREE_DATA.people.find((candidate) => candidate.id === branch.personId);
                return (
                  <li key={branch.id}>
                    {person?.name} ({person?.life.label}){person?.note ? ` — ${person.note}` : ""} → {branch.label}.
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      </main>
    </div>
  );
}
