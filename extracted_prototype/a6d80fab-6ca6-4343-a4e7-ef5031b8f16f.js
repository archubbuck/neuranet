// TopicNet Prototype — app shell: global state, sidebar, top bar
// Depends on tn-core.jsx, tn-data.jsx

// ─── Global app state ────────────────────────────────────────────────────────
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

const LS_KEY = 'topicnet_proto_v1';

function AppProvider({ children }) {
  // Fixed table display settings (compact rows, zebra striping, sentiment column).
  const tw = { density: 'compact', zebra: true, showSentiment: true };
  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  })();

  const [hasData, setHasData]       = React.useState(persisted.hasData || false);
  const [screen, setScreenRaw]      = React.useState(persisted.screen || 'network');
  const [collapsed, setCollapsed]   = React.useState(persisted.collapsed || false);
  const [selectedNodeId, setSel]    = React.useState(null);
  const [detailView, setDetailView] = React.useState(null);   // null | 'panel' | 'full'
  const [addSourceOpen, setAddSrc]  = React.useState(false);
  const [settingsOpen, setSettings] = React.useState(false);
  const [ingesting, setIngesting]   = React.useState(null);   // null | { source, pct, docs, eta }
  const [toast, setToast]           = React.useState(null);
  const [filterClusters, setFilters]= React.useState(null);   // null = all, or Set of cluster keys
  const [sessionSources, setSessionSrc] = React.useState([]); // manually-added sources this session (newest first)
  const [sessionJobs, setSessionJobs]   = React.useState([]); // completed ingest jobs this session (newest first)
  const [toastAction, setToastAction]   = React.useState(null); // optional { label, onClick } shown in toast

  // ─── Editable workspace: clusters (= categories: name + color) and nodes ───
  const [cats, setCats] = React.useState(() => {
    const used = []; NETWORK_NODES.forEach(n => { if (!used.includes(n.cluster)) used.push(n.cluster); });
    return used.map(k => ({ key: k, label: CLUSTER_LABELS[k], color: CLUSTER_COLORS[k] }));
  });
  const [gnodes, setGnodes] = React.useState(() => NETWORK_NODES.map(n => ({ ...n, connections: [...n.connections] })));
  const catSeq = React.useRef(1);
  const nodeSeq = React.useRef(Math.max(...NETWORK_NODES.map(n => n.id)) + 1);
  const undoRef = React.useRef(null);
  const [canUndo, setCanUndo] = React.useState(false);

  const nodeById = React.useMemo(() => Object.fromEntries(gnodes.map(n => [n.id, n])), [gnodes]);
  const catColor = React.useCallback((key) => (cats.find(c => c.key === key) || {}).color || C.fg2, [cats]);
  const catLabel = React.useCallback((key) => (cats.find(c => c.key === key) || {}).label || 'Uncategorized', [cats]);
  const wctx = { nodes: gnodes, nodeById, catColor, catLabel, cats };

  // Persist a slice
  React.useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ hasData, screen, collapsed })); } catch (e) {}
  }, [hasData, screen, collapsed]);

  const setScreen = (s) => { setScreenRaw(s); setDetailView(null); setSel(null); };

  const selectNode = (id) => {
    if (id == null) { setSel(null); setDetailView(null); return; }
    setSel(id); setDetailView('panel');
  };
  const openFullDetail = (id) => { setSel(id ?? selectedNodeId); setDetailView('full'); };
  const closeDetail = () => { setDetailView(null); setSel(null); };

  const showToast = (msg) => { setToastAction(null); setToast(msg); setTimeout(() => setToast(null), 3200); };

  // ─── Undo (single level) + edit toast ───
  const snapshot = () => ({ cats: cats.map(c => ({ ...c })), gnodes: gnodes.map(n => ({ ...n, connections: [...n.connections] })) });
  const pushUndo = () => { undoRef.current = snapshot(); setCanUndo(true); };
  const undoEdit = () => {
    const s = undoRef.current; if (!s) return;
    setCats(s.cats); setGnodes(s.gnodes);
    undoRef.current = null; setCanUndo(false); setToast(null); setToastAction(null);
  };
  const editToast = (msg) => {
    setToast(msg); setToastAction({ label: 'Undo', onClick: undoEdit });
    setTimeout(() => { setToast(prev => prev === msg ? null : prev); setToastAction(a => a && a.label === 'Undo' ? null : a); }, 5200);
  };

  // ─── Cluster (category) operations ───
  const createCat = (label, color) => {
    pushUndo(); const key = 'c' + (catSeq.current++); const name = (label || '').trim() || 'New category';
    setCats(prev => [...prev, { key, label: name, color: color || CLUSTER_COLORS.cyan }]);
    editToast(`Created category “${name}”`); return key;
  };
  const renameCat = (key, label) => { pushUndo(); setCats(prev => prev.map(c => c.key === key ? { ...c, label } : c)); };
  const recolorCat = (key, color) => { pushUndo(); setCats(prev => prev.map(c => c.key === key ? { ...c, color } : c)); editToast('Recolored category'); };
  const deleteCat = (key, moveTo) => {
    pushUndo();
    setGnodes(prev => prev.map(n => n.cluster === key ? { ...n, cluster: moveTo || n.cluster } : n));
    setCats(prev => prev.filter(c => c.key !== key));
    editToast(moveTo ? 'Category dissolved — nodes reassigned' : 'Category dissolved');
  };
  const mergeCats = (keys, targetKey) => {
    pushUndo(); const set = new Set(keys.filter(k => k !== targetKey));
    setGnodes(prev => prev.map(n => set.has(n.cluster) ? { ...n, cluster: targetKey } : n));
    setCats(prev => prev.filter(c => !set.has(c.key)));
    editToast(`Merged ${set.size + 1} categories`);
  };
  const splitCat = (srcKey, nodeIds, label, color) => {
    pushUndo(); const key = 'c' + (catSeq.current++); const idset = new Set(nodeIds); const name = (label || '').trim() || 'New category';
    setCats(prev => [...prev, { key, label: name, color: color || CLUSTER_COLORS.violet }]);
    setGnodes(prev => prev.map(n => idset.has(n.id) ? { ...n, cluster: key } : n));
    editToast(`Split ${nodeIds.length} node${nodeIds.length > 1 ? 's' : ''} into “${name}”`); return key;
  };

  // ─── Node operations ───
  const reassignNodes = (ids, catKey) => {
    pushUndo(); const s = new Set(ids);
    setGnodes(prev => prev.map(n => s.has(n.id) ? { ...n, cluster: catKey } : n));
    editToast(`Reassigned ${ids.length} node${ids.length > 1 ? 's' : ''}`);
  };
  const renameNode = (id, label) => { pushUndo(); setGnodes(prev => prev.map(n => n.id === id ? { ...n, label } : n)); };
  const removeNodes = (ids) => {
    pushUndo(); const s = new Set(ids);
    setGnodes(prev => prev.filter(n => !s.has(n.id)).map(n => ({ ...n, connections: n.connections.filter(c => !s.has(c)) })));
    editToast(`Removed ${ids.length} node${ids.length > 1 ? 's' : ''}`);
  };
  const createNode = ({ label, cluster }) => {
    pushUndo(); const id = nodeSeq.current++; const name = (label || '').trim() || 'New topic';
    const nn = { id, label: name, cluster, r: 15, cx: 480 + (Math.random() * 120 - 60), cy: 280 + (Math.random() * 120 - 60), docs: 0, connections: [], sentiment: 0, sources: 0 };
    setGnodes(prev => [...prev, nn]);
    editToast(`Created node “${name}”`); return id;
  };
  const mergeNodes = (ids, keepId) => {
    pushUndo(); const keep = keepId != null ? keepId : ids[0]; const s = new Set(ids.filter(i => i !== keep));
    setGnodes(prev => {
      let docs = 0, sources = 0; const conn = new Set();
      prev.forEach(n => { if (n.id === keep || s.has(n.id)) { docs += n.docs; sources += n.sources; n.connections.forEach(c => conn.add(c)); } });
      return prev.filter(n => !s.has(n.id)).map(n => {
        if (n.id === keep) {
          const c = [...conn].filter(x => x !== keep && !s.has(x));
          return { ...n, docs, sources, connections: c, r: Math.min(28, n.r + 3) };
        }
        const remapped = n.connections.map(x => s.has(x) ? keep : x).filter((x, i, a) => x !== n.id && a.indexOf(x) === i);
        return { ...n, connections: remapped };
      });
    });
    editToast(`Merged ${ids.length} nodes`);
  };

  const resetWorkspace = () => {
    setHasData(false); setScreenRaw('network'); setSel(null); setDetailView(null);
    setSettings(false); setIngesting(null); setFilters(null);
    setSessionSrc([]); setSessionJobs([]);
    setCats(() => { const used = []; NETWORK_NODES.forEach(n => { if (!used.includes(n.cluster)) used.push(n.cluster); }); return used.map(k => ({ key: k, label: CLUSTER_LABELS[k], color: CLUSTER_COLORS[k] })); });
    setGnodes(NETWORK_NODES.map(n => ({ ...n, connections: [...n.connections] })));
    undoRef.current = null; setCanUndo(false);
  };

  // Commit a finished manual ingest: prepend the new source rows and log the job.
  const commitIngest = ({ sources, job }) => {
    if (sources && sources.length) setSessionSrc(prev => [...sources, ...prev]);
    if (job) setSessionJobs(prev => [job, ...prev]);
  };

  // Simulated ingestion of the first source → populates the workspace
  const startIngestion = (source) => {
    setAddSrc(false);
    setIngesting({ source, pct: 0, docs: 0, eta: '~2 min' });
  };

  // Drive the ingestion progress
  React.useEffect(() => {
    if (!ingesting) return;
    if (ingesting.pct >= 100) {
      const t = setTimeout(() => { setHasData(true); setIngesting(null); showToast('Workspace ready — 15 topics mapped across 6 groups'); }, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIngesting(prev => {
        if (!prev) return prev;
        const np = Math.min(100, prev.pct + (6 + Math.random() * 11));
        const etaSec = Math.round((100 - np) / 100 * 120);
        return { ...prev, pct: np, docs: Math.round(np / 100 * 5212), eta: np >= 100 ? 'finishing…' : `~${Math.max(1, Math.ceil(etaSec / 30)) * 30 >= 60 ? Math.ceil(etaSec/60)+' min' : etaSec+'s'}` };
      });
    }, 420);
    return () => clearTimeout(t);
  }, [ingesting]);

  const value = {
    hasData, setHasData, screen, setScreen, collapsed, setCollapsed,
    selectedNodeId, selectNode, detailView, openFullDetail, closeDetail, setDetailView,
    addSourceOpen, setAddSrc, settingsOpen, setSettings,
    ingesting, startIngestion, toast, toastAction, showToast, resetWorkspace,
    filterClusters, setFilters,
    sessionSources, sessionJobs, commitIngest,
    // editable workspace
    cats, gnodes, nodeById, wctx, catColor, catLabel, canUndo, undoEdit,
    createCat, renameCat, recolorCat, deleteCat, mergeCats, splitCat,
    reassignNodes, renameNode, removeNodes, createNode, mergeNodes,
    tableSettings: tw, tweaks: tw,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'network', icon: 'network',      label: 'Network' },
  { id: 'search',  icon: 'search',       label: 'Search' },
];
const MANAGE_NAV = [
  { id: 'clusters', icon: 'layers',      label: 'Categories' },
  { id: 'nodes',    icon: 'circle-dot',  label: 'Topics' },
  { id: 'feeds',    icon: 'database',    label: 'Sources' },
];

function SidebarItem({ item, active, collapsed, disabled, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div title={collapsed ? item.label : (disabled ? 'Add a source to unlock' : undefined)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '9px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? C.fg1 : disabled ? C.fg4 : hov ? C.fg2 : C.fg3,
        background: active ? 'rgba(255,255,255,0.05)' : hov && !disabled && !active ? C.bgHover : 'transparent',
        borderLeft: collapsed ? '2px solid transparent' : `2px solid ${active ? C.amber : 'transparent'}`,
        opacity: disabled ? 0.55 : 1,
        transition: 'all 150ms ease-out', userSelect: 'none', position: 'relative',
      }}>
      {collapsed && active && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: C.amber, borderRadius: 1 }} />}
      <Icon name={item.icon} size={16} color={active ? C.amber : 'currentColor'} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
    </div>
  );
}

function Sidebar() {
  const app = useApp();
  const { collapsed } = app;
  const navLocked = !app.hasData;
  const W = collapsed ? 56 : 216;
  return (
    <div style={{
      width: W, flexShrink: 0, height: '100%',
      background: C.bgSurface, borderRight: `1px solid ${C.borderSubtle}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'width 200ms ease-out',
    }}>
      {/* Logo */}
      <div style={{
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
        gap: 9, padding: collapsed ? 0 : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: `1px solid ${C.borderSubtle}`,
      }}>
        <div onClick={() => app.setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 24, height: 24, borderRadius: 5, flexShrink: 0,
            background: C.amberDim, border: `1px solid ${C.amberBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9.5, fontWeight: 700, color: C.amber,
            cursor: 'pointer', transition: 'opacity 150ms ease-out',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >TN</div>
        {!collapsed && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderSubtle}`, cursor: 'pointer', minWidth: 0,
          }}>
            <Icon name="layers" size={13} color={C.fg4} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.fg3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>AI Research 2026</span>
            <Icon name="chevron-down" size={12} color={C.fg4} />
          </div>
        )}
      </div>

      {/* Nav — single flat keyed list so React never reuses a DOM node across items */}
      <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {[
          { kind: 'label', id: 'lbl-workspace', text: 'Workspace' },
          ...NAV.map(i => ({ kind: 'item', ...i, disabled: navLocked && i.id !== 'network' })),
          { kind: 'label', id: 'lbl-manage', text: 'Manage' },
          ...MANAGE_NAV.map(i => ({ kind: 'item', ...i, disabled: navLocked })),
        ].map(entry => {
          if (entry.kind === 'label') {
            return collapsed
              ? <div key={entry.id} style={{ height: 1, background: C.borderSubtle, margin: '8px 8px' }} />
              : <div key={entry.id} style={{ fontSize: 9, fontWeight: 500, color: C.fg4, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 4px' }}>{entry.text}</div>;
          }
          return (
            <SidebarItem key={entry.id} item={entry} active={app.screen === entry.id && !app.detailView}
              collapsed={collapsed} disabled={entry.disabled}
              onClick={() => app.setScreen(entry.id)} />
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ padding: 8, borderTop: `1px solid ${C.borderSubtle}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SidebarItem item={{ id: 'settings', icon: 'settings', label: 'Settings' }} active={app.screen === 'settings' && !app.detailView}
          collapsed={collapsed} disabled={false} onClick={() => app.setScreen('settings')} />
      </div>
    </div>
  );
}

// ─── Global top bar ──────────────────────────────────────────────────────────
const SCREEN_TITLES = {
  network: 'Network explorer',
  sources: 'Sources',
  search:  'Search & query',
  reports: 'Analytics',
  settings: 'Settings',
  clusters: 'Manage groups',
  nodes: 'Manage nodes',
  feeds: 'Manage sources',
};

function AppTopbar() {
  const app = useApp();
  const vp = useViewport();
  const detail = app.detailView === 'full' && app.selectedNodeId ? getNodeDetail(app.selectedNodeId, app.wctx) : null;
  return (
    <div style={{
      height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: vp.isNarrow ? '0 12px' : '0 16px', background: C.bgBase, borderBottom: `1px solid ${C.borderSubtle}`,
    }}>
      {/* Mobile logo mark */}
      {vp.isMobile && (
        <div style={{
          width: 24, height: 24, borderRadius: 5, flexShrink: 0,
          background: C.amberDim, border: `1px solid ${C.amberBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9.5, fontWeight: 700, color: C.amber,
        }}>TN</div>
      )}
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: detail ? C.fg3 : C.fg2, fontWeight: detail ? 400 : 500, cursor: detail ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          onClick={detail ? () => app.closeDetail() : undefined}>
          {SCREEN_TITLES[app.screen]}
        </span>
        {detail && (
          <>
            <Icon name="chevron-right" size={13} color={C.fg4} />
            <span style={{ fontSize: 13, color: C.fg1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.label}</span>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {app.hasData && !vp.isMobile && <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>{(SOURCES_TOTAL / 1000).toFixed(1)}K sources</span>}

      {vp.isNarrow
        ? <IconBtn name="plus" size={32} iconSize={16} title="Add source" onClick={() => app.setAddSrc(true)} style={{ background: C.amber, border: 'none', color: C.fgOnAccent }} />
        : <Btn variant="primary" size="sm" icon="plus" onClick={() => app.setAddSrc(true)}>Add source</Btn>}
    </div>
  );
}

// ─── Mobile bottom navigation ────────────────────────────────────────────────
function MobileNav() {
  const app = useApp();
  const navLocked = !app.hasData;
  const items = [...NAV, { id: 'settings', icon: 'settings', label: 'Settings' }];
  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'stretch',
      background: C.bgSurface, borderTop: `1px solid ${C.borderDef}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {items.map(item => {
        const isSettings = item.id === 'settings';
        const active = app.screen === item.id && !app.detailView;
        const disabled = navLocked && !isSettings && item.id !== 'network';
        return (
          <button key={item.id} disabled={disabled}
            onClick={() => { if (disabled) return; app.setScreen(item.id); }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              padding: '9px 0 7px', background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
              color: active ? C.amber : disabled ? C.fg4 : C.fg3, opacity: disabled ? 0.5 : 1,
              fontFamily: FONT, position: 'relative', transition: 'color 150ms ease-out',
            }}>
            {active && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, background: C.amber, borderRadius: 1 }} />}
            <Icon name={item.icon} size={19} color="currentColor" />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast() {
  const app = useApp();
  const vp = useViewport();
  if (!app.toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: vp.isMobile ? 84 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9000,
      width: vp.isMobile ? 'calc(100vw - 32px)' : 'auto', maxWidth: 'calc(100vw - 32px)',
      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px 11px 16px', borderRadius: 8,
      background: C.bgOverlay, border: `1px solid ${C.borderDef}`, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'tnFadeUp 220ms ease-out',
    }}>
      <Icon name="check-circle" size={15} color={C.emerald} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: C.fg1 }}>{app.toast}</span>
      {app.toastAction && (
        <button onClick={app.toastAction.onClick} style={{
          marginLeft: 4, padding: '4px 11px', borderRadius: 6, cursor: 'pointer',
          background: C.amberDim, border: `1px solid ${C.amberBorder}`, color: C.amber,
          fontFamily: FONT, fontSize: 12, fontWeight: 600,
        }}>{app.toastAction.label}</button>
      )}
    </div>
  );
}

Object.assign(window, { AppCtx, useApp, AppProvider, Sidebar, AppTopbar, MobileNav, Toast });
