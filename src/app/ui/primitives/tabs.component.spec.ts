import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TabsComponent } from './tabs.component';

const TABS = [
  { id: 'records', label: 'Records', icon: 'layers' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
];

describe('TabsComponent', () => {
  async function create(active = 'records') {
    await TestBed.configureTestingModule({ imports: [TabsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentRef.setInput('tabs', TABS);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(fixture: any): NodeListOf<HTMLButtonElement> {
    return (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
  }

  it('renders one tab per definition with the active one marked', async () => {
    const fixture = await create('insights');
    const btns = buttons(fixture);
    expect(btns).toHaveLength(2);
    expect(btns[1].classList.contains('text-amber')).toBe(true);
    expect(btns[1].getAttribute('aria-selected')).toBe('true');
    expect(btns[0].classList.contains('text-amber')).toBe(false);
  });

  it('clicking a tab updates the active model', async () => {
    const fixture = await create('records');
    const btns = buttons(fixture);
    btns[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('insights');
    expect(btns[1].classList.contains('text-amber')).toBe(true);
  });
});
