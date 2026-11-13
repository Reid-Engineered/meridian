// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { PieWheel, computeNextSpinRotation, indexAtRotation, sliceColor } from "../components/PieWheel";
import { WheelPage } from "./WheelPage";
import { demoBooks, demoCollections } from "../services/demo";

beforeAll(() => {
  if (!("inert" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "inert", {
      get() { return this.hasAttribute("inert"); },
      set(value: boolean) { this.toggleAttribute("inert", value); },
      configurable: true,
    });
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PieWheel math and rendering", () => {
  it("lands the pointer inside the exact target slice across slice counts and jitter", () => {
    for (const total of [2, 3, 4, 7, 12, 13]) {
      for (let winner = 0; winner < total; winner++) {
        for (const startRot of [0, 45, 725, 2025]) {
          for (const jitter of [0, 0.5, 1]) {
            const next = computeNextSpinRotation(startRot, winner, total, 6, jitter);
            expect(next).toBeGreaterThanOrEqual(startRot + 6 * 360);
            expect(indexAtRotation(next, total)).toBe(winner);
          }
        }
      }
    }
  });

  it("never gives adjacent slices the same color, including wrap-around", () => {
    for (const total of [2, 3, 12, 13, 24, 25]) {
      for (let i = 0; i < total; i++) {
        const next = (i + 1) % total;
        expect(sliceColor(i, total).bg).not.toBe(sliceColor(next, total).bg);
      }
    }
  });

  it("renders a full circle for 1 book and disables spin when empty", () => {
    const { rerender } = render(
      <PieWheel
        items={[{ id: 1, label: "Only Book" }]}
        rotation={0}
        spinning={false}
        spinDurationMs={0}
        winnerIndex={0}
        onSpin={vi.fn()}
      />
    );
    expect(screen.getByRole("img", { name: "Book wheel with 1 book" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Spin the wheel" }) as HTMLButtonElement).disabled).toBe(false);

    rerender(
      <PieWheel
        items={[]}
        rotation={0}
        spinning={false}
        spinDurationMs={0}
        winnerIndex={null}
        onSpin={vi.fn()}
      />
    );
    expect(screen.getByRole("img", { name: "Empty book wheel" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Spin the wheel" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("WheelPage", () => {
  it("defaults to To Read books when available, and filters by status and collection", () => {
    render(
      <WheelPage
        books={demoBooks}
        collections={demoCollections}
        onOpenBook={vi.fn()}
      />
    );
    // Demo books have 2 "Want to Read" + 1 "Unread" = 3 books
    expect(screen.getByText("3 of 3 included")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Book wheel with 3 books" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "All Books" }));
    expect(screen.getByText("10 of 10 included")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filter wheel by collection"), { target: { value: "1" } });
    expect(screen.getByText("6 of 6 included")).toBeTruthy();
  });

  it("defaults to All Books when there are no Unread or Want to Read books", () => {
    const finishedOnly = demoBooks.filter(b => b.status === "Finished");
    render(
      <WheelPage
        books={finishedOnly}
        collections={demoCollections}
        onOpenBook={vi.fn()}
      />
    );
    expect(screen.getByText(`${finishedOnly.length} of ${finishedOnly.length} included`)).toBeTruthy();
  });

  it("allows toggling books in the pool and disables spinning when empty", () => {
    render(
      <WheelPage
        books={demoBooks}
        collections={demoCollections}
        onOpenBook={vi.fn()}
        spinDurationMs={0}
      />
    );
    const pool = screen.getByRole("region", { name: "Books on wheel" });
    fireEvent.click(within(pool).getByRole("button", { name: "None" }));
    expect(screen.getByText("0 of 3 included")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Spin the wheel" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(pool).getByRole("button", { name: /Neuromancer/ }));
    expect(screen.getByText("1 of 3 included")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Spin the wheel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("spins across time, announces a winner, and supports Exclude & Spin and Start Reading", async () => {
    vi.useFakeTimers();
    const onOpenBook = vi.fn();
    const onStartReading = vi.fn().mockResolvedValue(undefined);
    render(
      <WheelPage
        books={demoBooks}
        collections={demoCollections}
        onOpenBook={onOpenBook}
        onStartReading={onStartReading}
        spinDurationMs={1200}
      />
    );

    expect(screen.queryByRole("region", { name: "Selected book" })).toBeNull();
    expect(screen.queryByText("Give the wheel a spin")).toBeNull();

    const spinBtn = screen.getByRole("button", { name: "Spin the wheel" });
    fireEvent.click(spinBtn);
    expect(screen.getByRole("status").textContent).toContain("Spinning across 3 books");
    expect((screen.getByRole("button", { name: "Spinning wheel" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("region", { name: "Selected book" })).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    const result = screen.getByRole("region", { name: "Selected book" });
    const winnerTitle = within(result).getByRole("heading", { level: 3 }).textContent!;
    expect(["Neuromancer", "Frankenstein", "Foundation"]).toContain(winnerTitle);
    expect(screen.getByRole("status").textContent).toBe(`Selected: ${winnerTitle}`);

    fireEvent.click(within(result).getByRole("button", { name: "View Details" }));
    expect(onOpenBook).toHaveBeenCalledWith(expect.objectContaining({ title: winnerTitle }));

    fireEvent.click(within(result).getByRole("button", { name: "Start Reading" }));
    expect(onStartReading).toHaveBeenCalledWith(expect.objectContaining({ title: winnerTitle }));

    // Exclude & Spin drops included count from 3 to 2 and spins immediately
    fireEvent.click(within(result).getByRole("button", { name: "Exclude & Spin" }));
    expect(screen.getByText("2 of 3 included")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    const nextResult = screen.getByRole("region", { name: "Selected book" });
    const nextTitle = within(nextResult).getByRole("heading", { level: 3 }).textContent!;
    expect(nextTitle).not.toBe(winnerTitle);
  });
});

describe("Book Wheel in App", () => {
  it("navigates to Book Wheel, spins with reduced motion, opens inspector, and marks book as Reading", async () => {
    localStorage.clear();
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      render(<App />);
      await screen.findByRole("button", { name: "Open Dune" });

      const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
      fireEvent.click(within(sidebar).getByRole("button", { name: /Book Wheel/ }));

      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Book Wheel");
      fireEvent.click(screen.getByRole("button", { name: "Spin the wheel" }));

      const result = screen.getByRole("region", { name: "Selected book" });
      const chosenTitle = within(result).getByRole("heading", { level: 3 }).textContent!;
      expect(["Neuromancer", "Frankenstein", "Foundation"]).toContain(chosenTitle);

      fireEvent.click(within(result).getByRole("button", { name: "View Details" }));
      expect(screen.getByRole("complementary", { name: `${chosenTitle} details` })).toBeTruthy();

      fireEvent.click(within(result).getByRole("button", { name: "Start Reading" }));
      await waitFor(() => {
        expect(document.querySelector(".toast")?.textContent).toContain(`Started reading \u201c${chosenTitle}\u201d`);
      });
      await waitFor(() => {
        expect(within(sidebar).getByRole("button", { name: /Reading Now/ }).textContent).toContain("3");
      });
    } finally {
      window.matchMedia = origMatchMedia;
      localStorage.clear();
    }
  });
});
