// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { libraryService } from "../services/library";

beforeAll(() => {
  if (!('inert' in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, 'inert', {
    get() { return this.hasAttribute('inert'); },
    set(value: boolean) { this.toggleAttribute('inert', value); }, configurable: true
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const titles = () => screen.getAllByRole('button', { name: /^Open / }).map(b => b.getAttribute('aria-label')!.replace(/^Open /, ''));
async function start() { localStorage.clear(); render(<App />); await screen.findByRole('button', { name: 'Open Dune' }); }

describe('library toolbar', () => {
  it('filters through the popover, shows removable chips and closes with Escape back to its button', async () => {
    await start();
    const trigger = screen.getByRole('button', { name: 'Filter' });
    trigger.focus(); fireEvent.click(trigger);
    const pop = screen.getByRole('dialog', { name: 'Filter books' });
    expect(pop.getAttribute('aria-modal')).toBeNull();
    fireEvent.change(within(pop).getByLabelText('Status'), { target: { value: 'Finished' } });
    await waitFor(() => expect(titles()).not.toContain('Dune'));
    expect(titles()).toContain('The Hobbit');
    fireEvent.click(within(pop).getByRole('button', { name: '4+ stars' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Active filters' }).textContent).toContain('Rating: 4+ stars'));
    expect(screen.getByRole('button', { name: 'Filter · 2' })).toBeTruthy();
    fireEvent.keyDown(within(pop).getByLabelText('Status'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Filter books' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filter · 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Status: Finished' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Filter · 1' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull());
  });

  it('sorts by field and direction from the sort menu with keyboard support', async () => {
    await start();
    const trigger = screen.getByRole('button', { name: /Recently Added/ });
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Sort books' });
    expect(document.activeElement).toBe(within(menu).getByRole('menuitemradio', { name: 'Date Added' }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(within(menu).getByRole('menuitemradio', { name: 'Title' }));
    fireEvent.click(document.activeElement!);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Title/ }));
    await waitFor(() => expect(titles()[0]).toBe('1984'));
    const sorted = titles();
    expect([...sorted].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))).toEqual(sorted);
    fireEvent.click(screen.getByRole('button', { name: /Title/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Descending' }));
    await waitFor(() => expect(titles()).toEqual([...sorted].reverse()));
    fireEvent.click(screen.getByRole('button', { name: /Title/ }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('suggests books and authors while searching and opens a suggested book', async () => {
    await start();
    const input = screen.getByRole('combobox', { name: 'Search your library' });
    fireEvent.change(input, { target: { value: 'le gu' } });
    const list = await screen.findByRole('listbox', { name: 'Suggestions' });
    expect(within(list).getAllByRole('option').map(o => o.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('The Left Hand of Darkness'), expect.stringContaining('The Dispossessed'), expect.stringContaining('Ursula K. Le Guin2 books')]));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(within(list).getAllByRole('option')[0].id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('complementary', { name: /details$/ })).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the list view as a table that opens books', async () => {
    await start();
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Title', 'Author', 'Status', 'Rating', 'Format', 'Published', 'Added']);
    fireEvent.click(within(table).getByRole('button', { name: 'Open Dune' }));
    expect(screen.getByRole('complementary', { name: 'Dune details' })).toBeTruthy();
    expect(within(table).getByRole('button', { name: 'Open Dune' }).getAttribute('aria-current')).toBe('true');
  });

  it('explains an empty search and clears it', async () => {
    await start();
    fireEvent.change(screen.getByRole('combobox', { name: 'Search your library' }), { target: { value: 'tolstoy' } });
    expect(await screen.findByRole('heading', { name: 'No books match “tolstoy”' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await screen.findByRole('button', { name: 'Open Dune' });
  });

  it('greets an empty library with an Add Book action', async () => {
    localStorage.clear();
    vi.spyOn(libraryService, 'listBooks').mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your shelves are waiting' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));
    expect(await screen.findByRole('dialog', { name: 'Add to your library' })).toBeTruthy();
  });
});

describe('preview sort', () => {
  it('matches the native order: direction applies, unrated books stay last', async () => {
    localStorage.clear();
    const asc = (await libraryService.listBooks({ sort: 'rating_asc' })).map(b => b.rating ?? null);
    const desc = (await libraryService.listBooks({ sort: 'rating_desc' })).map(b => b.rating ?? null);
    const rated = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
    expect(rated(asc)).toEqual([...rated(asc)].sort((a, b) => a - b));
    expect(rated(desc)).toEqual([...rated(desc)].sort((a, b) => b - a));
    expect(asc.slice(rated(asc).length).every(x => x === null)).toBe(true);
    expect(desc.slice(rated(desc).length).every(x => x === null)).toBe(true);
  });
});
