/**
 * Many archival titles and captions repeat the same opening words (the
 * title is often just the caption's first sentence, expanded) — shown
 * back to back in a compact card this reads as the same line twice.
 * Strips a caption's leading words when they exactly match the title's,
 * word-for-word and case-insensitively, so the card doesn't repeat
 * itself. Purely a display trim: never touches the stored title/caption,
 * and only removes a literal, mechanical word-for-word prefix match —
 * it never rewrites, shortens, or reinterprets the historical text.
 *
 * Only trims down to a point where the remainder starts with a
 * capitalized word — a real clause/sentence start in Russian. Stopping
 * at any shared word (e.g. a preposition like "о"/"в") could otherwise
 * leave a lowercase fragment like "браке Казанской церкви…" that reads
 * as if the caption itself got cut off mid-word (real report: looked
 * exactly like a truncation bug). If no such point exists, the caption
 * is shown in full, duplication and all — better than looking broken.
 */
export function dedupeLeadingRepeat(title: string, caption: string): string {
  const titleWords = title.trim().split(/\s+/);
  const captionWords = caption.trim().split(/\s+/);

  let maxShared = 0;
  const max = Math.min(titleWords.length, captionWords.length);
  while (maxShared < max && normalizeWord(titleWords[maxShared]) === normalizeWord(captionWords[maxShared])) {
    maxShared++;
  }

  // Require a substantial overlap (not just one incidental shared word)
  // before trimming anything, so a caption that merely happens to start
  // with the same common word as the title is left alone.
  const MIN_SHARED_WORDS = 3;
  for (let shared = maxShared; shared >= MIN_SHARED_WORDS; shared--) {
    const remainder = captionWords.slice(shared).join(" ").trim();
    if (remainder && startsWithCapital(remainder)) return remainder;
  }

  return caption;
}

function startsWithCapital(text: string): boolean {
  const firstChar = text[0];
  return firstChar !== undefined && firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,;:!?"'«»]+$/g, "");
}
