// TopicNet Prototype — Sources manager
// Model: a *source* is a single ingested item (Reddit post, Reddit comment, web
// URL, or a document). Feeds (subreddits, sites, uploads) are a filter/grouping
// on top. Rows are individual sources.
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

const SRC_STATUS_COLOR = (s) => s === 'ready' ? C.emerald : s === 'ingesting' ? C.amber : s === 'error' ? C.rose : s === 'pending' ? C.info : C.fg3;

// Secondary line beneath a source title.
function srcMeta(s) {
  const feed = FEED_BY_ID[s.feed];
  const fname = feed ? feed.name : s.feed;
  if (s.type === 'post' || s.type === 'comment') return `${fname} · ${s.author} · ${(s.score || 0).toLocaleString()} upvotes`;
  if (s.type === 'web') return s.url;
  if (s.type === 'document') return `${fname} · ${s.pages} ${s.pages === 1 ? 'page' : 'pages'} · ${s.size}`;
  return fname;
}

function StatusPip({ status, label, size = 7 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: SRC_STATUS_COLOR(status), boxShadow: status === 'ingesting' ? `0 0 5px ${C.amber}` : 'none', flexShrink: 0 }} />
      {label !== false && <span style={{ fontSize: 11, color: SRC_STATUS_COLOR(status) }}>{status}</span>}
    </span>
  );
}

function SourcesScreen() {
  const app = useApp();
  const vp = useViewport();
  const [status, setStatus] = React.useState('all');
  const [kind, setKind] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [hovRow, setHovRow] = React.useState(null);

  const all = React.useMemo(() => [...app.sessionSources, ...SOURCES_DATA], [app.sessionSources]);
  const kindCount = (k) => all.filter(s => s.type === k).length;
  const counts = { post: kindCount('post'), comment: kindCount('comment'), web: kindCount('web'), document: kindCount('document') };
  const errors = all.filter(s => s.status === 'error').length;
  const ready = all.filter(s => s.status === 'ready').length;
  // Finished manual ingests — this session's runs first, then seeded history.
  const jobs = [...app.sessionJobs, ...RECENT_JOBS];
  const lastJob = jobs[0];

  let rows = all.filter(s => {
    if (status !== 'all' && s.status !== status) return false;
    if (kind !== 'all' && s.type !== kind) return false;
    if (query) {
      const hay = `${s.title} ${s.author || ''} ${s.url || ''} ${(FEED_BY_ID[s.feed] || {}).name || ''}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  // ── Tiles ──────────────────────────────────────────────────────────────────
  const Tile = ({ label, action, grow = 1, children }) => (
    <div style={{ flex: grow, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.fg2 }}>{label}</span>
        {action}
      </div>
      <div style={{ flex: 1, background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );

  // One finished manual-ingest job (synchronous run history).
  const JobRow = ({ j }) => {
    const kd = SOURCE_KINDS[j.kind] || SOURCE_KINDS.web;
    const failed = j.status === 'failed';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <SourceGlyph kind={kd} size={26} radius={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
          <div style={{ fontSize: 10.5, color: failed ? C.rose : C.fg4, fontFamily: MONO, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.detail}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: failed ? C.rose : C.emerald, flexShrink: 0 }}>
          <Icon name={failed ? 'alert-circle' : 'check'} size={12} color={failed ? C.rose : C.emerald} />
          {failed ? 'failed' : 'done'}
        </span>
        <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO, width: 62, textAlign: 'right', flexShrink: 0 }}>{j.time}</span>
      </div>
    );
  };

  const Pill = ({ id, label, cur, set, count, dot }) => {
    const on = cur === id;
    return (
      <button onClick={() => set(id)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 12,
        background: on ? C.bgActive : 'transparent', color: on ? C.fg1 : C.fg3,
        border: `1px solid ${on ? C.borderDef : C.borderSubtle}`, transition: 'all 150ms ease-out', whiteSpace: 'nowrap',
      }}>
        {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
        {label}{count != null && <span style={{ color: C.fg4, marginLeft: 2, fontFamily: MONO }}>{count}</span>}
      </button>
    );
  };

  const KIND_PILLS = [
    { id: 'all', label: 'All types', count: all.length },
    { id: 'post', label: 'Posts', count: counts.post, dot: SOURCE_KINDS.post.color },
    { id: 'comment', label: 'Comments', count: counts.comment, dot: SOURCE_KINDS.comment.color },
    { id: 'web', label: 'Web URLs', count: counts.web, dot: SOURCE_KINDS.web.color },
    { id: 'document', label: 'Documents', count: counts.document, dot: SOURCE_KINDS.pdf.color },
  ];

  // ── Row renderers ────────────────────────────────────────────────────────────
  const GRID = '30px 1.7fr 134px 116px 84px 96px 64px';

  const DesktopRow = ({ s }) => {
    const kd = srcKind(s);
    return (
      <div onMouseEnter={() => setHovRow(s.id)} onMouseLeave={() => setHovRow(null)}
        style={{ display: 'grid', gridTemplateColumns: GRID, gap: 14, padding: '11px 18px', alignItems: 'center',
          borderBottom: `1px solid ${C.borderSubtle}`, background: hovRow === s.id ? C.bgHover : 'transparent', transition: 'background 120ms ease-out' }}>
        <SourceGlyph kind={kd} size={28} radius={7} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
          <div style={{ fontSize: 10.5, color: C.fg4, fontFamily: MONO, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{srcMeta(s)}</div>
        </div>
        <SourceKindBadge kind={kd} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: CLUSTER_COLORS[s.cluster], boxShadow: `0 0 5px ${CLUSTER_COLORS[s.cluster]}80`, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: CLUSTER_COLORS[s.cluster], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CLUSTER_LABELS[s.cluster]}</span>
        </div>
        <span style={{ fontSize: 11.5, color: C.fg3, fontFamily: MONO }}>{s.time}</span>
        <StatusPip status={s.status} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, opacity: hovRow === s.id ? 1 : 0, transition: 'opacity 120ms ease-out' }}>
          <IconBtn name="refresh" size={28} iconSize={14} title="Re-ingest this source"
            onClick={() => app.showToast(`Re-ingesting this ${kd.label.toLowerCase()}…`)} />
          <IconBtn name="more-horizontal" size={28} iconSize={15}
            onClick={() => app.showToast(`Options for this ${kd.label.toLowerCase()}`)} />
        </div>
      </div>
    );
  };

  const MobileCard = ({ s }) => {
    const kd = srcKind(s);
    return (
      <div onClick={() => app.showToast(`Options for this ${kd.label.toLowerCase()}`)}
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <SourceGlyph kind={kd} size={30} radius={7} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: C.fg1, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
            <div style={{ fontSize: 11, color: C.fg4, fontFamily: MONO, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{srcMeta(s)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 41, flexWrap: 'wrap' }}>
          <SourceKindBadge kind={kd} small />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CLUSTER_COLORS[s.cluster], boxShadow: `0 0 5px ${CLUSTER_COLORS[s.cluster]}80` }} />
            <span style={{ fontSize: 11.5, color: CLUSTER_COLORS[s.cluster] }}>{CLUSTER_LABELS[s.cluster]}</span>
          </div>
          <StatusPip status={s.status} />
          <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO, marginLeft: 'auto' }}>{s.time}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgBase }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: vp.isNarrow ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Dashboard tiles */}
        <div style={{ display: 'flex', gap: 14, flexShrink: 0, flexDirection: vp.isNarrow ? 'column' : 'row' }}>
          <Tile label="Total sources">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: C.fg1, letterSpacing: '-0.02em' }}>{SOURCES_TOTAL.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: C.fg4 }}>indexed · {all.length} most recent below</span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['Posts', SOURCES_BREAKDOWN.post, SOURCE_KINDS.post.color], ['Comments', SOURCES_BREAKDOWN.comment, SOURCE_KINDS.comment.color], ['Web', SOURCES_BREAKDOWN.web, SOURCE_KINDS.web.color], ['Docs', SOURCES_BREAKDOWN.document, SOURCE_KINDS.pdf.color]].map(([l, n, c]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.fg3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ color: C.fg2, fontFamily: MONO }}>{n.toLocaleString()}</span> {l}
                </span>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, borderTop: `1px solid ${C.borderSubtle}` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.fg3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald, flexShrink: 0 }} />
                <span style={{ color: C.fg2, fontFamily: MONO }}>{SOURCES_READY.toLocaleString()}</span> ready
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.fg3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SOURCES_ERRORS ? C.rose : C.fg4, flexShrink: 0 }} />
                <span style={{ color: SOURCES_ERRORS ? C.rose : C.fg2, fontFamily: MONO }}>{SOURCES_ERRORS}</span> error{SOURCES_ERRORS === 1 ? '' : 's'}
              </span>
            </div>
          </Tile>
          <Tile label="Recent ingest jobs" grow={1.6}
            action={<span style={{ marginLeft: 'auto', fontSize: 11, color: C.fg4, fontFamily: MONO }}>{lastJob ? `last run ${lastJob.time}` : 'no runs yet'}</span>}>
            {jobs.length === 0
              ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: C.fg3 }}>No sources ingested yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{jobs.slice(0, 4).map(j => <JobRow key={j.id} j={j} />)}</div>}
          </Tile>
        </div>

        {/* Filters + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {/* Row 1 — type + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {KIND_PILLS.map(p => <Pill key={p.id} id={p.id} label={p.label} cur={kind} set={setKind} count={p.count} dot={p.dot} />)}
            <div style={{ width: 1, height: 20, background: C.borderSubtle, margin: '0 3px' }} />
            <Pill id="all" label="All status" cur={status} set={setStatus} />
            <Pill id="ready" label="Ready" cur={status} set={setStatus} dot={C.emerald} />
            <Pill id="error" label="Error" cur={status} set={setStatus} dot={C.rose} />
          </div>

          {/* Row 2 — search + add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 6, background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, width: vp.isMobile ? '100%' : 220 }}>
              <Icon name="search" size={13} color={C.fg4} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sources…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.fg1, fontFamily: FONT, fontSize: 12.5, minWidth: 0 }} />
            </div>
            {!vp.isMobile && <Btn variant="primary" size="sm" icon="plus" onClick={() => app.setAddSrc(true)}>Add source</Btn>}
          </div>

          {/* Result count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.fg4 }}>
            <span style={{ fontFamily: MONO, color: C.fg3 }}>{rows.length}</span>
            {(kind !== 'all' || status !== 'all' || query)
              ? ` source${rows.length === 1 ? '' : 's'} match these filters`
              : ` most recent source${rows.length === 1 ? '' : 's'} · ${SOURCES_TOTAL.toLocaleString()} indexed`}
          </div>

          {/* List */}
          {vp.isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(s => <MobileCard key={s.id} s={s} />)}
              {rows.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No sources match these filters</div>}
            </div>
          ) : (
            <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 14, padding: '11px 18px', borderBottom: `1px solid ${C.borderSubtle}`, position: 'sticky', top: 0, background: C.bgElevated, zIndex: 1 }}>
                {['', 'Source', 'Type', 'Group', 'Added', 'Status', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4 }}>{h}</span>
                ))}
              </div>
              <div>
                {rows.map(s => <DesktopRow key={s.id} s={s} />)}
                {rows.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No sources match these filters</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SourcesScreen });
