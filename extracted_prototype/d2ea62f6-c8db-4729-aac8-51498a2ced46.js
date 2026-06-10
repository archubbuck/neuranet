// TopicNet Prototype — shared management primitives + Clusters management page
// Depends on tn-core.jsx (C, FONT, MONO, Icon, Btn, IconBtn, CLUSTER_COLORS), tn-shell.jsx (useApp)

// Curated category palette — the 8 node-cluster hues (amber is reserved for chrome)
const PALETTE = Object.values(CLUSTER_COLORS);

const fmtK = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
function catStats(nodes, key) {
  const ns = nodes.filter(n => n.cluster === key);
  const docs = ns.reduce((a, n) => a + n.docs, 0);
  const sent = ns.length ? ns.reduce((a, n) => a + n.sentiment, 0) / ns.length : 0;
  return { count: ns.length, docs, sent };
}

// ─── Generic popover (click-away backdrop + floating panel) ───────────────────
function Popover({ open, onClose, children, style }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 4000 }} />
      <div style={{
        position: 'absolute', zIndex: 4001, background: C.bgOverlay, border: `1px solid ${C.borderDef}`,
        borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', animation: 'tnPop 160ms ease-out', ...style,
      }}>{children}</div>
    </>
  );
}

// ─── Click-to-rename text ─────────────────────────────────────────────────────
function EditableText({ value, onCommit, size = 14, weight = 500, color, placeholder, maxWidth = 280 }) {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(value);
  const ref = React.useRef(null);
  React.useEffect(() => { setV(value); }, [value]);
  React.useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  if (editing) {
    return (
      <input ref={ref} value={v} onChange={e => setV(e.target.value)}
        onClick={e => e.stopPropagation()}
        onBlur={() => { setEditing(false); const t = v.trim(); if (t && t !== value) onCommit(t); else setV(value); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value); setEditing(false); } }}
        style={{
          font: `${weight} ${size}px ${FONT}`, color: C.fg1, background: C.bgElevated,
          border: `1px solid ${C.amberBorder}`, borderRadius: 6, padding: '5px 9px', outline: 'none',
          width: '100%', maxWidth, letterSpacing: '-0.01em',
        }} />
    );
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Click to rename"
      style={{ fontSize: size, fontWeight: weight, color: color || C.fg1, cursor: 'text', borderRadius: 4, padding: '2px 5px', margin: '-2px -5px', transition: 'background 120ms ease-out' }}
      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {value || <span style={{ color: C.fg3 }}>{placeholder}</span>}
    </span>
  );
}

// ─── Color swatch + picker ────────────────────────────────────────────────────
function ColorGrid({ value, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
      {PALETTE.map(col => (
        <button key={col} onClick={() => onPick(col)} title={col} style={{
          width: 28, height: 28, borderRadius: 7, background: col, cursor: 'pointer', padding: 0,
          border: col === value ? `2px solid ${C.fg1}` : '2px solid transparent',
          boxShadow: `0 0 8px ${col}66`,
        }} />
      ))}
    </div>
  );
}
function ColorSwatch({ color, onPick, size = 22 }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="Change color" style={{
        width: size, height: size, borderRadius: 6, background: color, border: 'none', cursor: 'pointer',
        boxShadow: `0 0 8px ${color}66`, padding: 0,
      }} />
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: size + 8, left: 0, padding: 12, width: 'max-content' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4, marginBottom: 9 }}>Category color</div>
        <ColorGrid value={color} onPick={(c) => { onPick(c); setOpen(false); }} />
      </Popover>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function MCheck({ checked, indeterminate, onChange }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onChange(); }} style={{
      width: 17, height: 17, borderRadius: 4, flexShrink: 0, cursor: 'pointer', padding: 0,
      border: `1.5px solid ${checked || indeterminate ? C.amber : C.borderStrong}`,
      background: checked || indeterminate ? C.amberDim : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease-out',
    }}>
      {checked && <Icon name="check" size={11} color={C.amber} strokeWidth={3} />}
      {indeterminate && !checked && <span style={{ width: 8, height: 2, background: C.amber, borderRadius: 1 }} />}
    </button>
  );
}

// ─── Floating bulk action bar ─────────────────────────────────────────────────
function MBulkBar({ count, label, onClear, children }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 11,
      background: 'rgba(15,24,40,0.97)', border: `1px solid ${C.amberBorder}`,
      boxShadow: '0 10px 36px rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', animation: 'tnPop 160ms ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8, borderRight: `1px solid ${C.borderDef}` }}>
        <span style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 6, background: C.amberDim, border: `1px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.amber }}>{count}</span>
        <span style={{ fontSize: 12.5, color: C.fg1 }}>{label}</span>
      </div>
      {children}
      <button onClick={onClear} title="Clear selection (Esc)" style={{ marginLeft: 2, padding: '6px 9px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.fg3, fontFamily: FONT, fontSize: 11.5 }}>Clear</button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function MModal({ title, subtitle, onClose, children, footer, width = 460 }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'rgba(6,9,15,0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
        background: C.bgSurface, border: `1px solid ${C.borderDef}`, borderRadius: 12,
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)', overflow: 'hidden', animation: 'tnPop 200ms ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '15px 18px', borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.fg1, letterSpacing: '-0.01em' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: C.fg3, marginTop: 3 }}>{subtitle}</p>}
          </div>
          <IconBtn name="x" size={28} iconSize={15} onClick={onClose} />
        </div>
        <div style={{ padding: 18, overflowY: 'auto' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '13px 18px', borderTop: `1px solid ${C.borderSubtle}` }}>{footer}</div>}
      </div>
    </div>
  );
}

// Text input used inside modals
function MInput({ value, onChange, placeholder, autoFocus, onEnter }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return (
    <input ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      style={{
        width: '100%', font: `500 14px ${FONT}`, color: C.fg1, background: C.bgElevated,
        border: `1px solid ${C.borderDef}`, borderRadius: 7, padding: '9px 12px', outline: 'none', letterSpacing: '-0.01em',
      }}
      onFocus={e => e.currentTarget.style.borderColor = C.amberBorder}
      onBlur={e => e.currentTarget.style.borderColor = C.borderDef} />
  );
}

function MFieldLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4, marginBottom: 8 }}>{children}</div>;
}

// ─── Manage page shell (header + relative body) ───────────────────────────────
function ManageShell({ title, subtitle, primary, crossLabel, crossTo, children }) {
  const app = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: C.bgBase }}>
      <div style={{ padding: '18px 24px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: C.fg1, letterSpacing: '-0.02em' }}>{title}</h1>
            <p title={typeof subtitle === 'string' ? subtitle : undefined} style={{ fontSize: 13, color: C.fg3, marginTop: 3, maxWidth: 580, textWrap: 'pretty', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{subtitle}</p>
          </div>

          {primary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {primary}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

// Shared table head cell
function Th({ children, w, right }) {
  return <div style={{ width: w, flex: w ? 'none' : 1, textAlign: right ? 'right' : 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4 }}>{children}</div>;
}

// ════════════════════════════════════════════════════════════════════════════
// TAB STRIP — splits each management page into Records (the table) + Analytics
// ════════════════════════════════════════════════════════════════════════════
function ManageTab({ tab, on, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px 12px', marginBottom: -1,
      background: 'transparent', border: 'none', borderBottom: `2px solid ${on ? C.amber : 'transparent'}`,
      cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: on ? 600 : 500, letterSpacing: '-0.01em',
      color: on ? C.fg1 : hov ? C.fg2 : C.fg3, transition: 'color 150ms ease-out',
    }}>
      <Icon name={tab.icon} size={15} color={on ? C.amber : 'currentColor'} />
      {tab.label}
    </button>
  );
}
function ManageTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 24px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0 }}>
      {tabs.map(t => <ManageTab key={t.id} tab={t} on={t.id === active} onClick={() => onChange(t.id)} />)}
    </div>
  );
}

// ─── Analytics layout primitives ──────────────────────────────────────────────
function AScroll({ children }) {
  return <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>;
}
function AStatStrip({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 16, flexShrink: 0 }}>{children}</div>;
}
function AStat({ value, label, color }) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 700, color: color || C.fg1, letterSpacing: '-0.02em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 12, color: C.fg3, marginTop: 7 }}>{label}</div>
    </div>
  );
}
function AGrid({ children, cols, style }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols || 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, ...style }}>{children}</div>;
}
function APanel({ title, right, children, style }) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.fg1 }}>{title}</span>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </div>
  );
}

// ─── Analytics chart primitives ───────────────────────────────────────────────
// Ranked horizontal bars: { label, value, color }
function HBarList({ rows, fmt, labelW = 116, empty }) {
  if (!rows || !rows.length) return <div style={{ fontSize: 12.5, color: C.fg3, padding: '6px 0' }}>{empty || 'No data'}</div>;
  const mx = Math.max(1, ...rows.map(r => r.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, boxShadow: `0 0 5px ${r.color}80`, flexShrink: 0 }} />
          <span title={r.label} style={{ width: labelW, flexShrink: 0, fontSize: 12.5, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', minWidth: 24 }}>
            <div style={{ width: `${Math.max(2, r.value / mx * 100)}%`, height: '100%', background: r.color, opacity: 0.85, borderRadius: 3, boxShadow: `0 0 8px ${r.color}40`, transition: 'width 400ms ease-out' }} />
          </div>
          <span style={{ width: 52, textAlign: 'right', flexShrink: 0, fontFamily: MONO, fontSize: 12, color: C.fg1 }}>{fmt ? fmt(r.value) : r.value}</span>
        </div>
      ))}
    </div>
  );
}

// Donut ring: segments { label, value, color }
function Donut({ segments, size = 120, thickness = 17, centerValue, centerLabel }) {
  const segs = (segments || []).filter(s => s.value > 0);
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {segs.map((s, i) => {
        const len = s.value / total * circ;
        const gap = segs.length > 1 ? 2.5 : 0;
        const dash = Math.max(0.5, len - gap);
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`} />
        );
        acc += len;
        return el;
      })}
      {centerValue != null && <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize="19" fontWeight="700" fill={C.fg1}>{centerValue}</text>}
      {centerLabel && <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize="10" fill={C.fg4}>{centerLabel}</text>}
    </svg>
  );
}
function DonutLegend({ segments, fmt }) {
  const segs = (segments || []).filter(s => s.value > 0);
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 120, flex: 1 }}>
      {segs.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0, boxShadow: `0 0 5px ${s.color}70` }} />
          <span style={{ flex: 1, fontSize: 12.5, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.fg1 }}>{fmt ? fmt(s.value) : s.value}</span>
          <span style={{ width: 30, textAlign: 'right', fontFamily: MONO, fontSize: 11, color: C.fg4 }}>{Math.round(s.value / total * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// Diverging sentiment bars: rows { label, value(-1..1), color }
function SentBars({ rows }) {
  if (!rows || !rows.length) return <div style={{ fontSize: 12.5, color: C.fg3 }}>No data</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((c, i) => {
        const pos = c.value >= 0, barPct = Math.min(1, Math.abs(c.value)) * 90;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}80`, flexShrink: 0 }} />
            <span title={c.label} style={{ width: 116, flexShrink: 0, fontSize: 12.5, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.14)' }} />
              <div style={{ position: 'absolute', top: 0, height: '100%', ...(pos ? { left: '50%' } : { right: '50%' }), width: `${barPct / 2}%`, background: pos ? `${C.emerald}45` : `${C.rose}45`, borderRadius: pos ? '0 3px 3px 0' : '3px 0 0 3px', borderRight: pos ? `1.5px solid ${C.emerald}` : 'none', borderLeft: !pos ? `1.5px solid ${C.rose}` : 'none' }} />
            </div>
            <span style={{ width: 46, textAlign: 'right', fontFamily: MONO, fontSize: 12, color: pos ? C.emerald : C.rose, flexShrink: 0 }}>{(pos ? '+' : '−') + Math.abs(c.value).toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared row overflow-menu item (mirrors Nodes/Sources menus) ──────────────
function MMenuItem({ icon, label, onClick, danger, chevron }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 9px', borderRadius: 6,
      background: hov ? C.bgHover : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
      color: danger ? C.rose : C.fg1,
    }}>
      <Icon name={icon} size={14} color={danger ? C.rose : C.fg2} />
      <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
      {chevron && <Icon name="chevron-right" size={13} color={C.fg4} />}
    </button>
  );
}

// Row overflow menu for a category row — same affordance as Nodes/Sources rows.
function ClusterRowMenu({ cat, stats, onSplit }) {
  const [open, setOpen] = React.useState(false);
  const [dissolve, setDissolve] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <IconBtn name="more-horizontal" size={28} iconSize={15} onClick={() => { setOpen(o => !o); setDissolve(false); }} />
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 32, right: 0, width: 176, padding: 6 }}>
        <MMenuItem icon="hash" label="Split category" onClick={() => { onSplit(); setOpen(false); }} />
        <div style={{ height: 1, background: C.borderSubtle, margin: '5px 4px' }} />
        <MMenuItem icon="trash-2" label="Dissolve" danger onClick={() => { setOpen(false); setDissolve(true); }} />
      </Popover>
      {dissolve && <DissolvePopover cat={cat} stats={stats} onClose={() => setDissolve(false)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CLUSTERS MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════════════════════
function ClustersManageScreen() {
  const app = useApp();
  const [tab, setTab] = React.useState('records');
  const [sel, setSel] = React.useState(() => new Set());
  const [query, setQuery] = React.useState('');
  const [newOpen, setNewOpen] = React.useState(false);
  const [splitCat, setSplitCat] = React.useState(null);

  const cats = app.cats;
  const q = query.trim().toLowerCase();
  const visibleCats = q ? cats.filter(c => c.label.toLowerCase().includes(q)) : cats;
  const tw = app.tweaks;
  const padY = ({ compact: 8, regular: 12, comfy: 16 })[tw.density] || 12;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSel(new Set()); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  // prune selection of removed cats
  React.useEffect(() => { setSel(prev => { const next = new Set([...prev].filter(k => cats.some(c => c.key === k))); return next.size === prev.size ? prev : next; }); }, [cats]);

  const toggle = (key) => setSel(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const allSel = visibleCats.length > 0 && visibleCats.every(c => sel.has(c.key));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(visibleCats.map(c => c.key)));

  const selList = cats.filter(c => sel.has(c.key));
  const mergeTarget = selList[0];

  return (
    <ManageShell
      title="Manage categories"
      subtitle="Rename, recolor, merge, split or dissolve categories; changes restyle the network instantly."
      crossLabel="Manage nodes" crossTo="nodes"
      primary={<Btn variant="primary" size="md" onClick={() => setNewOpen(true)}>New category</Btn>}>

      <ManageTabs
        tabs={[{ id: 'records', label: 'Categories', icon: 'list', count: cats.length }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' }]}
        active={tab} onChange={(t) => { if (t === 'analytics') setSel(new Set()); setTab(t); }} />

      {tab === 'analytics' ? <ClustersAnalytics app={app} /> : <>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px 12px', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="search" size={14} color={C.fg3} /></span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter categories…"
            style={{ width: '100%', font: `400 13px ${FONT}`, color: C.fg1, background: C.bgElevated, border: `1px solid ${C.borderDef}`, borderRadius: 7, padding: '8px 12px 8px 32px', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = C.amberBorder}
            onBlur={e => e.currentTarget.style.borderColor = C.borderDef} />
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.fg3, fontFamily: MONO }}>{visibleCats.length} of {cats.length} categories</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 9px', borderBottom: `1px solid ${C.borderSubtle}`, position: 'sticky', top: 0, background: C.bgBase, zIndex: 2 }}>
          <MCheck checked={allSel} indeterminate={sel.size > 0 && !allSel} onChange={toggleAll} />
          <Th>Category</Th>
          <Th w={90} right>Topics</Th>
          <Th w={100} right>Sources</Th>
          {tw.showSentiment && <Th w={100} right>Sentiment</Th>}
          <Th w={40}>{''}</Th>
        </div>

        {visibleCats.map((c, idx) => {
          const st = catStats(app.gnodes, c.key);
          const on = sel.has(c.key);
          const zebra = tw.zebra && idx % 2 === 1;
          return (
            <div key={c.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: `${padY}px 12px`,
              borderBottom: `1px solid ${C.borderSubtle}`,
              background: on ? C.bgSelected : zebra ? 'rgba(255,255,255,0.018)' : 'transparent',
              boxShadow: on ? `inset 2px 0 0 ${C.amber}` : 'none',
            }}>
              <MCheck checked={on} onChange={() => toggle(c.key)} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <ColorSwatch color={c.color} onPick={(col) => app.recolorCat(c.key, col)} />
                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <EditableText value={c.label} onCommit={(v) => app.renameCat(c.key, v)} size={13.5} weight={500} />
                </div>
              </div>
              <div style={{ width: 90, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.fg2 }}>{st.count}</div>
              <div style={{ width: 100, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.fg2 }}>{fmtK(st.docs)}</div>
              {tw.showSentiment && <div style={{ width: 100, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: st.sent >= 0 ? C.emerald : C.rose }}>{(st.sent >= 0 ? '+' : '−') + Math.abs(st.sent).toFixed(2)}</div>}
              <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>
                <ClusterRowMenu cat={c} stats={st} onSplit={() => setSplitCat(c)} />
              </div>
            </div>
          );
        })}

        {visibleCats.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No categories match.</div>
        )}
      </div>

      {/* Bulk bar */}
      {sel.size > 0 && (
        <MBulkBar count={sel.size} label={sel.size === 1 ? 'category selected' : 'categories selected'} onClear={() => setSel(new Set())}>
          <Btn variant="secondary" size="sm" icon="layers" disabled={sel.size < 2}
            onClick={() => { app.mergeCats(selList.map(c => c.key), mergeTarget.key); setSel(new Set()); }}>
            {sel.size < 2 ? 'Merge' : `Merge into ${mergeTarget.label}`}
          </Btn>
        </MBulkBar>
      )}
      </>}

      {/* New category modal */}
      {newOpen && <NewCategoryModal onClose={() => setNewOpen(false)} />}
      {/* Split modal */}
      {splitCat && <SplitCategoryModal cat={splitCat} onClose={() => setSplitCat(null)} />}
    </ManageShell>
  );
}

function DissolvePopover({ cat, stats, onClose }) {
  const app = useApp();
  const others = app.cats.filter(c => c.key !== cat.key);
  const [moveTo, setMoveTo] = React.useState(others[0] ? others[0].key : '');
  const has = stats.count > 0;
  return (
    <Popover open onClose={onClose} style={{ top: 38, right: 0, width: 248, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.fg1, marginBottom: 6 }}>Dissolve “{cat.label}”?</div>
      {has ? (
        <>
          <p style={{ fontSize: 11.5, color: C.fg3, lineHeight: 1.5, marginBottom: 10 }}>{stats.count} node{stats.count > 1 ? 's' : ''} need a category. Move them to:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12, maxHeight: 168, overflowY: 'auto' }}>
            {others.map(o => (
              <button key={o.key} onClick={() => setMoveTo(o.key)} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                background: moveTo === o.key ? C.bgSelected : 'transparent', border: `1px solid ${moveTo === o.key ? C.amberBorder : 'transparent'}`,
                fontFamily: FONT, textAlign: 'left',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: o.color, boxShadow: `0 0 6px ${o.color}80` }} />
                <span style={{ flex: 1, fontSize: 12.5, color: C.fg1 }}>{o.label}</span>
                {moveTo === o.key && <Icon name="check" size={12} color={C.amber} strokeWidth={3} />}
              </button>
            ))}
            <button onClick={() => setMoveTo('')} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
              background: moveTo === '' ? C.bgSelected : 'transparent', border: `1px solid ${moveTo === '' ? C.amberBorder : 'transparent'}`,
              fontFamily: FONT, textAlign: 'left',
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.fg3 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: C.fg2 }}>Leave uncategorized</span>
              {moveTo === '' && <Icon name="check" size={12} color={C.amber} strokeWidth={3} />}
            </button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 11.5, color: C.fg3, lineHeight: 1.5, marginBottom: 12 }}>This category has no nodes. It will be removed.</p>
      )}
      <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" size="sm" onClick={() => { app.deleteCat(cat.key, has ? (moveTo || null) : null); onClose(); }}>Dissolve</Btn>
      </div>
    </Popover>
  );
}

function NewCategoryModal({ onClose }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(PALETTE[0]);
  const create = () => { app.createCat(name, color); onClose(); };
  return (
    <MModal title="New category" subtitle="Categories drive node color. You can assign nodes after creating it."
      onClose={onClose}
      footer={<><Btn variant="ghost" size="md" onClick={onClose}>Cancel</Btn><Btn variant="primary" size="md" onClick={create}>Create category</Btn></>}>
      <MFieldLabel>Name</MFieldLabel>
      <div style={{ marginBottom: 18 }}><MInput value={name} onChange={setName} placeholder="e.g. Hardware & chips" autoFocus onEnter={create} /></div>
      <MFieldLabel>Color</MFieldLabel>
      <ColorGrid value={color} onPick={setColor} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 20, padding: '12px 14px', background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}88)`, boxShadow: `0 0 16px ${color}55`, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.fg1 }}>{name.trim() || 'New category'}</div>
          <div style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>preview — nodes will glow this color</div>
        </div>
      </div>
    </MModal>
  );
}

function SplitCategoryModal({ cat, onClose }) {
  const app = useApp();
  const members = app.gnodes.filter(n => n.cluster === cat.key);
  const [picked, setPicked] = React.useState(() => new Set());
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(PALETTE.find(c => c !== cat.color) || PALETTE[1]);
  const toggle = (id) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const canSplit = picked.size > 0 && picked.size < members.length;
  const split = () => { if (!canSplit) return; app.splitCat(cat.key, [...picked], name, color); onClose(); };
  return (
    <MModal title={`Split “${cat.label}”`} width={520}
      subtitle="Pick nodes to move into a new category. The rest stay where they are."
      onClose={onClose}
      footer={<><Btn variant="ghost" size="md" onClick={onClose}>Cancel</Btn><Btn variant="primary" size="md" disabled={!canSplit} onClick={split}>Split {picked.size || ''} node{picked.size === 1 ? '' : 's'} out</Btn></>}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <MFieldLabel>New category name</MFieldLabel>
          <MInput value={name} onChange={setName} placeholder="e.g. Transformers" autoFocus />
        </div>
        <div>
          <MFieldLabel>Color</MFieldLabel>
          <div style={{ position: 'relative' }}><ColorSwatch color={color} onPick={setColor} size={36} /></div>
        </div>
      </div>
      <MFieldLabel>Nodes in “{cat.label}” ({members.length})</MFieldLabel>
      <div style={{ border: `1px solid ${C.borderSubtle}`, borderRadius: 8, maxHeight: 240, overflowY: 'auto' }}>
        {members.map(n => {
          const on = picked.has(n.id);
          return (
            <button key={n.id} onClick={() => toggle(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px',
              borderBottom: `1px solid ${C.borderSubtle}`, background: on ? `${color}10` : 'transparent',
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
            }}>
              <MCheck checked={on} onChange={() => toggle(n.id)} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: on ? color : cat.color, boxShadow: `0 0 6px ${(on ? color : cat.color)}80`, transition: 'all 150ms ease-out' }} />
              <span style={{ flex: 1, fontSize: 13, color: C.fg1 }}>{n.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.fg4 }}>{fmtK(n.docs)}</span>
            </button>
          );
        })}
        {members.length === 0 && <div style={{ padding: 16, fontSize: 12, color: C.fg3 }}>No nodes in this category.</div>}
      </div>
      {picked.size >= members.length && members.length > 0 && (
        <p style={{ fontSize: 11.5, color: C.amber, marginTop: 10 }}>Keep at least one node in the original category.</p>
      )}
    </MModal>
  );
}

// ─── Clusters analytics view ──────────────────────────────────────────────────
function ClustersAnalytics({ app }) {
  const vp = useViewport();
  const cats = app.cats;
  const rows = cats.map(c => ({ ...c, ...catStats(app.gnodes, c.key) }));
  const totalNodes = app.gnodes.length;
  const totalDocs = rows.reduce((a, r) => a + r.docs, 0);
  const avgSent = totalNodes ? app.gnodes.reduce((a, n) => a + n.sentiment, 0) / totalNodes : 0;

  const byNodes = [...rows].sort((a, b) => b.count - a.count).map(r => ({ label: r.label, value: r.count, color: r.color }));
  const docSeg = [...rows].sort((a, b) => b.docs - a.docs).map(r => ({ label: r.label, value: r.docs, color: r.color }));
  const sentRows = [...rows].filter(r => r.count > 0).sort((a, b) => b.sent - a.sent).map(r => ({ label: r.label, value: r.sent, color: r.color }));

  return (
    <AScroll>
      <AStatStrip>
        <AStat value={cats.length} label="Categories" />
        <AStat value={totalNodes} label="Nodes mapped" />
        <AStat value={fmtK(totalDocs)} label="Documents" color={CLUSTER_COLORS.cyan} />
        <AStat value={(avgSent >= 0 ? '+' : '−') + Math.abs(avgSent).toFixed(2)} label="Avg sentiment" color={avgSent >= 0 ? C.emerald : C.rose} />
      </AStatStrip>
      <AGrid cols={vp.isMobile ? '1fr' : '1.4fr 1fr'}>
        <APanel title="Nodes per category" right={<span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>{totalNodes} total</span>}>
          <HBarList rows={byNodes} empty="No categories yet" />
        </APanel>
        <APanel title="Document share">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Donut segments={docSeg} centerValue={fmtK(totalDocs)} centerLabel="documents" />
            <DonutLegend segments={docSeg} fmt={fmtK} />
          </div>
        </APanel>
      </AGrid>
      <APanel title="Sentiment by category" right={<span style={{ fontSize: 11, color: C.fg4 }}>diverging from 0</span>}>
        <SentBars rows={sentRows} />
      </APanel>
    </AScroll>
  );
}

Object.assign(window, {
  PALETTE, fmtK, catStats, Popover, EditableText, ColorGrid, ColorSwatch, MCheck, MBulkBar, MModal, MInput, MFieldLabel, ManageShell, Th,
  ManageTabs, AScroll, AStatStrip, AStat, AGrid, APanel, HBarList, Donut, DonutLegend, SentBars,
  ClustersManageScreen, ClustersAnalytics,
});
