// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { libraryService } from "./library";
import { EMPTY_BOOK } from "../types";

describe("browser preview library service", () => {
  beforeEach(() => localStorage.clear());

  it("searches across title, author, ISBN, series, and tags", async () => {
    expect((await libraryService.listBooks({ search: "Le Guin" })).length).toBe(2);
    expect((await libraryService.listBooks({ search: "cyberpunk" })).map(b => b.title)).toEqual(["Neuromancer"]);
  });

  it("creates, updates, retrieves, and deletes a book", async () => {
    const created = await libraryService.createBook({ ...EMPTY_BOOK, title: "Test Book", authors: ["Test Author"], tags: ["test"] });
    expect((await libraryService.getBook(created.id)).authors).toEqual(["Test Author"]);
    const updated = await libraryService.updateBook(created.id, { ...EMPTY_BOOK, title: "Revised Book", authors: ["A", "B"], status: "Finished", rating: 5, tags: ["favorite"] });
    expect(updated.status).toBe("Finished");
    expect(updated.authors).toHaveLength(2);
    await libraryService.deleteBook(created.id);
    expect((await libraryService.listBooks()).some(book => book.id === created.id)).toBe(false);
  });

  it("filters by reading state and rating", async () => {
    const results = await libraryService.listBooks({ status: "Finished", minRating: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(book => book.status === "Finished" && book.rating === 5)).toBe(true);
  });
});
