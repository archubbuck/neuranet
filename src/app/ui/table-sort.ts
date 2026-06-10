/**
 * Shared table-sort + column-filter helpers used by Categories, Topics,
 * and Sources screens.
 *
 * Each screen maintains its own `SortBy` and `ColumnFilters` signals.
 * Click a header to cycle asc → desc → none.  Shift+click to add/remove
 * as a secondary sort key.  Click the filter icon on each column to
 * reveal a per-column filter input.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

export interface SortColumn {
	readonly column: string;
	readonly dir: SortDir;
}

export type SortAccessors<T> = Record<string, (row: T) => number | string | null>;

/** Map of column name → filter string (empty string = no filter). */
export type ColumnFilters = Record<string, string>;

// ── Sort-state toggle (three-state: asc → desc → none) ─────────────────

/**
 * Toggle a column in the sort list, returning a fresh array.
 *
 * - Plain click on a new column → prepends ascending, keeps secondary.
 * - Plain click on primary asc → toggles to desc.
 * - Plain click on primary desc → **removes** the column from sort.
 * - Shift+click on a column → adds/removes as a secondary sort key
 *   (preserves primary).
 */
export function toggleSort(
	current: readonly SortColumn[],
	column: string,
	shiftKey: boolean,
): SortColumn[] {
	const idx = current.findIndex((s) => s.column === column);

	if (shiftKey) {
		if (idx === -1) return [...current, { column, dir: 'asc' }];
		const next = [...current];
		next.splice(idx, 1);
		return next;
	}

	// Plain click
	if (idx === 0) {
		// Already primary
		if (current[0].dir === 'asc') {
			// asc → desc
			return [{ column, dir: 'desc' }, ...current.slice(1)];
		}
		// desc → remove (promote first secondary if any)
		return current.slice(1);
	}

	// Not primary (either sub-sort at idx>0, or not in list at all)
	const without = idx === -1 ? [...current] : [...current.slice(0, idx), ...current.slice(idx + 1)];
	return [{ column, dir: 'asc' }, ...without];
}

// ── Apply sorts ─────────────────────────────────────────────────────────

/**
 * Apply sorts to an array of rows.  Returns a new sorted copy; the
 * original is not mutated.  Sorts are stable (preserving relative order
 * of equal elements).  `null` values sort last.
 */
export function applySorts<T>(
	rows: readonly T[],
	sorts: readonly SortColumn[],
	accessors: SortAccessors<T>,
): T[] {
	if (sorts.length === 0) return [...rows];

	const comparators = sorts.map((s) => {
		const acc = accessors[s.column];
		return makeComparator(s, acc);
	});

	return [...rows].sort((a, b) => {
		for (const cmp of comparators) {
			const r = cmp(a, b);
			if (r !== 0) return r;
		}
		return 0;
	});
}

// ── Column filters ──────────────────────────────────────────────────────

/**
 * Apply per-column text filters.  Each non-empty filter value is matched
 * case-insensitively against the corresponding accessor value (cast to
 * string).  Filters are ANDed together.
 */
export function applyColumnFilters<T>(
	rows: readonly T[],
	filters: ColumnFilters,
	accessors: SortAccessors<T>,
): T[] {
	const active = Object.entries(filters).filter(([, v]) => v.trim() !== '');
	if (active.length === 0) return [...rows];

	return rows.filter((row) =>
		active.every(([col, val]) => {
			const acc = accessors[col];
			if (!acc) return true;
			const cell = acc(row);
			if (cell == null) return false;
			return String(cell).toLowerCase().includes(val.trim().toLowerCase());
		}),
	);
}

// ── Internals ───────────────────────────────────────────────────────────

function makeComparator<T>(
	sort: SortColumn,
	acc: ((row: T) => number | string | null) | undefined,
): (a: T, b: T) => number {
	if (!acc) return () => 0;
	const dir = sort.dir === 'asc' ? 1 : -1;
	return (a, b) => {
		const va = acc(a);
		const vb = acc(b);
		return cmpValues(va, vb) * dir;
	};
}

function cmpValues(a: number | string | null, b: number | string | null): number {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return String(a).localeCompare(String(b));
}
