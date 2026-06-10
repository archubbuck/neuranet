import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlaceholderScreenComponent } from './placeholder-screen.component';

describe('PlaceholderScreenComponent', () => {
	it('renders title and subtitle inputs', async () => {
		await TestBed.configureTestingModule({
			imports: [PlaceholderScreenComponent],
		}).compileComponents();

		const fixture = TestBed.createComponent(PlaceholderScreenComponent);
		fixture.componentRef.setInput('title', 'Hello');
		fixture.componentRef.setInput('subtitle', 'World');
		fixture.detectChanges();

		const el = fixture.nativeElement as HTMLElement;
		expect(el.querySelector('h1')?.textContent).toBe('Hello');
		expect(el.querySelector('p')?.textContent).toBe('World');
	});
});
