/** Shared number/text formatting helpers. */

/** Compact count: 1234 → "1.2K", 999 → "999". */
export function formatCount(n: number): string {
	return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
}
