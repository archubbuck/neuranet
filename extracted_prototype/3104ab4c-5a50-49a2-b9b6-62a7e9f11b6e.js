// TopicNet Prototype — Network explorer: clusters panel, pan/zoom graph, slide-in detail
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

// ─── Cluster counts (computed from live workspace state) ─────────────────────
function clusterList(cats, nodes) {
  const counts = {};
  nodes.forEach(n => { counts[n.cluster] = (counts[n.cluster] || 0) + 1; });
  return cats.map(c => ({ key: c.key, label: c.label, color: c.color, count: counts[c.key] || 0 }));
}

// ─── Clusters / sources inspector panel ──────────────────────────────────────
function ClustersPanel({ mobileOpen, onClose }) {
  const app = useApp();
  const vp = useViewport();
  const [tab, setTab] = React.useState('clusters');
  const active = app.filterClusters; // null = all
  const CL = clusterList(app.cats, app.gnodes);
  const maxCount = Math.max(1, ...CL.map(c => c.count));

  const toggle = (key) => {
    const cur = active ? new Set(active) : null;
    if (!cur) { app.setFilters(new Set([key])); return; }
    if (cur.has(key)) { cur.delete(key); app.setFilters(cur.size ? cur : null); }
    else { cur.add(key); app.setFilters(cur); }
  };

  const TabBtn = ({ id, label, count }) => {
    const on = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '11px 0 10px', background: 'none', cursor: 'pointer',
        border: 'none', borderBottom: `2px solid ${on ? C.amber : 'transparent'}`, marginBottom: -1,
        fontFamily: FONT, fontSize: 12.5, fontWeight: on ? 600 : 400, color: on ? C.fg1 : C.fg3,
        transition: 'color 150ms ease-out',
      }}>
        {label}
        <span style={{
          padding: '1px 6px', borderRadius: 999, fontSize: 10, fontFamily: MONO,
          background: on ? C.amberDim : 'rgba(255,255,255,0.05)',
          color: on ? C.amber : C.fg4, border: `1px solid ${on ? C.amberBorder : C.borderSubtle}`,
        }}>{count}</span>
      </button>
    );
  };

  const panelStyle = {
    position: 'absolute', top: 0, left: 0, height: '100%', width: 'min(300px, 84%)', zIndex: 40,
    display: 'flex', flexDirection: 'column', background: C.bgSurface, borderRight: `1px solid ${C.borderDef}`,
    overflow: 'hidden', boxShadow: '12px 0 40px rgba(0,0,0,0.5)',
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-110%)', transition: 'transform 280ms ease-out',
  };
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 39, background: 'rgba(6,9,15,0.5)', backdropFilter: 'blur(2px)',
        opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none', transition: 'opacity 280ms ease-out',
      }} />
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 10px 14px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.fg1 }}>Filter network</span>
        <IconBtn name="x" size={28} iconSize={15} onClick={onClose} />
      </div>
      <div style={{ display: 'flex', padding: '0 6px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0 }}>
        <TabBtn id="clusters" label="Groups" count={CL.length} />
        <TabBtn id="sources" label="Sources" count={SOURCES_DATA.length} />
      </div>

      {tab === 'clusters' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          <div onClick={() => app.setFilters(null)} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 6, cursor: 'pointer',
            background: !active ? C.bgSelected : 'transparent',
            borderLeft: `2px solid ${!active ? C.amber : 'transparent'}`, marginBottom: 4,
          }}>
            <Icon name="layers" size={13} color={!active ? C.amber : C.fg3} />
            <span style={{ flex: 1, fontSize: 12.5, color: !active ? C.fg1 : C.fg2 }}>All groups</span>
            <span style={{ fontSize: 11, fontFamily: MONO, color: C.fg4 }}>{app.gnodes.length}</span>
          </div>
          {CL.map(c => {
            const on = active && active.has(c.key);
            return (
              <div key={c.key} onClick={() => toggle(c.key)} style={{
                padding: '8px 9px 9px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: on ? `${c.color}12` : 'transparent',
                borderLeft: `2px solid ${on ? c.color : 'transparent'}`,
                transition: 'background 150ms ease-out',
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = C.bgHover; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}90`, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: on ? C.fg1 : C.fg2, fontWeight: on ? 500 : 400, lineHeight: 1.2 }}>{c.label}</span>
                  <span style={{ fontSize: 11, fontFamily: MONO, color: C.fg4 }}>{c.count}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginLeft: 17, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.count / maxCount * 100}%`, background: c.color, opacity: on ? 1 : 0.4, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
          {active && (
            <button onClick={() => app.setFilters(null)} style={{
              margin: '10px 9px 0', fontSize: 11, color: C.amber, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: FONT, padding: 0,
            }}>Clear filter ({active.size})</button>
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {SOURCES_DATA.map(s => {
            const kd = srcKind(s);
            const fname = (FEED_BY_ID[s.feed] || {}).name || s.feed;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                borderBottom: `1px solid ${C.borderSubtle}`,
              }}>
                <SourceGlyph kind={kd} size={22} radius={5} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: C.fg4, fontFamily: MONO, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kd.label} · {fname}</div>
                </div>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: s.status === 'ready' ? C.emerald : s.status === 'ingesting' ? C.amber : s.status === 'error' ? C.rose : C.fg3,
                  boxShadow: s.status === 'ingesting' ? `0 0 5px ${C.amber}` : 'none',
                }} />
              </div>
            );
          })}
          <div style={{ padding: 10 }}>
            <Btn variant="secondary" size="sm" icon="plus" onClick={() => app.setAddSrc(true)} style={{ width: '100%' }}>Add source</Btn>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ─── Pan/zoom network graph ──────────────────────────────────────────────────
const VW = 960, VH = 560;

function NetworkGraph() {
  const app = useApp();
  const { selectedNodeId, filterClusters } = app;
  const nodes = app.gnodes;
  const byId = React.useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);
  const edges = React.useMemo(() => deriveEdges(nodes), [nodes]);
  const [hover, setHover] = React.useState(null);
  const [view, setView] = React.useState({ scale: 1, x: 0, y: 0 });
  const [mounted, setMounted] = React.useState(false);
  const drag = React.useRef(null);

  React.useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  // Expose zoom controls to sibling via app-less local handlers passed through context-free ref
  React.useEffect(() => { window.__tnZoom = (f) => setView(v => ({ ...v, scale: Math.max(0.5, Math.min(2.4, v.scale * f)) })); window.__tnZoomReset = () => setView({ scale: 1, x: 0, y: 0 }); }, []);

  const dim = (n) => filterClusters && !filterClusters.has(n.cluster);
  const isNeighbor = (id) => {
    if (hover == null && selectedNodeId == null) return false;
    const focus = hover ?? selectedNodeId;
    const fn = byId[focus];
    return fn && (id === focus || fn.connections.includes(id) || byId[id]?.connections.includes(focus));
  };
  const anyFocus = hover != null || selectedNodeId != null;

  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.08 : 0.926;
    setView(v => ({ ...v, scale: Math.max(0.5, Math.min(2.4, v.scale * f)) }));
  };
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y }; };
  const onMove = (e) => {
    if (!drag.current) return;
    setView(v => ({ ...v, x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }));
  };
  const onUp = () => { drag.current = null; };

  // Touch: single-finger pan, two-finger pinch zoom
  const pinch = React.useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      drag.current = { x: t.clientX, y: t.clientY, ox: view.x, oy: view.y };
    } else if (e.touches.length === 2) {
      drag.current = null;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinch.current = { d, scale: view.scale };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinch.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const f = d / (pinch.current.d || 1);
      setView(v => ({ ...v, scale: Math.max(0.5, Math.min(2.4, pinch.current.scale * f)) }));
    } else if (e.touches.length === 1 && drag.current) {
      const t = e.touches[0];
      setView(v => ({ ...v, x: drag.current.ox + (t.clientX - drag.current.x), y: drag.current.oy + (t.clientY - drag.current.y) }));
    }
  };
  const onTouchEnd = (e) => { if (e.touches.length === 0) { drag.current = null; pinch.current = null; } };

  return (
    <div
      onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
          <pattern id="tn-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.045)" />
          </pattern>
          <radialGradient id="tn-vignette" cx="50%" cy="46%" r="65%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(6,9,15,0.55)" />
          </radialGradient>
        </defs>
        <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#tn-grid)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale}) translate(${VW * (1 - view.scale) / 2 / view.scale} ${VH * (1 - view.scale) / 2 / view.scale})`}
           style={{ transformOrigin: 'center' }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const faded = dim(e.from) || dim(e.to);
            const lit = anyFocus && (isNeighbor(e.from.id) && isNeighbor(e.to.id) && (e.from.id === (hover ?? selectedNodeId) || e.to.id === (hover ?? selectedNodeId)));
            return (
              <line key={i} x1={e.from.cx} y1={e.from.cy} x2={e.to.cx} y2={e.to.cy}
                stroke={lit ? app.catColor(e.from.cluster) : 'rgba(255,255,255,0.13)'}
                strokeWidth={lit ? 1.4 : 1}
                opacity={faded ? 0.04 : anyFocus && !lit ? 0.10 : 0.5}
                style={{ transition: 'opacity 200ms ease-out, stroke 200ms ease-out' }} />
            );
          })}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const color = app.catColor(n.cluster);
            const sel = selectedNodeId === n.id;
            const hov = hover === n.id;
            const faded = dim(n);
            const neighbor = isNeighbor(n.id);
            const muted = anyFocus && !neighbor;
            const op = faded ? 0.08 : muted ? 0.28 : 1;
            const scale = mounted ? 1 : 0;
            return (
              <g key={n.id}
                onClick={(ev) => { ev.stopPropagation(); app.selectNode(sel ? null : n.id); }}
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                style={{
                  cursor: 'pointer', opacity: op,
                  transition: `opacity 220ms ease-out, transform 420ms cubic-bezier(.2,.8,.2,1) ${i * 28}ms`,
                  transform: `scale(${scale})`, transformOrigin: `${n.cx}px ${n.cy}px`,
                }}>
                {sel && <circle cx={n.cx} cy={n.cy} r={n.r + 11} fill="none" stroke={C.amber} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.8" />}
                <circle cx={n.cx} cy={n.cy} r={n.r + (sel || hov ? 12 : 8)} fill={color} opacity={sel || hov ? 0.2 : 0.09}
                  style={{ transition: 'r 200ms ease-out, opacity 200ms ease-out' }} />
                <circle cx={n.cx} cy={n.cy} r={n.r} fill={color} fillOpacity={0.92} stroke={color} strokeWidth="1.5" strokeOpacity={0.5}
                  style={{ filter: (sel || hov) ? `drop-shadow(0 0 10px ${color})` : 'none' }} />
                <circle cx={n.cx - n.r * 0.32} cy={n.cy - n.r * 0.32} r={n.r * 0.28} fill="rgba(255,255,255,0.35)" />
                {(!muted || sel || hov) && !faded && (
                  <text x={n.cx} y={n.cy + n.r + 13} textAnchor="middle"
                    fontSize={Math.max(9.5, Math.min(12, n.r * 0.62))} fontFamily={FONT} fontWeight={sel ? 600 : 400}
                    fill={sel || hov ? C.fg1 : C.fg2} style={{ pointerEvents: 'none', userSelect: 'none' }}>{n.label}</text>
                )}
              </g>
            );
          })}
        </g>
        <rect x="0" y="0" width={VW} height={VH} fill="url(#tn-vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}

// ─── Canvas overlays ─────────────────────────────────────────────────────────
function StatsBar() {
  const app = useApp();
  const allNodes = app.gnodes;
  const visible = app.filterClusters
    ? allNodes.filter(n => app.filterClusters.has(n.cluster)).length
    : allNodes.length;
  const allDocs = allNodes.reduce((a, n) => a + n.docs, 0) || 1;
  const visDocs = app.filterClusters
    ? allNodes.filter(n => app.filterClusters.has(n.cluster)).reduce((a, n) => a + n.docs, 0)
    : allDocs;
  // Scale the canonical workspace total by the visible fraction so the unfiltered
  // readout is exactly SOURCES_TOTAL — matching the topbar and the Sources page.
  const sources = Math.round(SOURCES_TOTAL * (visDocs / allDocs));
  const fmtK = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  const Stat = ({ v, l }) => (
    <span style={{ fontSize: 11.5 }}><span style={{ color: C.fg1, fontWeight: 600, fontFamily: MONO }}>{v}</span> <span style={{ color: C.fg3 }}>{l}</span></span>
  );
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: 11, padding: '7px 15px', borderRadius: 999,
      background: 'rgba(11,17,32,0.86)', border: `1px solid ${C.borderDef}`, backdropFilter: 'blur(8px)',
      boxShadow: C.shadowMd || '0 4px 12px rgba(0,0,0,0.5)',
    }}>
      <Stat v={visible} l={visible === 1 ? 'node' : 'nodes'} />
      <span style={{ color: C.fg4 }}>·</span>
      <Stat v={fmtK(sources)} l="sources" />
    </div>
  );
}

function ZoomControls() {
  const btn = {
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: C.fg2, background: 'transparent', border: 'none', transition: 'all 150ms ease-out',
  };
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 5,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(11,17,32,0.86)', border: `1px solid ${C.borderDef}`, borderRadius: 8,
      backdropFilter: 'blur(8px)', overflow: 'hidden',
    }}>
      <button title="Zoom in" style={btn} onMouseEnter={e => e.currentTarget.style.background = C.bgHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => window.__tnZoom(1.2)}><Icon name="plus" size={15} /></button>
      <div style={{ height: 1, background: C.borderSubtle }} />
      <button title="Zoom out" style={btn} onMouseEnter={e => e.currentTarget.style.background = C.bgHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => window.__tnZoom(0.83)}><Icon name="minus" size={15} /></button>
      <div style={{ height: 1, background: C.borderSubtle }} />
      <button title="Reset view" style={btn} onMouseEnter={e => e.currentTarget.style.background = C.bgHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => window.__tnZoomReset()}><Icon name="maximize" size={14} /></button>
    </div>
  );
}

function Legend() {
  const app = useApp();
  const CL = clusterList(app.cats, app.gnodes);
  return (
    <div style={{
      position: 'absolute', top: 14, right: 14, zIndex: 5, maxWidth: 168,
      padding: '11px 13px', borderRadius: 8,
      background: 'rgba(11,17,32,0.82)', border: `1px solid ${C.borderDef}`, backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.fg4, marginBottom: 9 }}>Groups</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {CL.map(c => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}80`, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: C.fg3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Idle hint when nothing selected ─────────────────────────────────────────
function IdleHint() {
  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 4,
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999,
      background: 'rgba(11,17,32,0.7)', border: `1px solid ${C.borderSubtle}`, backdropFilter: 'blur(6px)',
      pointerEvents: 'none',
    }}>
      <Icon name="circle-dot" size={13} color={C.fg3} />
      <span style={{ fontSize: 12, color: C.fg3 }}>Select a node to explore · scroll to zoom · drag to pan</span>
    </div>
  );
}

Object.assign(window, { ClustersPanel, NetworkGraph, StatsBar, ZoomControls, Legend, IdleHint, clusterList });
