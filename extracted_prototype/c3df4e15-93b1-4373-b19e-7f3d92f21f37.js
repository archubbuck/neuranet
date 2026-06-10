// TopicNet Prototype — Search & query (live-filtered results + passage detail)
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

function HighlightSnippet({ r, size = 12 }) {
  return (
    <span style={{ fontSize: size, color: C.fg2, lineHeight: 1.7 }}>
      {r.snippet}
      <span style={{ background: 'rgba(251,191,36,0.22)', color: C.amber, borderRadius: 2, padding: '0 3px' }}>{r.highlight}</span>
      {r.snippetEnd}
    </span>
  );
}

function ResultRow({ r, selected, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.borderSubtle}`,
        background: selected ? C.bgSelected : hov ? C.bgHover : 'transparent',
        borderLeft: `2px solid ${selected ? C.amber : 'transparent'}`, transition: 'background 120ms ease-out',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <SourceTypeIcon type={r.type} size={18} radius={4} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
        <span style={{ fontSize: 10.5, color: C.amber, fontFamily: MONO, flexShrink: 0 }}>{r.score}</span>
      </div>
      <div style={{ paddingLeft: 26, marginBottom: 6 }}><HighlightSnippet r={r} size={11.5} /></div>
      <div style={{ paddingLeft: 26, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: CLUSTER_COLORS[r.cluster], flexShrink: 0 }} />
        <span style={{ fontSize: 10.5, color: CLUSTER_COLORS[r.cluster] }}>{CLUSTER_LABELS[r.cluster]}</span>
        <span style={{ fontSize: 10.5, color: C.fg4 }}>·</span>
        <span style={{ fontSize: 10.5, color: C.fg3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
        <span style={{ fontSize: 10.5, color: C.fg4 }}>·</span>
        <span style={{ fontSize: 10.5, color: C.fg3 }}>{r.date}</span>
      </div>
    </div>
  );
}

function SearchDetail({ r }) {
  const app = useApp();
  const node = getNodeDetail(r.nodeId);
  const related = connectedTopics(r.nodeId).slice(0, 4);
  const sCol = r.sentiment > 0.15 ? C.emerald : r.sentiment < -0.15 ? C.rose : C.amber;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <SourceTypeIcon type={r.type} size={30} radius={7} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.fg1, lineHeight: 1.3 }}>{r.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 3, background: `${CLUSTER_COLORS[r.cluster]}14`, border: `1px solid ${CLUSTER_COLORS[r.cluster]}28` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: CLUSTER_COLORS[r.cluster] }} />
              <span style={{ fontSize: 11, color: CLUSTER_COLORS[r.cluster] }}>{CLUSTER_LABELS[r.cluster]}</span>
            </span>
            <span style={{ fontSize: 11, color: C.fg3 }}>{r.source}</span>
            <span style={{ fontSize: 11, color: C.fg4 }}>·</span>
            <span style={{ fontSize: 11, color: C.fg3 }}>{r.date}</span>
          </div>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 5, background: C.amberDim, border: `1px solid ${C.amberBorder}`, fontSize: 11.5, color: C.amber, fontFamily: MONO, fontWeight: 600, flexShrink: 0 }}>{r.score}</span>
      </div>

      <div>
        <SecLabel>Matched passage</SecLabel>
        <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, padding: '15px 17px' }}>
          <span style={{ fontSize: 13, color: C.fg1, lineHeight: 1.9 }}>
            {r.snippet}
            <span style={{ background: 'rgba(251,191,36,0.22)', color: C.amber, borderRadius: 2, padding: '1px 4px' }}>{r.highlight}</span>
            {r.snippetEnd} The passage was indexed during the most recent crawl and contributes to this topic's relevance ranking within the network.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {[['Relevance', (r.score / 100).toFixed(2), C.amber], ['Sentiment', `${r.sentiment >= 0 ? '+' : ''}${r.sentiment.toFixed(2)}`, sCol], ['Source docs', node.docs.toLocaleString(), C.fg1]].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1, background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: C.fg4, marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: c, fontFamily: MONO }}>{v}</div>
          </div>
        ))}
      </div>

      <div>
        <SecLabel action={<span style={{ fontSize: 10.5, color: C.amber, cursor: 'pointer' }} onClick={() => app.openFullDetail(r.nodeId)}>Open node →</span>}>Related topics in network</SecLabel>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <NodeChip node={node} onClick={() => app.openFullDetail(node.id)} />
          {related.map(t => <NodeChip key={t.id} node={t} onClick={() => app.openFullDetail(t.id)} />)}
        </div>
      </div>
    </div>
  );
}

function SearchScreen() {
  const app = useApp();
  const vp = useViewport();
  const [query, setQuery] = React.useState('transformer attention mechanisms');
  const [mode, setMode] = React.useState('semantic');
  const [clusterFilters, setClusterFilters] = React.useState(new Set());
  const [typeFilters, setTypeFilters] = React.useState(new Set());
  const [sort, setSort] = React.useState('relevance');
  const [selId, setSelId] = React.useState(1);
  const [mobileDetail, setMobileDetail] = React.useState(false);

  const hasQuery = query.trim().length > 0;

  let results = SEARCH_RESULTS.filter(r => {
    if (clusterFilters.size && !clusterFilters.has(r.cluster)) return false;
    if (typeFilters.size && !typeFilters.has(r.type)) return false;
    if (hasQuery) {
      const q = query.toLowerCase();
      const hay = (r.title + ' ' + r.snippet + ' ' + r.highlight + ' ' + r.snippetEnd + ' ' + r.source).toLowerCase();
      if (!hay.includes(q.split(' ')[0])) {
        // loose: match if any word overlaps
        const words = q.split(/\s+/).filter(w => w.length > 2);
        if (words.length && !words.some(w => hay.includes(w))) return false;
      }
    }
    return true;
  });
  if (sort === 'date') results = [...results].sort((a, b) => b.id - a.id);
  if (sort === 'score') results = [...results].sort((a, b) => b.score - a.score);

  React.useEffect(() => {
    if (results.length && !results.find(r => r.id === selId)) setSelId(results[0].id);
  }, [query, clusterFilters, typeFilters]);

  const selected = results.find(r => r.id === selId) || results[0];

  const activeClusters = [...new Set(SEARCH_RESULTS.map(r => r.cluster))];
  const activeTypes = [...new Set(SEARCH_RESULTS.map(r => r.type))];

  const toggleSet = (setter, set, val) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  const Chip = ({ active, color, onClick, onRemove, children }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT, fontSize: 11,
      background: active ? `${color || C.amber}14` : 'transparent', color: active ? (color || C.amber) : C.fg3,
      border: `1px solid ${active ? `${color || C.amber}40` : C.borderSubtle}`, transition: 'all 150ms ease-out',
    }}>
      {color && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      {children}
      {active && onRemove && <span style={{ opacity: 0.7 }}>✕</span>}
    </button>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgBase }}>
      {/* Query + filter bar */}
      <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: vp.isNarrow ? 'column' : 'row' }}>
          <div style={{ flex: 1, alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 8, background: C.bgElevated, border: `1px solid ${C.borderDef}` }}>
            <Icon name="search" size={15} color={C.fg3} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your network…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.fg1, fontFamily: FONT, fontSize: 13.5, minWidth: 0 }} />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.fg4, display: 'flex' }}><Icon name="x" size={14} /></button>}
          </div>
          <div style={{ display: 'flex', gap: 4, alignSelf: vp.isNarrow ? 'stretch' : 'auto' }}>
            {[['semantic', 'Semantic'], ['keyword', 'Keyword'], ['both', 'Both']].map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} style={{
                flex: vp.isNarrow ? 1 : 'none',
                padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5,
                background: mode === k ? C.amberDim : 'transparent', color: mode === k ? C.amber : C.fg3,
                border: `1px solid ${mode === k ? C.amberBorder : C.borderSubtle}`, transition: 'all 150ms ease-out',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {hasQuery && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4, marginRight: 2 }}>Filters</span>
            {activeClusters.map(cl => (
              <Chip key={cl} active={clusterFilters.has(cl)} color={CLUSTER_COLORS[cl]} onClick={() => toggleSet(setClusterFilters, clusterFilters, cl)} onRemove>{CLUSTER_LABELS[cl]}</Chip>
            ))}
            <div style={{ width: 1, height: 16, background: C.borderSubtle }} />
            {activeTypes.map(t => (
              <Chip key={t} active={typeFilters.has(t)} onClick={() => toggleSet(setTypeFilters, typeFilters, t)} onRemove>{t === 'reddit' ? 'Reddit' : t === 'web' ? 'Web' : 'PDF'}</Chip>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: C.fg4 }}>Sort</span>
            {[['relevance', 'Relevance'], ['date', 'Date'], ['score', 'Score']].map(([k, l]) => (
              <button key={k} onClick={() => setSort(k)} style={{
                padding: '3px 9px', borderRadius: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 11,
                background: sort === k ? C.bgActive : 'transparent', color: sort === k ? C.fg1 : C.fg3,
                border: `1px solid ${sort === k ? C.borderDef : C.borderSubtle}`,
              }}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {!hasQuery ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 540, maxWidth: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Icon name="search" size={26} color={C.fg3} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, color: C.fg2 }}>Search your network</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.fg4, marginBottom: 10 }}>Try a query</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SEARCH_SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => setQuery(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, fontFamily: MONO, fontSize: 12.5, color: C.fg2, transition: 'all 150ms ease-out',
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderDef; e.currentTarget.style.color = C.fg1; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderSubtle; e.currentTarget.style.color = C.fg2; }}>
                  <Icon name="search" size={13} color={C.fg4} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : vp.isMobile ? (
        !mobileDetail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '9px 16px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: C.fg1, fontFamily: MONO }}>{results.length}</span>
              <span style={{ fontSize: 12, color: C.fg3 }}>result{results.length !== 1 ? 's' : ''} · {mode}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {results.map(r => <ResultRow key={r.id} r={r} selected={selected && r.id === selected.id} onClick={() => { setSelId(r.id); setMobileDetail(true); }} />)}
              {results.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No results found</div>}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <button onClick={() => setMobileDetail(false)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '11px 16px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0,
              background: 'none', border: 'none', borderBottomColor: C.borderSubtle, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: C.fg2,
            }}>
              <Icon name="arrow-left" size={14} color="currentColor" /> Back to {results.length} results
            </button>
            {selected ? <SearchDetail r={selected} /> : <div style={{ flex: 1 }} />}
          </div>
        )
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${C.borderSubtle}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '9px 16px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: C.fg1, fontFamily: MONO }}>{results.length}</span>
              <span style={{ fontSize: 12, color: C.fg3 }}>result{results.length !== 1 ? 's' : ''} · {mode}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {results.map(r => <ResultRow key={r.id} r={r} selected={selected && r.id === selected.id} onClick={() => setSelId(r.id)} />)}
              {results.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: C.fg3, fontSize: 13 }}>No results found</div>}
            </div>
          </div>
          {selected ? <SearchDetail r={selected} /> : <div style={{ flex: 1 }} />}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SearchScreen });
