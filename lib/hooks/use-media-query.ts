"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query in JS. Used where we need the actual match
 * result in a branch (e.g. choosing between two inline-style objects)
 * rather than in Tailwind classes — `window.matchMedia` is one of the
 * most consistently implemented web APIs, which sidesteps any
 * browser-specific quirk in how a CSS framework compiles responsive
 * utilities (e.g. logical vs. physical inset properties).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
