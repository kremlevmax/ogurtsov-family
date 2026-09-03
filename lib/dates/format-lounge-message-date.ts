import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";

/** "сегодня, 10:42" / "вчера, 18:15" / "30 августа, 12:08" — matches the lounge's own display style. */
export function formatLoungeMessageDate(iso: string): string {
  const date = new Date(iso);
  const time = format(date, "HH:mm");

  if (isToday(date)) return `сегодня, ${time}`;
  if (isYesterday(date)) return `вчера, ${time}`;

  return `${format(date, "d MMMM", { locale: ru })}, ${time}`;
}
