// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { BookForm } from "./BookForm";
import { CollectionsPage } from "../pages/CollectionsPage";
import App from "../App";

beforeAll(() => {
  // jsdom has no native inert reflection; browsers do. Preserve that DOM contract.
  if (!('inert' in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, 'inert', {
    get() { return this.hasAttribute('inert'); },
    set(value: boolean) { this.toggleAttribute('inert', value); }, configurable: true
  });
});
afterEach(cleanup);

function ConfirmationFlow() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Delete copy</button><button>Outside</button>{open &&
    <ConfirmDialog title="Remove copy?" body="Cannot be undone." confirm="Remove" onConfirm={() => {}} onClose={() => setOpen(false)} />}</>;
}

describe('dialog keyboard boundaries', () => {
  it('keeps global shortcuts from replacing an active confirmation or edit context', async () => {
    localStorage.clear();
    render(<App />);
    const book = await screen.findByRole('button', {name:'Open Dune'}); book.focus(); fireEvent.click(book);
    const remove = screen.getByRole('button',{name:'Delete'}); remove.focus(); fireEvent.click(remove);
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Cancel'}));
    fireEvent.keyDown(window,{key:'n',ctrlKey:true});
    expect(screen.queryByRole('dialog',{name:'Add to your library'})).toBeNull();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement!,{key:'Escape'});
    expect(document.activeElement).toBe(remove);
    fireEvent.keyDown(remove,{key:'Escape'}); expect(document.activeElement).toBe(book);
  });
  it('focuses the safe action, traps both directions, isolates the background and returns focus on Escape', () => {
    render(<ConfirmationFlow />);
    const opener = screen.getByText('Delete copy'); opener.focus(); fireEvent.click(opener);
    const cancel = screen.getByText('Cancel'), remove = screen.getByText('Remove');
    expect(document.activeElement).toBe(cancel);
    expect(opener.closest('[inert]')).not.toBeNull();
    fireEvent.keyDown(cancel, {key:'Tab', shiftKey:true}); expect(document.activeElement).toBe(remove);
    fireEvent.keyDown(remove, {key:'Tab'}); expect(document.activeElement).toBe(cancel);
    screen.getByText('Outside').focus(); expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, {key:'Escape'});
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(opener); expect(opener.closest('[inert]')).toBeNull();
  });

  it('only closes the top collection layer and restores the lower layer action', () => {
    render(<CollectionsPage collections={[{id:7,name:'Favorites',description:'Keepers',bookCount:0,covers:[]}]} books={[]}
      onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onOpenBook={vi.fn()} />);
    const card = screen.getByRole('button', {name:'Open Favorites'}); card.focus();
    fireEvent.keyDown(card, {key:'Enter'});
    const rename = screen.getByText('Rename'); rename.focus(); fireEvent.click(rename);
    expect(screen.getByRole('dialog', {name:'Rename collection'})).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    fireEvent.keyDown(document.activeElement!, {key:'Escape'});
    expect(screen.queryByRole('dialog', {name:'Rename collection'})).toBeNull();
    expect(screen.getByRole('dialog', {name:'Collection details'})).toBeTruthy();
    expect(document.activeElement).toBe(rename);
    fireEvent.keyDown(rename, {key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(card);
  });

  it('supports arrow/Home/End navigation with one tab stop and a named panel', () => {
    render(<BookForm collections={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    const details = screen.getByRole('tab', {name:'Details'}), reading = screen.getByRole('tab', {name:'Reading'}), copy = screen.getByRole('tab', {name:'My copy'});
    expect(document.activeElement).toBe(screen.getByLabelText(/Title/));
    details.focus(); fireEvent.keyDown(details, {key:'ArrowRight'});
    expect(document.activeElement).toBe(reading); expect(reading.tabIndex).toBe(0); expect(details.tabIndex).toBe(-1);
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(reading.id);
    fireEvent.keyDown(reading, {key:'End'}); expect(document.activeElement).toBe(copy);
    fireEvent.keyDown(copy, {key:'ArrowRight'}); expect(document.activeElement).toBe(details);
    fireEvent.keyDown(details, {key:'ArrowLeft'}); expect(document.activeElement).toBe(copy);
    fireEvent.keyDown(copy, {key:'Home'}); expect(document.activeElement).toBe(details);
  });

  it('focuses a missing title across tabs and shows native rejected-string errors without losing input', async () => {
    const save = vi.fn().mockRejectedValue('The library database could not complete that operation.');
    render(<BookForm collections={[]} onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', {name:'Reading'}));
    fireEvent.click(screen.getByRole('button', {name:'Add book'}));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Title/)));
    expect(save).not.toHaveBeenCalled();
    const title = screen.getByLabelText(/Title/); fireEvent.change(title, {target:{value:'Keep my draft'}});
    fireEvent.click(screen.getByRole('button', {name:'Add book'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not complete'));
    expect((title as HTMLInputElement).value).toBe('Keep my draft');
    expect((screen.getByRole('button', {name:'Add book'}) as HTMLButtonElement).disabled).toBe(false);
  });
});
