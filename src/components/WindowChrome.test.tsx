// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WindowChrome } from "./WindowChrome";
import { windowService } from "../services/window";
import App from "../App";

let maximized = false;
let resized: () => void;
const stop = vi.fn();
beforeEach(() => {
  maximized = false;
  vi.spyOn(windowService, "hasCustomChrome").mockReturnValue(true);
  vi.spyOn(windowService, "isMaximized").mockImplementation(async () => maximized);
  vi.spyOn(windowService, "onResize").mockImplementation(async handler => { resized = handler; return stop; });
  vi.spyOn(windowService, "minimize").mockResolvedValue();
  vi.spyOn(windowService, "close").mockResolvedValue();
  vi.spyOn(windowService, "toggleMaximize").mockImplementation(async () => { maximized = !maximized; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); stop.mockClear(); });

it("uses native operations and switches Maximize to Restore, including external resizing", async () => {
  const view = render(<WindowChrome />);
  fireEvent.click(screen.getByRole("button", { name: "Minimize window" }));
  expect(windowService.minimize).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Maximize window" }));
  await screen.findByRole("button", { name: "Restore window" });
  fireEvent.click(screen.getByRole("button", { name: "Restore window" }));
  await screen.findByRole("button", { name: "Maximize window" });
  maximized = true; resized();
  await screen.findByRole("button", { name: "Restore window" });
  fireEvent.click(screen.getByRole("button", { name: "Close window" }));
  expect(windowService.close).toHaveBeenCalledOnce();
  view.unmount(); expect(stop).toHaveBeenCalledOnce();
});

it("surfaces a failed native action and permits retry", async () => {
  vi.mocked(windowService.toggleMaximize).mockRejectedValueOnce(new Error("Denied"));
  render(<WindowChrome />);
  fireEvent.click(screen.getByRole("button", { name: "Maximize window" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Maximize window" }));
  await screen.findByRole("button", { name: "Restore window" });
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("keeps browser preview and other native platforms free of Windows controls", () => {
  vi.mocked(windowService.hasCustomChrome).mockReturnValue(false);
  render(<WindowChrome />);
  expect(screen.queryByRole("group", { name: "Window controls" })).toBeNull();
  expect(windowService.onResize).not.toHaveBeenCalled();
});

it("keeps native caption controls available while an edit sheet isolates the app", async () => {
  localStorage.clear();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Add book" }));
  await screen.findByRole("dialog", { name: "Add to your library" });
  expect(document.querySelector<HTMLElement>('[data-window-chrome]')?.inert).not.toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Minimize window" }));
  expect(windowService.minimize).toHaveBeenCalledOnce();
});
