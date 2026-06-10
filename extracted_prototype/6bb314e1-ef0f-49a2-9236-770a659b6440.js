// TopicNet Prototype — Nodes management page
// Depends on tn-core.jsx, tn-shell.jsx (useApp), tn-manage.jsx (shared primitives)

// Reassign target list (shared by row badge, row menu, bulk bar)
function CatPickList({ cats, currentKey, onPick, heading }) {
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

// Inline category badge in a node row — click to reassign that node
function NodeCatBadge({ node }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const color = app.catColor(node.cluster);
  const label = app.catLabel(node.cluster);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="Reassign category" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 9px', borderRadius: 4, cursor: 'pointer',
        background: `${color}14`, border: `1px solid ${color}33`, fontFamily: FONT,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}90` }} />
        <span style={{ fontSize: 11.5, color, fontWeight: 500 }}>{label}</span>
        <Icon name="chevron-down" size={11} color={color} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 30, left: 0 }}>
        <CatPickList cats={app.cats} currentKey={node.cluster} heading="Reassign to"
          onPick={(k) => { if (k !== node.cluster) app.reassignNodes([node.id], k); setOpen(false); }} />
      </Popover>
    </div>
  );
}

// Row overflow menu
function NodeRowMenu({ node }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const [reassign, setReassign] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <IconBtn name="more-horizontal" size={28} iconSize={15} onClick={() => { setOpen(o => !o); setReassign(false); }} />
      <Popover open={open} onClose={() => setOpen(false)} style={{ top: 32, right: 0, width: reassign ? 200 : 168, padding: reassign ? 0 : 6 }}>
        {reassign ? (
          <CatPickList cats={app.cats} currentKey={node.cluster} heading="Reassign to"
            onPick={(k) => { if (k !== node.cluster) app.reassignNodes([node.id], k); setOpen(false); }} />
        ) : (
          <>
            <MenuItem icon="circle-dot" label="Reassign category" onClick={() => setReassign(true)} chevron />
            <MenuItem icon="trash-2" label="Remove from graph" danger onClick={() => { app.removeNodes([node.id]); setOpen(false); }} />
          </>
        )}
      </Popover>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger, chevron }) {
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

// ════════════════════════════════════════════════════════════════════════════
// NODES MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════════════════════
function NodesManageScreen() {
  const app = useApp();
  const [tab, setTab] = React.useState('records');
  const [sel, setSel] = React.useState(() => new Set());
  const [query, setQuery] = React.useState('');
  const [catFilter, setCatFilter] = React.useState(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [bulkReassign, setBulkReassign] = React.useState(false);
  const [newFromSel, setNewFromSel] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSel(new Set()); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  React.useEffect(() => { setSel(prev => { const next = new Set([...prev].filter(id => app.gnodes.some(n => n.id === id))); return next.size === prev.size ? prev : next; }); }, [app.gnodes]);

  const q = query.trim().toLowerCase();
  const rows = app.gnodes.filter(n =>
    (!catFilter || n.cluster === catFilter) &&
    (!q || n.label.toLowerCase().includes(q))
  );
  const toggle = (id) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = rows.length > 0 && rows.every(n => sel.has(n.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map(n => n.id)));
  const selIds = [...sel];

  const filterLabel = catFilter ? app.catLabel(catFilter) : 'All categories';
  const tw = app.tweaks;
  const padY = ({ compact: 8, regular: 12, comfy: 16 })[tw.density] || 12;

  return (
    <ManageShell
      title="Manage topics"
      subtitle="Rename, reassign to a category, merge duplicates, remove topics, or add one by hand. Edits restructure the network graph immediately."
      crossLabel="Manage groups" crossTo="clusters"
      primary={<Btn variant="primary" size="md" onClick={() => setNewOpen(true)}>New topic</Btn>}>

      <ManageTabs
        tabs={[{ id: 'records', label: 'Topics', icon: 'list', count: app.gnodes.length }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' }]}
        active={tab} onChange={(t) => { if (t === 'analytics') setSel(new Set()); setTab(t); }} />

      {tab === 'analytics' ? <NodesAnalytics app={app} /> : <>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px 12px', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 240 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="search" size={14} color={C.fg3} /></span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter nodes…"
            style={{ width: '100%', font: `400 13px ${FONT}`, color: C.fg1, background: C.bgElevated, border: `1px solid ${C.borderDef}`, borderRadius: 7, padding: '8px 12px 8px 32px', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = C.amberBorder}
            onBlur={e => e.currentTarget.style.borderColor = C.borderDef} />
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
            background: C.bgElevated, border: `1px solid ${catFilter ? C.amberBorder : C.borderDef}`, fontFamily: FONT, fontSize: 12.5, color: C.fg2,
          }}>
            {catFilter && <span style={{ width: 8, height: 8, borderRadius: '50%', background: app.catColor(catFilter) }} />}
            {filterLabel}
            <Icon name="chevron-down" size={13} color={C.fg3} />
          </button>
          <Popover open={filterOpen} onClose={() => setFilterOpen(false)} style={{ top: 40, left: 0, width: 200, padding: 6 }}>
            <button onClick={() => { setCatFilter(null); setFilterOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', borderRadius: 6, background: !catFilter ? C.bgSelected : 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}>
              <Icon name="layers" size={13} color={!catFilter ? C.amber : C.fg3} />
              <span style={{ flex: 1, fontSize: 12.5, color: C.fg1 }}>All categories</span>
            </button>
            <CatPickList cats={app.cats} currentKey={catFilter} onPick={(k) => { setCatFilter(k); setFilterOpen(false); }} />
          </Popover>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.fg3, fontFamily: MONO }}>{rows.length} of {app.gnodes.length} topics</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 9px', borderBottom: `1px solid ${C.borderSubtle}`, position: 'sticky', top: 0, background: C.bgBase, zIndex: 2 }}>
          <MCheck checked={allSel} indeterminate={sel.size > 0 && !allSel} onChange={toggleAll} />
          <Th>Topic</Th>
          <Th w={132}>Category</Th>
          <Th w={90} right>Sources</Th>
          <Th w={66} right>Links</Th>
          {tw.showSentiment && <Th w={92} right>Sentiment</Th>}
          <Th w={40}>{''}</Th>
        </div>

        {rows.map((n, idx) => {
          const on = sel.has(n.id);
          const color = app.catColor(n.cluster);
          const zebra = tw.zebra && idx % 2 === 1;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: `${padY}px 12px`,
              borderBottom: `1px solid ${C.borderSubtle}`,
              background: on ? C.bgSelected : zebra ? 'rgba(255,255,255,0.018)' : 'transparent',
              boxShadow: on ? `inset 2px 0 0 ${C.amber}` : 'none',
            }}>
              <MCheck checked={on} onChange={() => toggle(n.id)} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: color, boxShadow: `0 0 7px ${color}90`, flexShrink: 0 }} />
                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <EditableText value={n.label} onCommit={(v) => app.renameNode(n.id, v)} size={13.5} weight={500} />
                </div>
              </div>
              <div style={{ width: 132 }}><NodeCatBadge node={n} /></div>
              <div style={{ width: 90, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.fg2 }}>{n.docs.toLocaleString()}</div>
              <div style={{ width: 66, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: C.fg2 }}>{n.connections.length}</div>
              {tw.showSentiment && <div style={{ width: 92, textAlign: 'right', fontFamily: MONO, fontSize: 13, color: n.sentiment >= 0 ? C.emerald : C.rose }}>{(n.sentiment >= 0 ? '+' : '−') + Math.abs(n.sentiment).toFixed(2)}</div>}
              <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}><NodeRowMenu node={n} /></div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No nodes match.</div>
        )}
      </div>

      {/* Bulk bar */}
      {sel.size > 0 && (
        <MBulkBar count={sel.size} label="selected" onClear={() => setSel(new Set())}>
          <div style={{ position: 'relative' }}>
            <Btn variant="secondary" size="sm" icon="circle-dot" iconRight="chevron-down" onClick={() => setBulkReassign(o => !o)}>Reassign</Btn>
            <Popover open={bulkReassign} onClose={() => setBulkReassign(false)} style={{ bottom: 40, left: 0 }}>
              <CatPickList cats={app.cats} heading={`Reassign ${sel.size} to`}
                onPick={(k) => { app.reassignNodes(selIds, k); setBulkReassign(false); setSel(new Set()); }} />
            </Popover>
          </div>
          <Btn variant="secondary" size="sm" icon="layers" disabled={sel.size < 2}
            onClick={() => { app.mergeNodes(selIds, selIds[0]); setSel(new Set([selIds[0]])); }}>Merge</Btn>
          <Btn variant="secondary" size="sm" icon="plus" onClick={() => setNewFromSel(true)}>New category</Btn>
          <Btn variant="danger" size="sm" icon="trash-2" onClick={() => { app.removeNodes(selIds); setSel(new Set()); }}>Remove</Btn>
        </MBulkBar>
      )}
      </>}

      {newOpen && <NewNodeModal onClose={() => setNewOpen(false)} />}
      {newFromSel && <NewCatFromNodesModal ids={selIds} onClose={() => setNewFromSel(false)} onDone={() => setSel(new Set())} />}
    </ManageShell>
  );
}

function NewNodeModal({ onClose }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [cluster, setCluster] = React.useState(app.cats[0] ? app.cats[0].key : '');
  const [pickOpen, setPickOpen] = React.useState(false);
  const create = () => { app.createNode({ label: name, cluster }); onClose(); };
  const cat = app.cats.find(c => c.key === cluster);
  return (
    <MModal title="New node" subtitle="Add a topic by hand. It starts empty — connect sources to it later."
      onClose={onClose}
      footer={<><Btn variant="ghost" size="md" onClick={onClose}>Cancel</Btn><Btn variant="primary" size="md" disabled={!cluster} onClick={create}>Create node</Btn></>}>
      <MFieldLabel>Node name</MFieldLabel>
      <div style={{ marginBottom: 18 }}><MInput value={name} onChange={setName} placeholder="e.g. Mixture of Experts" autoFocus onEnter={create} /></div>
      <MFieldLabel>Category</MFieldLabel>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setPickOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
          background: C.bgElevated, border: `1px solid ${pickOpen ? C.amberBorder : C.borderDef}`, fontFamily: FONT, textAlign: 'left',
        }}>
          {cat && <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, boxShadow: `0 0 6px ${cat.color}80` }} />}
          <span style={{ flex: 1, fontSize: 14, color: C.fg1 }}>{cat ? cat.label : 'Pick a category'}</span>
          <Icon name="chevron-down" size={14} color={C.fg3} />
        </button>
        <Popover open={pickOpen} onClose={() => setPickOpen(false)} style={{ top: 46, left: 0, right: 0 }}>
          <CatPickList cats={app.cats} currentKey={cluster} onPick={(k) => { setCluster(k); setPickOpen(false); }} />
        </Popover>
      </div>
    </MModal>
  );
}

function NewCatFromNodesModal({ ids, onClose, onDone }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(PALETTE[2]);
  const create = () => { const k = app.createCat(name, color); app.reassignNodes(ids, k); onClose(); onDone && onDone(); };
  return (
    <MModal title={`New category from ${ids.length} node${ids.length > 1 ? 's' : ''}`}
      subtitle="Creates a category and moves the selected nodes into it."
      onClose={onClose}
      footer={<><Btn variant="ghost" size="md" onClick={onClose}>Cancel</Btn><Btn variant="primary" size="md" onClick={create}>Create & assign</Btn></>}>
      <MFieldLabel>Name</MFieldLabel>
      <div style={{ marginBottom: 18 }}><MInput value={name} onChange={setName} placeholder="e.g. Emerging topics" autoFocus onEnter={create} /></div>
      <MFieldLabel>Color</MFieldLabel>
      <ColorGrid value={color} onPick={setColor} />
    </MModal>
  );
}

// ─── Nodes analytics view ─────────────────────────────────────────────────────
function NodesAnalytics({ app }) {
  const vp = useViewport();
  const nodes = app.gnodes;
  const n = nodes.length;
  const totalDocs = nodes.reduce((a, x) => a + x.docs, 0);
  const avgConn = n ? nodes.reduce((a, x) => a + x.connections.length, 0) / n : 0;
  const avgDocs = n ? totalDocs / n : 0;
  const avgSent = n ? nodes.reduce((a, x) => a + x.sentiment, 0) / n : 0;

  const catRows = app.cats
    .map(c => ({ label: c.label, value: nodes.filter(x => x.cluster === c.key).length, color: c.color }))
    .filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const topConn = [...nodes].sort((a, b) => b.connections.length - a.connections.length).slice(0, 7)
    .map(x => ({ label: x.label, value: x.connections.length, color: app.catColor(x.cluster) }));
  const topDocs = [...nodes].sort((a, b) => b.docs - a.docs).slice(0, 7)
    .map(x => ({ label: x.label, value: x.docs, color: app.catColor(x.cluster) }));
  const bands = [
    { label: 'Negative', min: -1.01, max: -0.2, color: C.rose },
    { label: 'Slightly neg.', min: -0.2, max: -0.02, color: CLUSTER_COLORS.orange },
    { label: 'Neutral', min: -0.02, max: 0.02, color: C.fg3 },
    { label: 'Slightly pos.', min: 0.02, max: 0.2, color: CLUSTER_COLORS.lime },
    { label: 'Positive', min: 0.2, max: 1.01, color: C.emerald },
  ];
  const bandRows = bands.map(b => ({ label: b.label, value: nodes.filter(x => x.sentiment >= b.min && x.sentiment < b.max).length, color: b.color }));

  return (
    <AScroll>
      <AStatStrip>
        <AStat value={n} label="Nodes" />
        <AStat value={avgConn.toFixed(1)} label="Avg connections" color={C.amber} />
        <AStat value={fmtK(Math.round(avgDocs))} label="Avg docs / node" color={CLUSTER_COLORS.cyan} />
        <AStat value={(avgSent >= 0 ? '+' : '−') + Math.abs(avgSent).toFixed(2)} label="Avg sentiment" color={avgSent >= 0 ? C.emerald : C.rose} />
      </AStatStrip>
      <AGrid cols={vp.isMobile ? '1fr' : '1fr 1fr'}>
        <APanel title="Category distribution" right={<span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>{catRows.length} categories</span>}>
          <HBarList rows={catRows} empty="No nodes yet" />
        </APanel>
        <APanel title="Sentiment distribution" right={<span style={{ fontSize: 11, color: C.fg4 }}>by node count</span>}>
          <HBarList rows={bandRows} labelW={96} />
        </APanel>
      </AGrid>
      <AGrid cols={vp.isMobile ? '1fr' : '1fr 1fr'}>
        <APanel title="Most connected nodes" right={<span style={{ fontSize: 11, color: C.fg4 }}>top 7</span>}>
          <HBarList rows={topConn} labelW={150} empty="No nodes yet" />
        </APanel>
        <APanel title="Top nodes by documents" right={<span style={{ fontSize: 11, color: C.fg4 }}>top 7</span>}>
          <HBarList rows={topDocs} labelW={150} fmt={(v) => v.toLocaleString()} empty="No nodes yet" />
        </APanel>
      </AGrid>
    </AScroll>
  );
}

Object.assign(window, { NodesManageScreen, NodesAnalytics });
