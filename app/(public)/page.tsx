import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  description: "История семьи Огурцовых, возвращённая из архивов и памяти — родословное древо, документы, фотографии и родовые места.",
};

const ARCHIVE_TILES = [
  { title: "Документы", text: "Архивные свидетельства и записи", icon: "▤", href: "/archive" },
  { title: "Фотографии", text: "Лица и семейные воспоминания", icon: "◫", href: "/gallery" },
  { title: "Карта мест", text: "География семейной истории", icon: "⌖", href: "#places" },
  { title: "История", text: "Как возвращались забытые имена", icon: "✧", href: "/story" },
  { title: "Аудио", text: "История рода в записи", icon: "◉", href: "/audio" },
] as const;

/**
 * The one-page family story that greets every visitor before the tree
 * itself — content and structure are the owner's mother's own draft
 * (made with ChatGPT), carried over as-is; only the markup/styling were
 * rebuilt on this site's own tokens (CLAUDE.md 10) and the placeholder
 * `href="#"` links were pointed at real routes. Two things stay
 * deliberately inert, not real features: a "descendant" application
 * and a reviews/contact box — this site has no public data-collection
 * form or comments (CLAUDE.md 4), so both are non-interactive with a
 * "скоро" note rather than a dead link.
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <section className="relative flex min-h-[640px] items-center justify-center overflow-hidden py-16 sm:min-h-[720px]">
        <Image
          src="/map-ogurtsovyh.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-(--color-bg)/55" />

        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 text-center">
          <div className="w-full rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated)/90 p-8 shadow-(--shadow-md) backdrop-blur-sm sm:p-10">
            <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Семейный архив · Смоленская земля</p>
            <h1 className="font-heading text-4xl font-bold text-(--color-fg) sm:text-6xl">Род Огурцовых</h1>
            <p className="font-body mt-3 text-lg italic text-(--color-fg-muted) sm:text-xl">
              История семьи, возвращённая из архивов и памяти
            </p>
          </div>

          <div className="w-full rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated)/90 p-8 shadow-(--shadow-md) backdrop-blur-sm">
            <p className="mx-auto max-w-xl text-base leading-relaxed text-(--color-fg)">
              Перед вами — родословное древо семьи Огурцовых, корни которой уходят в деревни Смоленской земли. Здесь
              собраны история рода, архивные документы и семейные воспоминания.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/tree"
                className="text-label inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-(--color-accent) px-6 text-xs text-(--color-accent-fg) transition-opacity hover:opacity-90"
              >
                Открыть родословное древо
              </Link>
              <a
                href="#story"
                className="text-label inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg) px-6 text-xs text-(--color-fg) transition-colors hover:bg-(--color-bg-inset)"
              >
                Читать историю
              </a>
              <Link
                href="/audio"
                className="text-label inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg) px-6 text-xs text-(--color-fg) transition-colors hover:bg-(--color-bg-inset)"
              >
                Слушать аудиоверсию
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28" id="welcome">
        <Ornament className="mx-auto mb-6 h-4 w-32 text-(--color-frame-accent)" />
        <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Семейная память</p>
        <h2 className="font-heading text-3xl font-bold text-(--color-fg) sm:text-4xl">Добро пожаловать</h2>
        <p className="font-body mt-6 text-xl italic text-(--color-fg-muted)">
          Этот сайт создан для сохранения памяти о семье Огурцовых и для тех, кто захочет пройти по ветвям нашего
          родословного дерева.
        </p>
        <p className="mt-6 text-base leading-loose text-(--color-fg-muted)">
          Здесь можно познакомиться с историей семьи, посмотреть архивные документы, фотографии и родовые места,
          прочитать рассказ о том, как шаг за шагом восстанавливалась почти забытая история рода. Но главное — это не
          законченная родословная. Поиск продолжается.
        </p>
      </section>

      <section className="border-y border-(--color-border) bg-(--color-bg-inset)" id="descendants">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
          <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Продолжение истории</p>
          <h2 className="font-heading text-3xl font-bold text-(--color-fg) sm:text-4xl">Вы потомок рода Огурцовых?</h2>
          <p className="mt-6 text-lg leading-relaxed text-(--color-fg)">
            Если вы узнали в этом древе своих предков, нашли знакомое имя или знаете, к какой ветви семьи относитесь,
            возможно, именно ваша семейная история поможет продолжить ветвь, которая сегодня заканчивается
            вопросительным знаком.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <StubButton>Подать заявку</StubButton>
            <small className="text-xs text-(--color-fg-muted)">
              Дополнения публикуются только после проверки родственной связи
            </small>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-[auto_1fr] lg:gap-16" id="story">
        <div className="font-heading hidden text-center text-8xl text-(--color-border) lg:block lg:border-r lg:border-(--color-border) lg:pr-16">
          Истоки
        </div>
        <div>
          <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Страницы исследования</p>
          <h2 className="font-heading text-3xl font-bold text-(--color-fg) sm:text-4xl">История поиска и семьи</h2>
          <p className="font-body mt-6 text-xl italic text-(--color-fg-muted)">
            Всё началось с нескольких имён, старых фотографий и желания понять, откуда пришла наша семья.
          </p>
          <p className="mt-6 text-base leading-relaxed text-(--color-fg-muted)">
            Архивные записи, метрические книги и подворовые карточки постепенно соединяли поколения — и возвращали на
            древо людей, о которых в семье уже почти не помнили.
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            <Link
              href="/story"
              className="text-label border-b border-(--color-accent) pb-1 text-xs text-(--color-accent) transition-opacity hover:opacity-80"
            >
              Читать полностью →
            </Link>
            <Link
              href="/audio"
              className="text-label border-b border-(--color-accent) pb-1 text-xs text-(--color-accent) transition-opacity hover:opacity-80"
            >
              ▷ Слушать аудио
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-(--color-frame) px-4 py-24 text-center text-(--color-accent-fg) sm:py-28" id="tree">
        <p className="text-label mb-3 text-xs text-(--color-frame-accent)">Поколение за поколением</p>
        <h2 className="font-heading text-3xl font-bold sm:text-4xl">Родословное древо</h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-(--color-bg)">
          Три основные ветви рода, берущие начало от братьев Игната, Сафрона и Степана Гавриловичей.
        </p>
        <Link
          href="/tree"
          className="text-label mt-8 inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-(--color-bg-elevated) px-6 text-xs text-(--color-fg) transition-opacity hover:opacity-90"
        >
          Перейти к древу
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28" id="archive-section">
        <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Семейное собрание</p>
        <h2 className="font-heading text-3xl font-bold text-(--color-fg) sm:text-4xl">Архив рода</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHIVE_TILES.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href}
              className="group flex flex-col items-start rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-6 text-left shadow-(--shadow-sm) transition-all hover:-translate-y-1 hover:border-(--color-accent) hover:shadow-(--shadow-md)"
            >
              <span className="text-2xl text-(--color-frame-accent)">{tile.icon}</span>
              <h3 className="font-heading mt-5 text-lg font-bold text-(--color-fg)">{tile.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--color-fg-muted)">{tile.text}</p>
              <span className="text-label mt-4 text-xs text-(--color-accent)">Открыть →</span>
            </Link>
          ))}
          <div className="flex flex-col items-start rounded-[var(--radius-md)] border border-dashed border-(--color-border) bg-(--color-bg) p-6 text-left opacity-70">
            <span className="text-2xl text-(--color-fg-muted)">✉</span>
            <h3 className="font-heading mt-5 text-lg font-bold text-(--color-fg)">Отзывы и связь</h3>
            <p className="mt-2 text-sm leading-relaxed text-(--color-fg-muted)">Сообщения потомков семьи</p>
            <span className="text-label mt-4 text-xs text-(--color-fg-muted)">Скоро</span>
          </div>
        </div>
      </section>

      <section className="grid gap-10 border-y border-(--color-border) bg-(--color-bg-inset) lg:grid-cols-2" id="places">
        <div className="relative min-h-[320px]">
          <Image src="/map-ogurtsovyh.png" alt="Карта родовых мест на Смоленской земле" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-4 py-16 sm:px-10 lg:py-0">
          <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Земля предков</p>
          <h2 className="font-heading text-3xl font-bold text-(--color-fg) sm:text-4xl">Семейное гнездо</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-(--color-fg)">
            Коровино и Рубежня — главные точки ранней истории нашей ветви рода. Именно эта земля остаётся отправной
            точкой всей истории.
          </p>
          <Link
            href="/tree"
            className="text-label mt-6 inline-block w-fit border-b border-(--color-accent) pb-1 text-xs text-(--color-accent) transition-opacity hover:opacity-80"
          >
            Смотреть на родословном древе →
          </Link>
        </div>
      </section>

      <section className="bg-(--color-frame) px-4 py-24 text-center text-(--color-accent-fg) sm:py-28" id="join">
        <h2 className="font-heading mx-auto max-w-3xl text-3xl font-bold sm:text-4xl">
          Это древо не закончено.
          <br />
          Оно продолжает расти вместе с памятью семьи.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-(--color-bg)">
          Если у вас сохранились фотографии, документы или воспоминания — помогите продолжить эту историю.
        </p>
        <div className="mt-8 flex justify-center">
          <StubButton dark>Присоединиться к истории</StubButton>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 px-4 py-8 text-center text-(--color-fg-muted) sm:flex-row sm:justify-between sm:text-left">
        <p className="font-heading text-lg font-bold text-(--color-fg)">Род Огурцовых</p>
        <p className="text-label text-xs">© Семейный архив рода Огурцовых · 2026</p>
        <a href="#top" className="text-label text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent)">
          Наверх ↑
        </a>
      </footer>
    </div>
  );
}

/** A visibly inert stand-in for a feature this site doesn't have yet (public application form, reviews) — no href, so it can never look like a broken link. */
function StubButton({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <span
      className={
        "text-label inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-md)] border px-6 text-xs opacity-70 " +
        (dark
          ? "border-(--color-bg-elevated) text-(--color-bg-elevated)"
          : "border-(--color-border) text-(--color-fg-muted)")
      }
      title="Скоро"
    >
      {children}
      <span className="text-[10px]">· скоро</span>
    </span>
  );
}
