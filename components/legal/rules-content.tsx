import { Ornament } from "@/components/ui/ornament";

const SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "Общие положения",
    paragraphs: [
      "Наш сайт создан для сохранения истории семьи Огурцовых, объединения родственников и передачи памяти о наших предках будущим поколениям.",
      "Мы рады каждому участнику, который помогает развивать проект.",
    ],
  },
  {
    heading: "Общение на сайте",
    paragraphs: [
      "Просим всех участников соблюдать уважительное отношение друг к другу. На сайте запрещается: размещать оскорбительные сообщения; использовать ненормативную лексику; унижать достоинство других участников; публиковать материалы, нарушающие законодательство.",
    ],
  },
  {
    heading: "Размещение информации",
    paragraphs: [
      "При добавлении сведений в родословное дерево рекомендуется указывать только ту информацию, достоверность которой вам известна.",
      "Если какие-либо сведения являются предположением, желательно указать это в комментарии.",
    ],
  },
  {
    heading: "Фотографии и документы",
    paragraphs: [
      "Размещайте только те фотографии, документы и другие материалы, которыми вы имеете право делиться.",
      "По возможности указывайте источник происхождения материалов.",
    ],
  },
  {
    heading: "Работа с родословным деревом",
    paragraphs: [
      "После подтверждения родства пользователь получает возможность работать со своей ветвью родословного дерева.",
      "Редактировать и удалять можно только карточки, созданные лично пользователем. Карточки других участников доступны только для просмотра.",
    ],
  },
  {
    heading: "Ответственность пользователя",
    paragraphs: ["Каждый пользователь несёт ответственность за информацию и материалы, размещённые им на сайте."],
  },
  {
    heading: "Права администрации сайта",
    paragraphs: [
      "Администрация сайта имеет право: удалить материалы, нарушающие настоящие Правила; ограничить доступ пользователю, систематически нарушающему Правила сайта; вносить изменения в настоящие Правила по мере развития проекта.",
    ],
  },
];

export interface RulesContentProps {
  /** The standalone page wants a big centered heading + ornament; the modal (already titled by its own header) just wants the body. */
  showHeading?: boolean;
}

/** Shared between app/(public)/rules/page.tsx and the modal (components/auth/auth-modal-host.tsx) — RegistrationProject v1.0 checklist requires both to exist and show the exact same approved text. */
export function RulesContent({ showHeading = true }: RulesContentProps) {
  return (
    <>
      {showHeading && (
        <>
          <Ornament className="mx-auto mb-6 h-4 w-32 text-(--color-gold)" />
          <h1 className="font-heading text-center text-[36px] leading-[42px] text-(--color-heading) sm:text-[44px] sm:leading-[48px]">
            Правила сайта
          </h1>
        </>
      )}
      <p className="mt-6 text-lg text-(--color-fg)">
        Настоящие Правила определяют порядок участия пользователей в проекте «Родословное дерево семьи Огурцовых».
        Соблюдение Правил помогает сохранить доброжелательную атмосферу общения и обеспечить достоверность
        размещаемой информации.
      </p>
      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-2xl font-bold text-(--color-heading)">{section.heading}</h2>
            <div className="mt-2 flex flex-col gap-3 text-lg text-(--color-fg)">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-center text-lg text-(--color-fg-muted)">
        Спасибо за ваш вклад в сохранение истории семьи Огурцовых. Каждая фотография, каждый документ и каждое
        воспоминание помогают сохранить память о наших предках для будущих поколений.
      </p>
    </>
  );
}
