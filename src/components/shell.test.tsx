// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { readThemePreference, resolveTheme } from "../theme";
import { SettingsPage } from "../pages/SettingsPage";
import { libraryService } from "../services/library";

beforeAll(() => {
  if (!('inert' in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, 'inert', {
    get() { return this.hasAttribute('inert'); },
    set(value: boolean) { this.toggleAttribute('inert', value); }, configurable: true
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('theme preference', () => {
  it('defaults to following the system and resolves each preference', () => {
    localStorage.removeItem('meridian-theme');
    expect(readThemePreference()).toBe('system');
    localStorage.setItem('meridian-theme', 'dark');
    expect(readThemePreference()).toBe('dark');
    localStorage.setItem('meridian-theme', 'sepia');
    expect(readThemePreference()).toBe('system');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('offers Light, Dark and Automatic and reports the chosen preference', () => {
    vi.spyOn(libraryService, 'getCoverStorage').mockResolvedValue({ files: 0, bytes: 0 });
    const onTheme = vi.fn();
    render(<SettingsPage theme="light" onTheme={onTheme} info={null} onExport={vi.fn()} onReset={() => {}} onRestored={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Theme' });
    expect(within(group).getByRole('button', { name: /Light/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: /Automatic/ }));
    expect(onTheme).toHaveBeenCalledWith('system');
  });
});

describe('window shell', () => {
  it('filters the library from the sidebar and titles the toolbar to match', async () => {
    localStorage.clear();
    render(<App />);
    await screen.findByRole('button', { name: 'Open Dune' });
    const sidebar = screen.getByRole('complementary', { name: 'Sidebar' });
    fireEvent.click(within(sidebar).getByRole('button', { name: /Finished/ }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Finished'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Open Dune' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Open The Hobbit' })).toBeTruthy();
    expect(within(sidebar).getByRole('button', { name: /Finished/ }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(sidebar).getByRole('button', { name: /All Books/ }));
    await screen.findByRole('button', { name: 'Open Dune' });
  });

  it('shows a non-modal inspector that closes with Escape and returns focus to the book', async () => {
    localStorage.clear();
    render(<App />);
    const book = await screen.findByRole('button', { name: 'Open Dune' });
    book.focus(); fireEvent.click(book);
    const inspector = screen.getByRole('complementary', { name: 'Dune details' });
    expect(inspector.getAttribute('aria-modal')).toBeNull();
    expect(book.closest('[inert]')).toBeNull();
    const close = within(inspector).getByRole('button', { name: 'Close' });
    close.focus(); fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Dune details' })).toBeNull();
    expect(document.activeElement).toBe(book);
  });

  it('closes the inspector with Escape while focus is still on the book that opened it', async () => {
    localStorage.clear();
    render(<App />);
    const book = await screen.findByRole('button', { name: 'Open Dune' });
    book.focus(); fireEvent.click(book);
    expect(screen.getByRole('complementary', { name: 'Dune details' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Dune details' })).toBeNull();
    expect(document.activeElement).toBe(book);
  });

  it('leaves Escape to an open modal before the inspector', async () => {
    localStorage.clear();
    render(<App />);
    const book = await screen.findByRole('button', { name: 'Open Dune' });
    book.focus(); fireEvent.click(book);
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Dune details' })).toBeTruthy();
  });

  it('closes the collection drawer when a book is opened from it, so the inspector is reachable', async () => {
    localStorage.clear();
    render(<App />);
    await screen.findByRole('button', { name: 'Open Dune' });
    const sidebar = screen.getByRole('complementary', { name: 'Sidebar' });
    fireEvent.click(within(sidebar).getByRole('button', { name: /All Collections/ }));
    const card = await screen.findByRole('button', { name: 'Open Science Fiction' });
    card.focus(); fireEvent.keyDown(card, { key: 'Enter' });
    const drawer = screen.getByRole('dialog', { name: 'Collection details' });
    fireEvent.click(within(drawer).getByRole('button', { name: /Dune/ }));
    expect(screen.queryByRole('dialog', { name: 'Collection details' })).toBeNull();
    const inspector = screen.getByRole('complementary', { name: 'Dune details' });
    expect(inspector.closest('[inert]')).toBeNull();
    const edit = within(inspector).getByRole('button', { name: /Edit book/ });
    edit.focus();
    expect(document.activeElement).toBe(edit);
  });
});
