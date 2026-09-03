import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLoungeMessageDate } from "@/lib/dates/format-lounge-message-date";

describe("formatLoungeMessageDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T15:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks a message from today as сегодня", () => {
    expect(formatLoungeMessageDate("2026-08-31T10:42:00")).toBe("сегодня, 10:42");
  });

  it("marks a message from yesterday as вчера", () => {
    expect(formatLoungeMessageDate("2026-08-30T18:15:00")).toBe("вчера, 18:15");
  });

  it("shows day and month for older messages", () => {
    expect(formatLoungeMessageDate("2026-08-25T12:08:00")).toBe("25 августа, 12:08");
  });
});
