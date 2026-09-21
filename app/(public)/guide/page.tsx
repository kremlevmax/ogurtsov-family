import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Первые шаги в родословном дереве",
  description: "Простая инструкция для подтверждённых участников проекта «Родословное дерево семьи Огурцовых».",
};

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: "Найдите свою ветвь",
    body: "На родословном дереве найдите самого близкого к вам родственника, который уже внесён в дерево. Нажмите на его имя — откроется карточка этого человека. Под именем находятся кнопки «Добавить связь…». Выберите ту, что подходит именно для вашего случая.",
  },
  {
    title: "Заполните карточку нового человека",
    body: "На странице «Добавить человека» заполните известные вам сведения: имя, отчество, фамилию, девичью фамилию, даты и места. Если какой-то информации пока нет, не переживайте — карточку всегда можно дополнить позже. После заполнения нажмите «Сохранить».",
  },
  {
    title: "Добавьте фотографии и документы",
    body: "После сохранения новый человек появится в родословном дереве. Теперь вы можете загрузить фотографии и документы или прикрепить уже загруженные материалы. Добавлять фото и файлы можно также через раздел «Архив» — не забудьте затем открыть карточку нужного человека и связать её с загруженными материалами.",
  },
  {
    title: "Проверьте родственные связи",
    body: "Если нужно, свяжите нового человека с другими родственниками, уже присутствующими в дереве. Особое внимание уделите полю «Кто кому родитель» — именно от правильного выбора зависит правильное построение родословного дерева. После создания или изменения родственной связи изменения сохраняются автоматически.",
  },
];

/**
 * "Первые шаги в родословном дереве" — the approved memo
 * (Документация_сайта.zip, "Первые шаги в родословном дереве.pdf") that
 * the "Подтверждение родства" email links to. Built as a live page
 * (not a PDF attachment, per that document's own instruction) with
 * text adapted to the site's actual current UI/labels rather than
 * redrawing the PDF's mockup screenshots. Publicly reachable (linked
 * from /tree for anyone with tree access, docs/DECISIONS.md) — the
 * content itself has nothing sensitive in it, so it stays indexable
 * like the rest of the public site (CLAUDE.md 3.1 only requires
 * noindex for login/editor routes).
 */
export default function GuidePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Ornament className="h-3 w-24 text-(--color-border)" />
          <h1 className="font-heading text-3xl font-bold text-(--color-heading)">Первые шаги в родословном дереве</h1>
          <p className="text-label text-xs text-(--color-fg-muted)">Простая инструкция для участников проекта</p>
        </div>

        <section className="mb-10 flex flex-col gap-3">
          <p className="text-(--color-fg)">
            Мы рады приветствовать вас на сайте «Родословное дерево семьи Огурцовых». Спасибо, что решили принять
            участие в сохранении истории нашей семьи. Каждый новый человек, каждая фотография, каждый документ и
            каждое воспоминание помогают сделать наше родословное дерево более полным и сохранить память о наших
            предках для будущих поколений.
          </p>
        </section>

        <section className="mb-10 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-5">
          <h2 className="mb-2 font-heading text-lg font-bold text-(--color-fg)">Перед началом работы</h2>
          <p className="mb-2 text-(--color-fg)">После подтверждения родства вы можете:</p>
          <ul className="mb-4 flex flex-col gap-1 text-(--color-fg)">
            <li>— добавлять новых родственников в свою ветвь;</li>
            <li>— редактировать карточки, созданные лично вами;</li>
            <li>— добавлять фотографии, документы и воспоминания;</li>
            <li>— устанавливать родственные связи.</li>
          </ul>
          <p className="rounded-[var(--radius-md)] bg-(--color-bg) px-3 py-2 text-sm text-(--color-fg)">
            <b>Важно!</b> Редактировать и удалять можно только те карточки, которые созданы лично вами. Карточки,
            созданные другими участниками проекта, доступны только для просмотра.
          </p>
        </section>

        <section className="mb-10 flex flex-col gap-6">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent) font-heading text-sm font-bold text-(--color-accent-fg)">
                {index + 1}
              </div>
              <div>
                <h3 className="mb-1 font-heading text-base font-bold text-(--color-fg)">{step.title}</h3>
                <p className="text-(--color-fg)">{step.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-10 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-5">
          <h2 className="mb-2 font-heading text-lg font-bold text-(--color-fg)">Если дерево построилось неправильно</h2>
          <p className="text-(--color-fg)">
            Не торопитесь создавать новые карточки или удалять уже существующие. Ещё раз внимательно проверьте
            установленные вами родственные связи — во многих случаях ошибка связана именно с неправильно выбранной
            связью. Если самостоятельно исправить ошибку не удалось, обратитесь к администратору сайта — мы
            обязательно поможем разобраться и восстановить правильную структуру дерева.
          </p>
        </section>

        <p className="text-center text-(--color-fg)">
          Спасибо, что присоединились к нашей общей работе по сохранению истории семьи Огурцовых. Пусть каждая
          добавленная вами карточка, фотография, документ или воспоминание помогут сохранить память о наших предках
          для наших детей, внуков и будущих поколений.
        </p>
        <p className="mt-4 text-center font-heading text-lg font-bold text-(--color-heading)">
          Добро пожаловать в нашу большую семью!
        </p>

        <div className="mt-10 text-center">
          <Link href="/tree" className="text-(--color-accent) underline underline-offset-2">
            Перейти к родословному дереву
          </Link>
        </div>
      </main>
    </div>
  );
}
