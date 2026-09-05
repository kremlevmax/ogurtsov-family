import { describe, expect, it } from "vitest";
import { splitPhotosByLinkage } from "@/lib/media/split-photos";
import type { MediaPickerItem } from "@/features/media/types";

function photo(overrides: Partial<MediaPickerItem>): MediaPickerItem {
  return {
    id: "m1",
    kind: "photo",
    title: "Фото",
    caption: null,
    dateText: null,
    category: null,
    thumbnailObjectKey: null,
    extension: "jpg",
    originalFilename: "photo.jpg",
    sizeBytes: 1024,
    objectKey: "media/m1.jpg",
    linkedPersonIds: [],
    linkedPersonNames: [],
    unlisted: false,
    ...overrides,
  };
}

describe("splitPhotosByLinkage", () => {
  it("puts a photo linked to a person into people", () => {
    const result = splitPhotosByLinkage([photo({ id: "p1", linkedPersonIds: ["person-1"] })]);
    expect(result.people.map((item) => item.id)).toEqual(["p1"]);
    expect(result.places).toEqual([]);
  });

  it("puts a photo with no linked person into places", () => {
    const result = splitPhotosByLinkage([photo({ id: "l1", linkedPersonIds: [] })]);
    expect(result.places.map((item) => item.id)).toEqual(["l1"]);
    expect(result.people).toEqual([]);
  });

  it("splits a mixed list and preserves relative order within each group", () => {
    const result = splitPhotosByLinkage([
      photo({ id: "p1", linkedPersonIds: ["a"] }),
      photo({ id: "l1", linkedPersonIds: [] }),
      photo({ id: "p2", linkedPersonIds: ["b", "c"] }),
      photo({ id: "l2", linkedPersonIds: [] }),
    ]);
    expect(result.people.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(result.places.map((item) => item.id)).toEqual(["l1", "l2"]);
  });

  it("returns empty arrays for an empty input", () => {
    expect(splitPhotosByLinkage([])).toEqual({ people: [], places: [] });
  });
});
