import { describe, expect, it } from 'vitest';
import { formatCount } from './format';

describe('formatCount', () => {
	it('passes small numbers through', () => {
		expect(formatCount(0)).toBe('0');
		expect(formatCount(999)).toBe('999');
	});

	it('abbreviates thousands with one decimal', () => {
		expect(formatCount(1000)).toBe('1.0K');
		expect(formatCount(1234)).toBe('1.2K');
		expect(formatCount(15500)).toBe('15.5K');
	});
});
