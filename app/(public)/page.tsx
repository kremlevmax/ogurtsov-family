import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { BranchLine, Ornament } from "@/components/ui/ornament";

export const metadata: Metadata = {
  description: "История семьи Огурцовых, возвращённая из архивов и памяти — родословное древо, документы, фотографии и родовые места.",
};

const ARCHIVE_TILES = [
  { title: "Документы", text: "Архивные свидетельства и записи", icon: "▤", href: "/archive" },
  { title: "Фотографии", text: "Лица и семейные воспоминания", icon: "◫", href: "/gallery" },
  { title: "Карта мест", text: "География семейной истории", icon: "⌖", href: "#places" },
  { title: "История", text: "Как возвращались забытые имена — текст и аудио", icon: "✧", href: "/story" },
  { title: "Отзывы и связь", text: "Сообщения потомков семьи", icon: "✉", href: "/lounge" },
] as const;

/**
 * The one-page family story that greets every visitor before the tree
 * itself — content and structure are the owner's mother's own draft
 * (made with ChatGPT), carried over as-is; only the markup/styling were
 * rebuilt on this site's own tokens (CLAUDE.md 10) and the placeholder
 * `href="#"` links were pointed at real routes. The "descendant"
 * application stays deliberately inert, not a real feature — this site
 * has no public data-collection form (CLAUDE.md 4), so it's
 * non-interactive with a "скоро" note rather than a dead link. The
 * "Отзывы и связь" card now links to /lounge (components/lounge),
 * an exact port of a separate Figma handoff for that page; see that
 * component's own doc comment for what is and isn't wired up there.
 *
 * Typography (font-size/line-height/letter-spacing/color) throughout
 * this file follows the owner's Figma-plugin extraction
 * (rod-ogurtsovykh-homepage-typography.md, docs/DECISIONS.md) layer by
 * layer, with two deliberate deviations: `--color-fg-muted` is
 * darkened from the source's literal #858579 for WCAG contrast (see
 * globals.css), and "Подробнее о проекте →" / "Смотреть семейные места →"
 * stay without an underline per the owner's explicit, more recent
 * instruction, even though the extracted spec marks them underlined.
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      {/* mt-[15px] dropped now that Header sits directly above (used to be
          the hero's own offset from the bare top of the page) — height
          adjusted from the sticky header's own fixed 81px (h-20 + 1px
          border) so the hero still fills exactly one screen, as before. */}
      <section className="relative mx-[15px] h-[calc(100vh-81px)] overflow-hidden bg-(--color-bg)">
        {/* Map has its own 20px margin on top/sides (owner's explicit measurement) — separate from the hero content's own, larger margins below. */}
        <div className="absolute inset-x-[20px] top-[20px] bottom-0 overflow-hidden">
          <Image
            src="/map-ogurtsovyh.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>

        {/* Hero content: an asymmetric composition (owner's layout extraction) — wide title plate near the top, open map in the middle, a narrower card bottom-right, a small scroll hint near the bottom edge. Not a centered/symmetric hero. */}
        <div className="relative flex h-full flex-col px-6 pt-[19px] pb-[18px] sm:px-16">
          {/* Title plate — three independent columns (kicker / name / subtitle), each left-aligned, all vertically centered within the plate. Triple-line "passe-partout" frame with exact measured offsets/opacities. */}
          <div className="relative mt-[6px] w-full shrink-0 rounded-none border border-(--color-border) bg-(--color-bg-elevated)/97 shadow-[0_5px_18px_0_rgba(56,64,54,0.08)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-[10px] rounded-none border border-[rgba(216,208,187,0.80)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-[16px] rounded-none border border-[rgba(216,208,187,0.45)]" />
            <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-11 sm:py-4">
              <p className="font-label shrink-0 text-[16px] leading-[17px] font-bold tracking-[1.92px] text-(--color-fg) uppercase">
                Семейный архив •
                <br />
                Смоленская земля
              </p>
              <h1 className="font-heading shrink-0 text-[36px] leading-[38px] tracking-[0.36px] text-(--color-heading) uppercase sm:text-[53px] sm:leading-[56px] sm:tracking-[0.53px]">
                Род
                <br />
                Огурцовых
              </h1>
              <p className="font-heading text-[18px] leading-[26px] text-(--color-fg) sm:text-[23px] sm:leading-[31px]">
                История семьи, возвращённая из архивов и
                <br />
                памяти
              </p>
            </div>
          </div>

          {/* Open map space, then the bottom-right card and the independent scroll hint. */}
          <div className="relative flex-1">
            <div className="mt-6 flex flex-col sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-[45%] sm:min-w-[420px]">
              <div className="relative w-full rounded-none border border-(--color-border) bg-(--color-bg-elevated)/97 text-center shadow-[0_5px_18px_0_rgba(56,64,54,0.08)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-[10px] rounded-none border border-[rgba(216,208,187,0.80)]" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-[16px] rounded-none border border-[rgba(216,208,187,0.45)]" />
                <div className="relative px-6 py-8 sm:px-11 sm:pt-9 sm:pb-9">
                  <p className="font-heading text-[16px] leading-[24px] text-(--color-fg) sm:text-[17px] sm:leading-[28px]">
                    Перед вами — родословное древо семьи Огурцовых, корни которой уходят в деревни Смоленской земли.
                    Здесь собраны история рода, архивные документы и семейные воспоминания.
                  </p>
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <Link
                      href="/tree"
                      className="font-label flex h-[50px] w-full items-center justify-center text-[15px] font-bold tracking-[0.065px] text-(--color-accent-fg) uppercase bg-(--color-accent) transition-opacity hover:opacity-90"
                    >
                      Открыть родословное древо
                    </Link>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-[12px]">
                      <Link
                        href="/archive"
                        className="font-label flex h-[50px] flex-1 items-center justify-center border border-(--color-border) bg-(--color-bg) px-4 text-[15px] font-bold tracking-[0.065px] text-(--color-heading) uppercase transition-colors hover:bg-(--color-bg-inset)"
                      >
                        Архив
                      </Link>
                      <Link
                        href="/story"
                        className="font-label flex h-[50px] flex-1 items-center justify-center border border-(--color-border) bg-(--color-bg) px-4 text-[15px] font-bold tracking-[0.065px] text-(--color-heading) uppercase transition-colors hover:bg-(--color-bg-inset)"
                      >
                        О проекте
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href="#welcome"
              className="font-label mt-4 block text-center text-[16px] font-bold tracking-[1.32px] text-(--color-fg-muted) uppercase transition-opacity hover:opacity-80 sm:absolute sm:bottom-0 sm:left-[46%] sm:mt-0 sm:-translate-x-1/2"
            >
              Листать дальше ↓
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28" id="welcome">
        <Ornament className="mx-auto mb-6 h-4 w-32 text-(--color-gold)" />
        <p className="font-label mb-3 font-bold text-[16px] tracking-[2.16px] text-(--color-fg-muted) uppercase">Семейная память</p>
        <h2 className="font-heading text-[40px] leading-[44px] text-(--color-heading) sm:text-[56px] sm:leading-[60px]">Добро пожаловать</h2>
        <p className="font-heading mt-6 text-[19px] leading-[30px] text-(--color-fg) sm:text-[22px] sm:leading-[34px]">
          Этот сайт создан для сохранения памяти о семье Огурцовых и для тех, кто захочет пройти по ветвям нашего
          родословного дерева.
        </p>
        <p className="font-heading mt-6 text-[17px] leading-[28px] text-(--color-fg-muted) sm:text-[19px] sm:leading-[31px]">
          Здесь можно познакомиться с историей семьи, посмотреть архивные документы, фотографии и родовые места,
          прочитать рассказ о том, как шаг за шагом восстанавливалась почти забытая история рода. Но главное — это не
          законченная родословная. Поиск продолжается.
        </p>
      </section>

      <section className="border-y border-(--color-border) bg-(--color-bg-inset)" id="descendants">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
          <p className="font-label mb-3 font-bold text-[16px] tracking-[2.16px] text-(--color-fg-muted) uppercase">Продолжение истории</p>
          <h2 className="font-heading text-[40px] leading-[44px] text-(--color-heading) sm:text-[55px] sm:leading-[58px]">Вы потомок рода Огурцовых?</h2>
          <p className="font-heading mt-6 text-[16px] leading-[26px] text-(--color-fg) sm:text-[19px] sm:leading-[31px]">
            Если вы узнали в этом древе своих предков, нашли знакомое имя или знаете, к какой ветви семьи относитесь,
            возможно, именно ваша семейная история поможет продолжить ветвь, которая сегодня заканчивается
            вопросительным знаком.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <StubButton>Подать заявку</StubButton>
            <small className="font-label text-[16px] text-(--color-fg-muted)">
              Дополнения публикуются только после проверки родственной связи
            </small>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-[auto_1fr] lg:gap-16" id="story">
        <div className="font-heading hidden text-center text-[100px] leading-none text-(--color-gold-light) lg:block lg:border-r lg:border-(--color-border) lg:pr-16 lg:text-[118px]">
          Истоки
        </div>
        <div>
          <p className="font-label mb-3 font-bold text-[16px] tracking-[2.16px] text-(--color-fg-muted) uppercase">Страницы исследования</p>
          <h2 className="font-heading text-[42px] leading-[46px] text-(--color-heading) sm:text-[58px] sm:leading-[62px]">История поиска и семьи</h2>
          <p className="font-heading mt-6 text-[19px] leading-[32px] text-(--color-fg) sm:text-[23px] sm:leading-[38px]">
            Всё началось с нескольких имён, старых фотографий и желания понять, откуда пришла наша семья.
          </p>
          <p className="font-heading mt-6 text-[19px] leading-[32px] text-(--color-fg)">
            Архивные записи, метрические книги и подворовые карточки постепенно соединяли поколения — и возвращали на
            древо людей, о которых в семье уже почти не помнили.
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            <Link href="/story" className="font-label text-[18px] font-bold leading-[22px] text-(--color-heading) transition-opacity hover:opacity-80">
              Подробнее о проекте →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-(--color-accent) px-4 py-24 text-center sm:py-28" id="tree">
        <BranchLine className="mx-auto mb-6 h-8 w-32 text-(--color-gold-light)" />
        <p className="font-label mb-3 font-bold text-[16px] tracking-[2.16px] text-(--color-bg) uppercase opacity-38">Поколение за поколением</p>
        <h2 className="font-heading text-[42px] leading-[46px] text-(--color-bg) sm:text-[58px] sm:leading-[62px]">Родословное древо</h2>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[26px] text-[rgba(251,248,239,0.49)] sm:text-[19px] sm:leading-[31px]">
          Три основные ветви рода, берущие начало от братьев Игната, Сафрона и Степана Гавриловичей.
        </p>
        <Link
          href="/tree"
          className="font-label mt-8 inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-(--color-bg-elevated) px-6 text-[16px] font-bold tracking-[0.065px] text-(--color-heading) uppercase transition-opacity hover:opacity-90"
        >
          Перейти к древу
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28" id="archive-section">
        <p className="font-label mb-3 font-bold text-[16px] tracking-[2.16px] text-(--color-fg-muted) uppercase">Семейное собрание</p>
        <h2 className="font-heading text-[42px] leading-[46px] text-(--color-heading) sm:text-[58px] sm:leading-[62px]">Архив рода</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHIVE_TILES.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href}
              className="group flex flex-col items-start rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-6 text-left transition-colors hover:border-(--color-gold)"
            >
              <span className="text-2xl text-(--color-gold)">{tile.icon}</span>
              <h3 className="font-heading mt-5 text-[24px] leading-[30px] text-(--color-fg)">{tile.title}</h3>
              <p className="font-heading mt-2 text-[16px] leading-[21px] text-(--color-fg-muted)">{tile.text}</p>
              <span className="font-label mt-4 text-[16px] leading-[18px] font-bold text-(--color-heading)">Открыть →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-10 border-y border-(--color-border) bg-(--color-bg-inset) lg:grid-cols-2" id="places">
        <div className="relative min-h-[320px]">
          <Image src="/map-ogurtsovyh.png" alt="Карта родовых мест на Смоленской земле" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-4 py-16 sm:px-10 lg:py-0">
          <p className="font-label mb-3 text-[16px] tracking-[2.16px] text-(--color-fg-muted) uppercase">Земля предков</p>
          <h2 className="font-heading text-[42px] leading-[46px] text-(--color-heading) sm:text-[58px] sm:leading-[66px]">Семейное гнездо</h2>
          <p className="font-heading mt-6 max-w-md text-[16px] leading-[27px] text-(--color-fg) sm:text-[19px] sm:leading-[32px]">
            Коровино и Рубежня — главные точки ранней истории нашей ветви рода. Именно эта земля остаётся отправной
            точкой всей истории.
          </p>
          <Link href="/tree" className="font-label mt-6 inline-block w-fit text-[18px] font-bold text-(--color-heading) transition-opacity hover:opacity-80">
            Смотреть на родословном древе →
          </Link>
        </div>
      </section>

      <section className="bg-(--color-accent) px-4 py-24 text-center sm:py-28" id="join">
        <h2 className="font-heading mx-auto max-w-3xl text-[42px] leading-[46px] text-(--color-bg) sm:text-[58px] sm:leading-[62px]">
          Это древо не закончено.
          <br />
          Оно продолжает расти вместе с памятью семьи.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[24px] text-[rgba(251,248,239,0.4624)] sm:text-[18px] sm:leading-[29px]">
          Если у вас сохранились фотографии, документы или воспоминания — помогите продолжить эту историю.
        </p>
        <div className="mt-8 flex justify-center">
          <StubButton dark>Присоединиться к истории</StubButton>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-2 bg-(--color-accent-deep) px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-heading text-[18px] leading-[26px] text-(--color-bg) sm:text-[20px] sm:leading-[28px]">Род Огурцовых</p>
        <p className="font-label text-[16px] text-[rgba(251,248,239,0.48)]">© Семейный архив рода Огурцовых · {new Date().getFullYear()}</p>
        <a href="#top" className="font-label text-[16px] font-medium text-[rgba(251,248,239,0.58)] transition-opacity hover:opacity-80">
          Наверх ↑
        </a>
      </footer>
    </div>
  );
}

/** A visibly inert stand-in for a feature this site doesn't have yet (public application form, reviews) — no href, so it can never look like a broken link. Deliberately kept visually muted/outlined (not the accent-filled look the extracted spec implies for a "real" button) so it never reads as an active control. */
function StubButton({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <span
      className={
        "font-label inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-md)] border px-6 text-[16px] font-bold tracking-[0.065px] uppercase opacity-70 " +
        (dark
          ? "border-(--color-bg-elevated) text-(--color-bg-elevated)"
          : "border-(--color-border) text-(--color-fg-muted)")
      }
      title="Скоро"
    >
      {children}
      <span className="text-[16px] normal-case">· скоро</span>
    </span>
  );
}
