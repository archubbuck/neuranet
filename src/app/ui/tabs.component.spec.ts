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

	it('renders one tab per definition with the active one marked', async () => {
		const fixture = await create('insights');
		const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.tab');
		expect(buttons).toHaveLength(2);
		expect(buttons[1].classList.contains('on')).toBe(true);
		expect(buttons[1].getAttribute('aria-selected')).toBe('true');
		expect(buttons[0].classList.contains('on')).toBe(false);
	});

	it('clicking a tab updates the active model', async () => {
		const fixture = await create('records');
		const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tab');
		buttons[1].click();
		fixture.detectChanges();
		expect(fixture.componentInstance.active()).toBe('insights');
		expect(buttons[1].classList.contains('on')).toBe(true);
	});
});
