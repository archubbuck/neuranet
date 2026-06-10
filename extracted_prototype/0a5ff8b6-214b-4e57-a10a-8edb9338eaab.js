// TopicNet Prototype — Sources management page
// A *source* here is a feed/connector (a subreddit, a website/domain, or an
// upload batch) that streams documents into the network. This page manages the
// connectors — rename, repoint their default cluster, pause/resume, re-ingest,
// remove or connect a new one. Mirrors the Clusters & Nodes management pages.
// Depends on tn-core.jsx, tn-shell.jsx (useApp), tn-manage.jsx (shared primitives)

// ─── Feed (connector) kinds ──────────────────────────────────────────────────
const FEED_KINDS = {
  reddit: { id: 'reddit', label: 'Reddit',  icon: 'message-square', color: '#FF6040', hint: 'subreddit' },
  web:    { id: 'web',    label: 'Web',     icon: 'globe',          color: '#38BDF8', hint: 'site / domain' },
  upload: { id: 'upload', label: 'Uploads', icon: 'upload',         color: '#C084FC', hint: 'upload batch' },
};

// Seed connectors — documents sum to SOURCES_TOTAL (12,847) so the headline agrees.
const FEED_SEED = [
  { id: 'arxiv',  name: 'arxiv.org',         kind: 'web',    cluster: 'emerald', status: 'active', docs: 4200, rate: 410, last: '12 min ago' },
  { id: 'ml',     name: 'r/MachineLearning', kind: 'reddit', cluster: 'cyan',    status: 'active', docs: 2890, rate: 112, last: '4 min ago' },
  { id: 'hn',     name: 'Hacker News',       kind: 'web',    cluster: 'sky',     status: 'active', docs: 1420, rate: 29,  last: '3 hr ago' },
  { id: 'upload', name: 'Uploads',           kind: 'upload', cluster: 'cyan',    status: 'active', docs: 1237, rate: 0,   last: '2 hr ago' },
  { id: 'art',    name: 'r/artificial',      kind: 'reddit', cluster: 'violet',  status: 'active', docs: 1180, rate: 70,  last: '18 min ago' },
  { id: 'sing',   name: 'r/singularity',     kind: 'reddit', cluster: 'violet',  status: 'active', docs: 980,  rate: 54,  last: '1 hr ago' },
  { id: 'nature', name: 'nature.com',        kind: 'web',    cluster: 'emerald', status: 'active', docs: 720,  rate: 18,  last: '1 day ago' },
  { id: 'oai',    name: 'openai.com',        kind: 'web',    cluster: 'cyan',    status: 'paused', docs: 140,  rate: 0,   last: '3 days ago' },
  { id: 'euai',   name: 'euaiact.eu',        kind: 'web',    cluster: 'rose',    status: 'error',  docs: 80,   rate: 0,   last: 'failed 3 hr ago' },
];

// status → StatusDot props (StatusDot accepts a label override)
const FEED_STATUS = {
  active:  { status: 'ready',     label: 'active' },
  paused:  { status: 'paused',    label: 'paused' },
  error:   { status: 'error',     label: 'error' },
  syncing: { status: 'ingesting', label: 'syncing' },
};
function FeedStatus({ status }) {
  const m = FEED_STATUS[status] || FEED_STATUS.active;
  return <StatusDot status={m.status} label={m.label} />;
}

// Colored glyph tile for a feed's kind (reuses SourceGlyph shape).
function FeedGlyph({ kind, size = 30 }) {
  const k = FEED_KINDS[kind] || FEED_KINDS.web;
  return <SourceGlyph kind={k} size={size} radius={7} />;
}

// ─── Reassign-cluster pick list (feeds reference app categories) ──────────────
function FeedClusterList({ cats, currentKey, onPick, heading }) {
  return (
    <div style={{ padding: 6, width: 200 }}>
      {heading && <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4, padding: '4px 8px 7px' }}>{heading}</div>}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {cats.map(c => (
          <button key={c.key} onClick={() => onPick(c.key)} style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', borderRadius: 6,
            background: c.key === currentKey ? C.bgSelected : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
          }}
            onMouseEnter={e => { if (c.key !== currentKey) e.currentTarget.style.background = C.bgHover; }}
            onMouseLeave={e => { if (c.key !== currentKey) e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}80`, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
            {c.key === currentKey && <span style={{ fontSize: 10, color: C.amber }}>current</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Inline default-cluster badge in a feed row — click to repoint.
function FeedClusterBadge({ feed, onPick }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const color = app.catColor(feed.cluster);
  const label = app.catLabel(feed.cluster);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="Repoint default cluster" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 9px', borderRadius: 4, cursor: 'pointer',
        background: `${color}14`, border: `1px solid ${color}33`, fontFamily: FONT,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}90` }} />
        <span style={{ fontSize: 11.5, color, fontWeight: 500 }}>{label}</span>
        <Icon name="chevron-down" size={11} color={color} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 30, left: 0 }}>
        <FeedClusterList cats={app.cats} currentKey={feed.cluster} heading="Default cluster"
          onPick={(k) => { if (k !== feed.cluster) onPick(k); setOpen(false); }} />
      </Popover>
    </div>
  );
}

// ─── Row overflow menu ────────────────────────────────────────────────────────
function FeedMenuItem({ icon, label, onClick, danger, chevron }) {
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

function FeedRowMenu({ feed, onReingest, onTogglePause, onReassign, onRemove }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const [reassign, setReassign] = React.useState(false);
  const paused = feed.status === 'paused';
  return (
    <div style={{ position: 'relative' }}>
      <IconBtn name="more-horizontal" size={28} iconSize={15} onClick={() => { setOpen(o => !o); setReassign(false); }} />
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 32, right: 0, width: reassign ? 200 : 184, padding: reassign ? 0 : 6 }}>
        {reassign ? (
          <FeedClusterList cats={app.cats} currentKey={feed.cluster} heading="Default cluster"
            onPick={(k) => { if (k !== feed.cluster) onReassign(k); setOpen(false); }} />
        ) : (
          <>
            <FeedMenuItem icon="refresh" label="Re-ingest now" onClick={() => { onReingest(); setOpen(false); }} />
            <FeedMenuItem icon={paused ? 'play' : 'pause'} label={paused ? 'Resume feed' : 'Pause feed'} onClick={() => { onTogglePause(); setOpen(false); }} />
            <FeedMenuItem icon="layers" label="Default cluster" onClick={() => setReassign(true)} chevron />
            <div style={{ height: 1, background: C.borderSubtle, margin: '5px 4px' }} />
            <FeedMenuItem icon="trash-2" label="Remove source" danger onClick={() => { onRemove(); setOpen(false); }} />
          </>
        )}
      </Popover>
    </div>
  );
}

// ─── Small dropdown (type / status toolbar filters) ───────────────────────────
function FilterDropdown({ label, dot, active, options, onPick }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
        background: C.bgElevated, border: `1px solid ${active ? C.amberBorder : C.borderDef}`, fontFamily: FONT, fontSize: 12.5, color: C.fg2,
      }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />}
        {label}
        <Icon name="chevron-down" size={13} color={C.fg3} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 40, left: 0, width: 180, padding: 6 }}>
        {options.map(o => (
          <button key={o.value ?? 'all'} onClick={() => { onPick(o.value); setOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', borderRadius: 6,
            background: o.selected ? C.bgSelected : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
          }}
            onMouseEnter={e => { if (!o.selected) e.currentTarget.style.background = C.bgHover; }}
            onMouseLeave={e => { if (!o.selected) e.currentTarget.style.background = 'transparent'; }}>
            {o.dot ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />
              : <Icon name={o.icon || 'database'} size={13} color={o.selected ? C.amber : C.fg3} />}
            <span style={{ flex: 1, fontSize: 12.5, color: C.fg1 }}>{o.label}</span>
            {o.count != null && <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>{o.count}</span>}
          </button>
        ))}
      </Popover>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SOURCES MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════════════════════
function SourcesManageScreen() {
  const app = useApp();
  const [tab, setTab] = React.useState('records');
  const [feeds, setFeeds] = React.useState(() => FEED_SEED.map(f => ({ ...f })));
  const [sel, setSel] = React.useState(() => new Set());
  const [query, setQuery] = React.useState('');
  const [kindFilter, setKindFilter] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [bulkReassign, setBulkReassign] = React.useState(false);
  const seq = React.useRef(1);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSel(new Set()); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  React.useEffect(() => { setSel(prev => { const next = new Set([...prev].filter(id => feeds.some(f => f.id === id))); return next.size === prev.size ? prev : next; }); }, [feeds]);

  // ── Feed operations (local state) ───────────────────────────────────────────
  const patch = (id, fn) => setFeeds(prev => prev.map(f => f.id === id ? { ...f, ...fn(f) } : f));
  const renameFeed = (id, name) => patch(id, () => ({ name }));
  const reassignFeed = (id, cluster) => { patch(id, () => ({ cluster })); app.showToast('Default cluster repointed'); };
  const togglePause = (id) => setFeeds(prev => prev.map(f => {
    if (f.id !== id) return f;
    const paused = f.status === 'paused';
    app.showToast(paused ? `Resumed “${f.name}”` : `Paused “${f.name}”`);
    return { ...f, status: paused ? 'active' : 'paused' };
  }));
  const reingest = (id) => {
    const f = feeds.find(x => x.id === id); if (!f) return;
    patch(id, () => ({ status: 'syncing' }));
    app.showToast(`Re-ingesting “${f.name}”…`);
    setTimeout(() => patch(id, () => ({ status: 'active', last: 'just now' })), 1400);
  };
  const removeFeed = (id) => { const f = feeds.find(x => x.id === id); setFeeds(prev => prev.filter(x => x.id !== id)); if (f) app.showToast(`Removed “${f.name}”`); };
  const addFeed = ({ name, kind, cluster }) => {
    const id = 'f' + (seq.current++);
    const nm = (name || '').trim() || (FEED_KINDS[kind] || FEED_KINDS.web).hint;
    setFeeds(prev => [{ id, name: nm, kind, cluster, status: 'syncing', docs: 0, rate: 0, last: 'just now' }, ...prev]);
    app.showToast(`Connected “${nm}” — ingesting`);
    setTimeout(() => patch(id, () => ({ status: 'active' })), 1600);
  };

  // ── Bulk operations ─────────────────────────────────────────────────────────
  const selIds = [...sel];
  const selFeeds = feeds.filter(f => sel.has(f.id));
  const anyPaused = selFeeds.some(f => f.status === 'paused');
  const bulkPause = () => { setFeeds(prev => prev.map(f => sel.has(f.id) ? { ...f, status: anyPaused ? 'active' : 'paused' } : f)); app.showToast(`${selIds.length} source${selIds.length > 1 ? 's' : ''} ${anyPaused ? 'resumed' : 'paused'}`); };
  const bulkReingest = () => { setFeeds(prev => prev.map(f => sel.has(f.id) ? { ...f, status: 'syncing' } : f)); app.showToast(`Re-ingesting ${selIds.length} source${selIds.length > 1 ? 's' : ''}…`); const ids = new Set(selIds); setTimeout(() => setFeeds(prev => prev.map(f => ids.has(f.id) ? { ...f, status: 'active', last: 'just now' } : f)), 1500); };
  const bulkReassign2 = (k) => { setFeeds(prev => prev.map(f => sel.has(f.id) ? { ...f, cluster: k } : f)); app.showToast(`Repointed ${selIds.length} source${selIds.length > 1 ? 's' : ''}`); setBulkReassign(false); setSel(new Set()); };
  const bulkRemove = () => { setFeeds(prev => prev.filter(f => !sel.has(f.id))); app.showToast(`Removed ${selIds.length} source${selIds.length > 1 ? 's' : ''}`); setSel(new Set()); };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const rows = feeds.filter(f =>
    (!kindFilter || f.kind === kindFilter) &&
    (!statusFilter || (statusFilter === 'active' ? f.status === 'active' || f.status === 'syncing' : f.status === statusFilter)) &&
    (!q || f.name.toLowerCase().includes(q))
  );
  const kindCount = (k) => feeds.filter(f => f.kind === k).length;
  const totalDocs = feeds.reduce((a, f) => a + f.docs, 0);

  const toggle = (id) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = rows.length > 0 && rows.every(f => sel.has(f.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map(f => f.id)));

  const tw = app.tweaks;
  const padY = ({ compact: 8, regular: 12, comfy: 16 })[tw.density] || 12;

  const kindOptions = [
    { value: null, label: 'All types', icon: 'database', count: feeds.length, selected: !kindFilter },
    { value: 'reddit', label: 'Reddit', dot: FEED_KINDS.reddit.color, count: kindCount('reddit'), selected: kindFilter === 'reddit' },
    { value: 'web', label: 'Web', dot: FEED_KINDS.web.color, count: kindCount('web'), selected: kindFilter === 'web' },
    { value: 'upload', label: 'Uploads', dot: FEED_KINDS.upload.color, count: kindCount('upload'), selected: kindFilter === 'upload' },
  ];
  const statusOptions = [
    { value: null, label: 'All status', icon: 'sliders', selected: !statusFilter },
    { value: 'active', label: 'Active', dot: C.emerald, selected: statusFilter === 'active' },
    { value: 'paused', label: 'Paused', dot: C.fg3, selected: statusFilter === 'paused' },
    { value: 'error', label: 'Error', dot: C.rose, selected: statusFilter === 'error' },
  ];

  return (
    <ManageShell
      title="Manage sources"
      subtitle="A source is a connector — a subreddit, site or upload batch — that streams documents into the network. Rename, repoint its default cluster, pause, re-ingest or disconnect it. Each source feeds many nodes."
      crossLabel="Manage nodes" crossTo="nodes"
      primary={<Btn variant="primary" size="md" onClick={() => setNewOpen(true)}>New source</Btn>}>

      <ManageTabs
        tabs={[{ id: 'records', label: 'Records', icon: 'list', count: feeds.length }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' }]}
        active={tab} onChange={(t) => { if (t === 'analytics') setSel(new Set()); setTab(t); }} />

      {tab === 'analytics' ? <SourcesAnalytics feeds={feeds} app={app} /> : <>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px 12px', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="search" size={14} color={C.fg3} /></span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter sources…"
            style={{ width: '100%', font: `400 13px ${FONT}`, color: C.fg1, background: C.bgElevated, border: `1px solid ${C.borderDef}`, borderRadius: 7, padding: '8px 12px 8px 32px', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = C.amberBorder}
            onBlur={e => e.currentTarget.style.borderColor = C.borderDef} />
        </div>
        <FilterDropdown label={kindFilter ? FEED_KINDS[kindFilter].label : 'All types'} dot={kindFilter ? FEED_KINDS[kindFilter].color : null} active={!!kindFilter} options={kindOptions} onPick={setKindFilter} />
        <FilterDropdown label={statusFilter ? statusOptions.find(o => o.value === statusFilter).label : 'All status'} dot={statusFilter ? statusOptions.find(o => o.value === statusFilter).dot : null} active={!!statusFilter} options={statusOptions} onPick={setStatusFilter} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.fg3, fontFamily: MONO }}>{rows.length} of {feeds.length} sources · {fmtK(totalDocs)} docs</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 9px', borderBottom: `1px solid ${C.borderSubtle}`, position: 'sticky', top: 0, background: C.bgBase, zIndex: 2 }}>
          <MCheck checked={allSel} indeterminate={sel.size > 0 && !allSel} onChange={toggleAll} />
          <Th>Source</Th>
          <Th w={132}>Default cluster</Th>
          <Th w={74} right>Documents</Th>
          <Th w={86} right>Last ingest</Th>
          <Th w={78}>Status</Th>
          <Th w={40}>{''}</Th>
        </div>

        {rows.map((f, idx) => {
          const on = sel.has(f.id);
          const kind = FEED_KINDS[f.kind] || FEED_KINDS.web;
          const zebra = tw.zebra && idx % 2 === 1;
          const isErr = f.status === 'error';
          const sub = f.status === 'paused' ? `${kind.label} · paused`
            : f.status === 'error' ? `${kind.label} · ingest failed`
            : f.kind === 'upload' ? `${kind.label} · ${f.docs.toLocaleString()} documents`
            : `${kind.label} · ${f.rate.toLocaleString()} docs/day`;
          return (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: `${padY}px 12px`,
              borderBottom: `1px solid ${C.borderSubtle}`,
              background: on ? C.bgSelected : zebra ? 'rgba(255,255,255,0.018)' : 'transparent',
              boxShadow: on ? `inset 2px 0 0 ${C.amber}` : 'none',
            }}>
              <MCheck checked={on} onChange={() => toggle(f.id)} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FeedGlyph kind={f.kind} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <EditableText value={f.name} onCommit={(v) => renameFeed(f.id, v)} size={13.5} weight={500} />
                  </div>
                  <div style={{ fontSize: 11, color: C.fg4, fontFamily: MONO, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
                </div>
              </div>
              <div style={{ width: 132 }}><FeedClusterBadge feed={f} onPick={(k) => reassignFeed(f.id, k)} /></div>
              <div style={{ width: 74, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.fg2 }}>{f.docs.toLocaleString()}</div>
              <div style={{ width: 86, textAlign: 'right', fontFamily: MONO, fontSize: 12, color: isErr ? C.rose : C.fg3 }}>{f.last}</div>
              <div style={{ width: 78 }}><FeedStatus status={f.status} /></div>
              <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>
                <FeedRowMenu feed={f}
                  onReingest={() => reingest(f.id)}
                  onTogglePause={() => togglePause(f.id)}
                  onReassign={(k) => reassignFeed(f.id, k)}
                  onRemove={() => removeFeed(f.id)} />
              </div>
            </div>
          );
        })}

        {rows.length === 0 && feeds.length > 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No sources match.</div>
        )}

      </div>

      {/* Bulk bar */}
      {sel.size > 0 && (
        <MBulkBar count={sel.size} label={sel.size === 1 ? 'source selected' : 'sources selected'} onClear={() => setSel(new Set())}>
          <div style={{ position: 'relative' }}>
            <Btn variant="secondary" size="sm" icon="layers" iconRight="chevron-down" onClick={() => setBulkReassign(o => !o)}>Group</Btn>
            <Popover open={bulkReassign} onClose={() => setBulkReassign(false)} style={{ bottom: 40, left: 0 }}>
              <FeedClusterList cats={app.cats} heading={`Repoint ${sel.size} to`} onPick={bulkReassign2} />
            </Popover>
          </div>
          <Btn variant="secondary" size="sm" icon="refresh" onClick={bulkReingest}>Re-ingest</Btn>
          <Btn variant="secondary" size="sm" icon={anyPaused ? 'play' : 'pause'} onClick={bulkPause}>{anyPaused ? 'Resume' : 'Pause'}</Btn>
          <Btn variant="danger" size="sm" icon="trash-2" onClick={bulkRemove}>Remove</Btn>
        </MBulkBar>
      )}
      </>}

      {newOpen && <NewSourceModal onClose={() => setNewOpen(false)} onCreate={addFeed} />}
    </ManageShell>
  );
}

// ─── Connect-source modal ─────────────────────────────────────────────────────
function NewSourceModal({ onClose, onCreate }) {
  const app = useApp();
  const [kind, setKind] = React.useState('reddit');
  const [name, setName] = React.useState('');
  const [cluster, setCluster] = React.useState(app.cats[0] ? app.cats[0].key : '');
  const [pickOpen, setPickOpen] = React.useState(false);
  const create = () => { onCreate({ name, kind, cluster }); onClose(); };
  const cat = app.cats.find(c => c.key === cluster);
  const placeholders = { reddit: 'r/LocalLLaMA', web: 'example.com', upload: 'Q3 research batch' };
  return (
    <MModal title="Connect a source" width={480}
      subtitle="Connect a feed — its documents stream into the network and assign to your chosen default cluster."
      onClose={onClose}
      footer={<><Btn variant="ghost" size="md" onClick={onClose}>Cancel</Btn><Btn variant="primary" size="md" disabled={!cluster} onClick={create}>Connect source</Btn></>}>

      <MFieldLabel>Type</MFieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {Object.values(FEED_KINDS).map(k => {
          const on = kind === k.id;
          return (
            <button key={k.id} onClick={() => setKind(k.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 9, cursor: 'pointer',
              background: on ? `${k.color}12` : C.bgElevated, border: `1px solid ${on ? k.color + '66' : C.borderDef}`,
              fontFamily: FONT, transition: 'all 150ms ease-out',
            }}>
              <SourceGlyph kind={k} size={34} radius={8} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? C.fg1 : C.fg2 }}>{k.label}</div>
                <div style={{ fontSize: 10.5, color: C.fg4, marginTop: 1 }}>{k.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <MFieldLabel>{kind === 'upload' ? 'Batch name' : kind === 'reddit' ? 'Subreddit' : 'Site / domain'}</MFieldLabel>
      <div style={{ marginBottom: 18 }}><MInput value={name} onChange={setName} placeholder={placeholders[kind]} autoFocus onEnter={create} /></div>

      <MFieldLabel>Default cluster</MFieldLabel>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setPickOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
          background: C.bgElevated, border: `1px solid ${pickOpen ? C.amberBorder : C.borderDef}`, fontFamily: FONT, textAlign: 'left',
        }}>
          {cat && <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, boxShadow: `0 0 6px ${cat.color}80` }} />}
          <span style={{ flex: 1, fontSize: 14, color: C.fg1 }}>{cat ? cat.label : 'Pick a cluster'}</span>
          <Icon name="chevron-down" size={14} color={C.fg3} />
        </button>
        <Popover open={pickOpen} onClose={() => setPickOpen(false)} style={{ top: 46, left: 0, right: 0 }}>
          <FeedClusterList cats={app.cats} currentKey={cluster} onPick={(k) => { setCluster(k); setPickOpen(false); }} />
        </Popover>
      </div>
    </MModal>
  );
}

// ─── Sources analytics view ───────────────────────────────────────────────────
function SourcesAnalytics({ feeds, app }) {
  const vp = useViewport();
  const total = feeds.length;
  const totalDocs = feeds.reduce((a, f) => a + f.docs, 0);
  const active = feeds.filter(f => f.status === 'active' || f.status === 'syncing').length;
  const activeRate = feeds.filter(f => f.status === 'active').reduce((a, f) => a + f.rate, 0);

  const typeSeg = Object.values(FEED_KINDS).map(k => ({
    label: k.label, value: feeds.filter(f => f.kind === k.id).reduce((a, f) => a + f.docs, 0), color: k.color,
  })).filter(s => s.value > 0);
  const statusRows = [
    { label: 'Active', keys: ['active', 'syncing'], color: C.emerald },
    { label: 'Paused', keys: ['paused'], color: C.fg3 },
    { label: 'Error', keys: ['error'], color: C.rose },
  ].map(s => ({ label: s.label, value: feeds.filter(f => s.keys.includes(f.status)).length, color: s.color }));
  const docRows = [...feeds].sort((a, b) => b.docs - a.docs).slice(0, 7)
    .map(f => ({ label: f.name, value: f.docs, color: (FEED_KINDS[f.kind] || FEED_KINDS.web).color }));
  const clusterRows = app.cats
    .map(c => ({ label: c.label, value: feeds.filter(f => f.cluster === c.key).length, color: c.color }))
    .filter(r => r.value > 0).sort((a, b) => b.value - a.value);

  return (
    <AScroll>
      <AStatStrip>
        <AStat value={total} label="Sources" />
        <AStat value={fmtK(totalDocs)} label="Documents" color={CLUSTER_COLORS.cyan} />
        <AStat value={active} label="Active" color={C.emerald} />
        <AStat value={fmtK(activeRate) + '/d'} label="Ingest rate" color={C.amber} />
      </AStatStrip>
      <AGrid cols={vp.isMobile ? '1fr' : '1fr 1fr'}>
        <APanel title="Documents by type">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Donut segments={typeSeg} centerValue={fmtK(totalDocs)} centerLabel="documents" />
            <DonutLegend segments={typeSeg} fmt={fmtK} />
          </div>
        </APanel>
        <APanel title="Status breakdown" right={<span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>{total} sources</span>}>
          <HBarList rows={statusRows} labelW={72} empty="No sources connected" />
        </APanel>
      </AGrid>
      <AGrid cols={vp.isMobile ? '1fr' : '1.4fr 1fr'}>
        <APanel title="Documents by source" right={<span style={{ fontSize: 11, color: C.fg4 }}>top 7</span>}>
          <HBarList rows={docRows} labelW={150} fmt={(v) => v.toLocaleString()} empty="No sources connected" />
        </APanel>
        <APanel title="Sources per default cluster">
          <HBarList rows={clusterRows} empty="No sources connected" />
        </APanel>
      </AGrid>
    </AScroll>
  );
}

Object.assign(window, { SourcesManageScreen, SourcesAnalytics });
