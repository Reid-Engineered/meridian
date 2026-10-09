// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readThemePreference, resolveTheme, useTheme } from "./theme";

afterEach(() => { cleanup(); localStorage.clear(); delete document.documentElement.dataset.theme; });

it.each(["strawberry", "mocha", "ube"] as const)("restores and applies %s independently of the system theme", preference => {
  localStorage.setItem("meridian-theme", preference);
  expect(readThemePreference()).toBe(preference);
  expect(resolveTheme(preference, true)).toBe(preference);
  expect(resolveTheme(preference, false)).toBe(preference);
  const { result } = renderHook(useTheme);
  expect(document.documentElement.dataset.theme).toBe(preference);
  act(() => result.current.setPreference("light"));
  expect(document.documentElement.dataset.theme).toBe("light");
  act(() => result.current.setPreference(preference));
  expect(document.documentElement.dataset.theme).toBe(preference);
  expect(localStorage.getItem("meridian-theme")).toBe(preference);
});
