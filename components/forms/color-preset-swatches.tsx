/**
 * Eight muted, archive-appropriate presets an editor can pick without
 * fiddling with the native color picker — same "warm archive" family as
 * the site's own tokens (app/globals.css), just spread across enough
 * distinct hues that several branches/highlights on one tree stay easy
 * to tell apart.
 */
export const COLOR_PRESETS = [
  "#1a7a6e", // тёмно-бирюзовый
  "#b58a2e", // золото
  "#7a4fa3", // индиго-фиолет
  "#3f6b4a", // лесной зелёный
  "#2e5f7a", // стальной синий
  "#7a3a52", // марсала
  "#8a7a2e", // оливково-горчичный
  "#4a5568", // грифельно-серый
] as const;

export function ColorPresetSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Готовые варианты цвета">
      {COLOR_PRESETS.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={hex}
          aria-pressed={value === hex}
          onClick={() => onChange(hex)}
          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: hex,
            borderColor: value === hex ? "var(--color-fg)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}
