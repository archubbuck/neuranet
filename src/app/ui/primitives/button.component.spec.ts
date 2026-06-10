import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
	async function create(variant = 'primary', disabled = false) {
		await TestBed.configureTestingModule({ imports: [ButtonComponent] }).compileComponents();
		const fixture = TestBed.createComponent(ButtonComponent);
		fixture.componentRef.setInput('variant', variant);
		fixture.componentRef.setInput('disabled', disabled);
		fixture.detectChanges();
		return fixture;
	}

	it('applies the variant class', async () => {
		const fixture = await create('danger');
		const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
		expect(btn.classList.contains('danger')).toBe(true);
	});

	it('emits pressed on click', async () => {
		const fixture = await create();
		const onPressed = vi.fn();
		fixture.componentInstance.pressed.subscribe(onPressed);
		(fixture.nativeElement as HTMLElement).querySelector('button')!.click();
		expect(onPressed).toHaveBeenCalledOnce();
	});

	it('does not emit when disabled', async () => {
		const fixture = await create('primary', true);
		const onPressed = vi.fn();
		fixture.componentInstance.pressed.subscribe(onPressed);
		(fixture.nativeElement as HTMLElement).querySelector('button')!.click();
		expect(onPressed).not.toHaveBeenCalled();
	});
});
