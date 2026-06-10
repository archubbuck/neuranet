/**
 * TopicNet design tokens.
 *
 * Use these constants from TypeScript; the matching CSS custom properties
 * are exported by `src/styles.css` for stylesheet usage (e.g.
 * `color: var(--c-amber)`).
 */

export const C = {
	black:        '#06090F',
	bgBase:       '#090E1C',
	bgSurface:    '#0B1120',
	bgElevated:   '#0F1828',
	bgOverlay:    '#152035',
	bgHover:      'rgba(255,255,255,0.04)',
	bgActive:     'rgba(255,255,255,0.07)',
	bgSelected:   'rgba(251,191,36,0.08)',
	amber:        '#FBBF24',
	amberHover:   '#FCD34D',
	amberPress:   '#D97706',
	amberDim:     'rgba(251,191,36,0.12)',
	amberBorder:  'rgba(251,191,36,0.35)',
	fg1:          '#F1F5F9',
	fg2:          '#94A3B8',
	fg3:          '#475569',
	fg4:          '#2A3D66',
	fgOnAccent:   '#06090F',
	borderSubtle: 'rgba(255,255,255,0.05)',
	borderDef:    'rgba(255,255,255,0.09)',
	borderStrong: 'rgba(255,255,255,0.18)',
	borderAccent: 'rgba(251,191,36,0.35)',
	emerald:      '#34D399',
	rose:         '#FB7185',
	success:      '#34D399',
	warning:      '#FBBF24',
	error:        '#FB7185',
	info:         '#38BDF8',
	reddit:       '#FF6040',
	pdf:          '#C084FC',
} as const;

export type ColorToken = keyof typeof C;

export const CLUSTER_COLORS: Record<string, string> = {
	cyan:    '#22D3EE',
	violet:  '#A78BFA',
	rose:    '#FB7185',
	emerald: '#34D399',
	orange:  '#FB923C',
	sky:     '#38BDF8',
	pink:    '#F472B6',
	lime:    '#A3E635',
};

export const CLUSTER_LABELS: Record<string, string> = {
	cyan:    'Tech / AI',
	violet:  'Social',
	rose:    'Policy',
	emerald: 'Research',
	orange:  'Media',
	sky:     'Business',
	pink:    'Health',
	lime:    'Climate',
};

export const FONT = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', monospace";

export const RADII = {
	xs: 2,
	sm: 3,
	md: 4,
	lg: 6,
	xl: 8,
	pill: 999,
} as const;

/**
 * Viewport breakpoints (px). `mobile` collapses multi-column layouts to
 * drawers; `narrow` tightens padding for phones.
 */
export const BREAKPOINTS = {
	mobile: 760,
	narrow: 460,
} as const;
