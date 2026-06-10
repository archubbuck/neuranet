// TopicNet Prototype — core tokens, icons, shared primitives & chart helpers
// Loaded first. Exports everything to window.

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
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
};

const CLUSTER_COLORS = {
  cyan:    '#22D3EE',
  violet:  '#A78BFA',
  rose:    '#FB7185',
  emerald: '#34D399',
  orange:  '#FB923C',
  sky:     '#38BDF8',
  pink:    '#F472B6',
  lime:    '#A3E635',
};

const CLUSTER_LABELS = {
  cyan:    'Tech / AI',
  violet:  'Social',
  rose:    'Policy',
  emerald: 'Research',
  orange:  'Media',
  sky:     'Business',
  pink:    'Health',
  lime:    'Climate',
};

const FONT = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', monospace";

// ─── Icons (Lucide path data) ────────────────────────────────────────────────
const ICONS = {
  network: `<circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="12" r="2"/><path d="M6.3 6.3 9 9"/><path d="m15 9 2.7-2.7"/><path d="M6.3 17.7 9 15"/><path d="m15 15 2.7 2.7"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>`,
  search: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>`,
  settings: `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  'file-text': `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  'message-square': `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  'message-circle': `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>`,
  'file': `<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>`,
  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,
  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,
  'chevron-down': `<polyline points="6 9 12 15 18 9"/>`,
  'chevron-up': `<polyline points="18 15 12 9 6 15"/>`,
  'trending-up': `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
  'trending-down': `<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  filter: `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
  'bar-chart-2': `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  list: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  'external-link': `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`,
  upload: `<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>`,
  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  hash: `<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>`,
  'alert-circle': `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  'check-circle': `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  refresh: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
  minus: `<line x1="5" y1="12" x2="19" y2="12"/>`,
  'zoom-in': `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>`,
  'circle-dot': `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>`,
  maximize: `<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>`,
  'arrow-right': `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  'arrow-left': `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`,
  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  key: `<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>`,
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  sliders: `<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>`,
  'more-horizontal': `<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>`,
  'trash-2': `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>`,
  play: `<polygon points="5 3 19 12 5 21 5 3"/>`,
  pause: `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
  info: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
  eye: `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`,
  cpu: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>`,
};

// ─── Viewport hook (responsive) ──────────────────────────────────────────────
// Single source of truth for breakpoints. isMobile collapses multi-column
// layouts to single column / drawers; isNarrow tightens padding for phones.
function useViewport() {
  const read = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return { width: w, isMobile: w < 760, isNarrow: w < 460 };
  };
  const [vp, setVp] = React.useState(read);
  React.useEffect(() => {
    let raf = null;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = null; setVp(read()); }); };
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return vp;
}

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.5, style = {} }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', flexShrink: 0, ...style },
    dangerouslySetInnerHTML: { __html: ICONS[name] || '' },
  });
}

// ─── Status + cluster badges ─────────────────────────────────────────────────
function StatusDot({ status, label }) {
  const map = {
    ready:     { color: C.emerald, label: 'ready' },
    ingesting: { color: C.amber,   label: 'ingesting' },
    error:     { color: C.rose,    label: 'error' },
    paused:    { color: C.fg3,     label: 'paused' },
    pending:   { color: C.info,    label: 'pending' },
  };
  const s = map[status] || map.ready;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 3,
      background: s.color + '18', border: `1px solid ${s.color}30`,
      fontSize: 10, fontWeight: 500, color: s.color,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block',
        boxShadow: status === 'ingesting' ? `0 0 5px ${s.color}` : 'none',
      }} />
      {label || s.label}
    </span>
  );
}

function ClusterBadge({ cluster, small }) {
  const color = CLUSTER_COLORS[cluster] || C.fg2;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 5,
      padding: small ? '1px 6px' : '3px 9px', borderRadius: 3,
      background: color + '14', border: `1px solid ${color}28`,
      fontSize: small ? 10 : 11, fontWeight: 500, color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80`, flexShrink: 0 }} />
      {CLUSTER_LABELS[cluster]}
    </span>
  );
}

function NodeChip({ node, onClick }) {
  const color = CLUSTER_COLORS[node.cluster] || C.fg2;
  const [hov, setHov] = React.useState(false);
  return (
    <span onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 4,
        background: hov ? color + '22' : color + '14',
        border: `1px solid ${hov ? color + '55' : color + '30'}`,
        fontSize: 11, fontWeight: 500, color,
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
        transition: 'all 150ms ease-out',
      }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}90`, flexShrink: 0 }} />
      {node.label}
    </span>
  );
}

// ─── Section label + divider ─────────────────────────────────────────────────
function SecLabel({ children, action, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, ...style }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.fg4 }}>{children}</span>
      {action}
    </div>
  );
}

function Divider({ margin = '20px 0' }) {
  return <div style={{ height: 1, background: C.borderSubtle, margin }} />;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
function Btn({ children, variant = 'secondary', size = 'md', icon, iconRight, onClick, style, disabled, title }) {
  const [hov, setHov] = React.useState(false);
  const pads = { sm: '5px 10px', md: '7px 14px', lg: '9px 18px' };
  const fonts = { sm: 12, md: 12.5, lg: 13.5 };
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: pads[size], borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
    fontFamily: FONT, fontSize: fonts[size], fontWeight: 600, letterSpacing: '-0.01em',
    transition: 'all 150ms ease-out', whiteSpace: 'nowrap', border: '1px solid transparent',
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: hov && !disabled ? C.amberHover : C.amber, color: C.fgOnAccent, border: '1px solid transparent' },
    secondary: { background: hov && !disabled ? C.bgHover : 'transparent', color: hov ? C.fg1 : C.fg2, border: `1px solid ${hov ? C.borderDef : C.borderDef}` },
    ghost: { background: hov && !disabled ? C.bgHover : 'transparent', color: hov ? C.fg1 : C.fg3, border: '1px solid transparent' },
    danger: { background: hov && !disabled ? 'rgba(251,113,133,0.12)' : 'rgba(251,113,133,0.06)', color: C.rose, border: `1px solid rgba(251,113,133,0.35)` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 15 : 13} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 15 : 13} color="currentColor" />}
    </button>
  );
}

function IconBtn({ name, size = 30, iconSize = 14, onClick, title, active, style }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: size, height: size, borderRadius: 6, flexShrink: 0,
        background: active ? C.amberDim : hov ? C.bgHover : 'transparent',
        border: `1px solid ${active ? C.borderAccent : hov ? C.borderDef : C.borderSubtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: active ? C.amber : hov ? C.fg1 : C.fg3,
        transition: 'all 150ms ease-out', padding: 0, ...style,
      }}>
      <Icon name={name} size={iconSize} color="currentColor" />
    </button>
  );
}

// ─── Source type glyph ───────────────────────────────────────────────────────
function SourceTypeIcon({ type, size = 32, radius = 7 }) {
  const map = { reddit: 'message-square', web: 'globe', pdf: 'file-text', document: 'file-text' };
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: C.bgOverlay, border: `1px solid ${C.borderSubtle}`, borderRadius: radius,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={map[type] || 'globe'} size={Math.round(size * 0.44)} color={C.fg3} />
    </div>
  );
}

// ─── Source kinds ────────────────────────────────────────────────────────────
// A *source* is a single ingested item. Reddit posts and comments, web URLs and
// documents (PDF/DOCX/TXT) are all distinct kinds of source — not "documents".
const SOURCE_KINDS = {
  post:    { id: 'post',    label: 'Reddit post',    short: 'Post',    icon: 'message-square', color: '#FF6040' },
  comment: { id: 'comment', label: 'Reddit comment', short: 'Comment', icon: 'message-circle', color: '#FF8A6B' },
  web:     { id: 'web',     label: 'Web URL',        short: 'Web',     icon: 'globe',          color: '#38BDF8' },
  pdf:     { id: 'pdf',     label: 'PDF',            short: 'PDF',     icon: 'file-text',      color: '#C084FC' },
  docx:    { id: 'docx',    label: 'DOCX',           short: 'DOCX',    icon: 'file-text',      color: '#60A5FA' },
  txt:     { id: 'txt',     label: 'TXT',            short: 'TXT',     icon: 'file',           color: '#94A3B8' },
};
// Resolve a source object to its kind descriptor. Documents carry a docSubtype.
function srcKind(s) {
  return SOURCE_KINDS[s.type === 'document' ? (s.docSubtype || 'pdf') : s.type] || SOURCE_KINDS.web;
}

// Colored glyph tile for an individual source's kind.
function SourceGlyph({ kind, size = 28, radius = 7 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: `${kind.color}14`, border: `1px solid ${kind.color}30`, borderRadius: radius,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={kind.icon} size={Math.round(size * 0.46)} color={kind.color} />
    </div>
  );
}

// Type badge naming the kind of a single source.
function SourceKindBadge({ kind, small, withIcon = true }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 5,
      padding: small ? '1px 6px' : '2px 8px', borderRadius: 3,
      background: `${kind.color}14`, border: `1px solid ${kind.color}28`,
      fontSize: small ? 10 : 10.5, fontWeight: 500, color: kind.color, whiteSpace: 'nowrap',
    }}>
      {withIcon && <Icon name={kind.icon} size={small ? 9 : 11} color={kind.color} />}
      {kind.label}
    </span>
  );
}

// ─── Chart primitives ────────────────────────────────────────────────────────

// Responsive line+area chart that fills its container width.
function LineAreaChart({ data, labels, color, height = 112, showDots = true, gradId }) {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(480);
  const uid = React.useMemo(() => gradId || 'lac' + Math.random().toString(36).slice(2, 8), [gradId]);
  React.useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, Math.floor(e.contentRect.width))));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const pad = { t: 10, r: 6, b: labels ? 22 : 8, l: 30 };
  const cw = w - pad.l - pad.r, ch = height - pad.t - pad.b;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const px = i => pad.l + (i / (data.length - 1)) * cw;
  const py = v => pad.t + ch - ((v - min) / range) * ch;
  const pts = data.map((v, i) => [px(i), py(v)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${line}L${pts.at(-1)[0]},${pad.t + ch}L${pts[0][0]},${pad.t + ch}Z`;
  const yTicks = [min, Math.round(min + range * 0.5), max];
  const xShow = labels ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [];
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={py(v)} x2={pad.l + cw} y2={py(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad.l - 6} y={py(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill={C.fg4} fontFamily={MONO}>{v}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${uid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {showDots && pts.map(([x, y], i) => i === pts.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke={C.bgElevated} strokeWidth="2" />
        ) : null)}
        {xShow.map(i => (
          <text key={i} x={px(i)} y={pad.t + ch + 16} textAnchor="middle" fontSize="9" fill={C.fg4} fontFamily={FONT}>{labels[i]}</text>
        ))}
      </svg>
    </div>
  );
}

// Dual-series area chart (responsive)
function DualAreaChart({ data, color, data2, color2, labels, height = 118 }) {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(560);
  React.useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.floor(e.contentRect.width))));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const tP = 8, bP = labels ? 20 : 8, lP = 4, rP = 4;
  const cW = w - lP - rP, cH = height - tP - bP;
  const renderArea = (d, c, fade) => {
    const mn = Math.min(...d), mx = Math.max(...d), rng = mx - mn || 1;
    const pts = d.map((v, i) => [lP + (i / (d.length - 1)) * cW, tP + cH - ((v - mn) / rng) * cH]);
    const pStr = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return (
      <g opacity={fade ? 0.55 : 1}>
        <polygon points={`${pts[0][0]},${height - bP} ${pStr} ${pts.at(-1)[0]},${height - bP}`} fill={`${c}14`} />
        <polyline points={pStr} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  };
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={lP} y1={tP + t * cH} x2={w - rP} y2={tP + t * cH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,3" />
        ))}
        {renderArea(data, color, false)}
        {data2 && renderArea(data2, color2, true)}
        {labels && labels.map((lb, i) => (
          <text key={i} x={lP + (i / (labels.length - 1)) * cW} y={height - 4} fill={C.fg4} fontSize="9" fontFamily={FONT} textAnchor="middle">{lb}</text>
        ))}
      </svg>
    </div>
  );
}

// Responsive bar chart
function BarChart({ data, color, height = 110, peakIdx }) {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(560);
  React.useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.floor(e.contentRect.width))));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(...data), n = data.length, gap = 2;
  const barW = (w - (n - 1) * gap) / n;
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        {[0.33, 0.66].map(t => (
          <line key={t} x1={0} y1={t * height * 0.9} x2={w} y2={t * height * 0.9} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,3" />
        ))}
        {data.map((v, i) => {
          const bh = (v / max) * height * 0.88;
          const isPeak = i === peakIdx;
          return <rect key={i} x={i * (barW + gap)} y={height - bh} width={barW} height={bh} rx="1.5"
            fill={isPeak ? `${color}55` : `${color}28`} stroke={color} strokeWidth={isPeak ? 1 : 0.75} strokeOpacity={isPeak ? 1 : 0.6} />;
        })}
      </svg>
    </div>
  );
}

// Tiny inline sparkline (fixed width)
function Sparkline({ data, color, width = 110, height = 22, area = true }) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const W = width - 2, H = height - 2;
  const pts = data.map((v, i) => [1 + (i / (data.length - 1)) * W, 1 + H - ((v - mn) / rng) * H]);
  const pStr = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {area && <polygon points={`${pts[0][0]},${height} ${pStr} ${pts.at(-1)[0]},${height}`} fill={`${color}18`} />}
      <polyline points={pStr} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

Object.assign(window, {
  C, CLUSTER_COLORS, CLUSTER_LABELS, FONT, MONO, ICONS,
  useViewport,
  Icon, StatusDot, ClusterBadge, NodeChip, SecLabel, Divider,
  Btn, IconBtn, SourceTypeIcon,
  SOURCE_KINDS, srcKind, SourceGlyph, SourceKindBadge,
  LineAreaChart, DualAreaChart, BarChart, Sparkline,
});
