// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { libraryService } from '../services/library';
import App from '../App';

beforeEach(()=>{vi.spyOn(libraryService,'getCoverStorage').mockResolvedValue({files:0,bytes:0});});
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
const page=(props:Partial<Parameters<typeof SettingsPage>[0]>={})=>render(<SettingsPage theme="light" onTheme={()=>{}} logoPosition="left" onLogoPosition={()=>{}} info={null} onExport={vi.fn()} onReset={()=>{}} onRestored={vi.fn()} {...props}/>);

it('shows one section at a time and switches with tabs and arrow keys',()=>{
  page();
  const list=screen.getByRole('tablist',{name:'Settings sections'});
  expect(within(list).getAllByRole('tab').map(t=>t.textContent)).toEqual(['Appearance','Library data','Backup & restore','About']);
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('settings-tab-appearance');
  expect(screen.getByRole('group',{name:'Theme'})).toBeTruthy();
  expect(screen.queryByText('Application version')).toBeNull();
  fireEvent.click(screen.getByRole('tab',{name:'About'}));
  expect(screen.getByText('Application version')).toBeTruthy();
  expect(screen.queryByRole('group',{name:'Theme'})).toBeNull();
  fireEvent.keyDown(screen.getByRole('tab',{name:'About'}),{key:'ArrowDown'});
  expect(screen.getByRole('tab',{name:'Appearance'}).getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(screen.getByRole('tab',{name:'Appearance'}));
  fireEvent.keyDown(document.activeElement!,{key:'ArrowUp'});
  expect(screen.getByRole('tab',{name:'About'}).getAttribute('aria-selected')).toBe('true');
});

it('reports the chosen logo position',()=>{
  const onLogoPosition=vi.fn();page({onLogoPosition});
  const group=screen.getByRole('group',{name:'Logo position'});
  expect(within(group).getByRole('button',{name:/Left/}).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(within(group).getByRole('button',{name:/Centered/}));
  expect(onLogoPosition).toHaveBeenCalledWith('centered');
});

it('centers the logo in the sidebar and remembers it',async()=>{
  localStorage.clear();
  const app=render(<App/>);
  await screen.findByRole('button',{name:'Open Dune'});
  const brand=()=>screen.getByRole('complementary',{name:'Sidebar'}).querySelector('.sidebar-brand') as HTMLElement;
  expect(brand().classList.contains('centered')).toBe(false);
  fireEvent.click(within(screen.getByRole('complementary',{name:'Sidebar'})).getByRole('button',{name:/Settings/}));
  fireEvent.click(within(screen.getByRole('group',{name:'Logo position'})).getByRole('button',{name:/Centered/}));
  expect(brand().classList.contains('centered')).toBe(true);
  expect(document.querySelector('main .sidebar-brand')).toBeNull();
  app.unmount();
  render(<App/>);
  await screen.findByRole('button',{name:'Open Dune'});
  expect(brand().classList.contains('centered')).toBe(true);
});
