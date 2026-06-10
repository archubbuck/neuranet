// TopicNet Prototype — full-page 3-column Topic Detail
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

function dTypeColor(t) { return t === 'reddit' ? C.reddit : t === 'pdf' ? C.pdf : C.info; }

// Per-kind descriptors for topic source breakdowns
const KIND_ORDER = ['post', 'comment', 'web', 'document'];
const KIND_META = {
  post:     { label: 'Posts',     color: SOURCE_KINDS.post.color,    icon: 'message-square' },
  comment:  { label: 'Comments',  color: SOURCE_KINDS.comment.color, icon: 'message-circle' },
  web:      { label: 'Web URLs',  color: SOURCE_KINDS.web.color,     icon: 'globe' },
  document: { label: 'Documents', color: SOURCE_KINDS.pdf.color,     icon: 'file-text' },
};
function detailMeta(s) {
  if (s.type === 'post' || s.type === 'comment') return `${s.feed} · ${(s.score || 0).toLocaleString()} upvotes`;
  if (s.type === 'web') return s.url || s.feed;
  if (s.type === 'document') return `${s.feed} · ${s.pages} ${s.pages === 1 ? 'page' : 'pages'}`;
  return s.feed;
}

function KeywordList({ keywords, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {keywords.map((kw, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.fg2, width: 168, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kw.term}</span>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{ width: `${kw.score}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.6 }} />
          </div>
          <span style={{ fontSize: 11, color: C.fg4, width: 26, textAlign: 'right', flexShrink: 0, fontFamily: MONO }}>{kw.score}</span>
        </div>
      ))}
    </div>
  );
}

function DetailOverview({ node }) {
  const vp = useViewport();
  const peak = node.activity.at(-1), prev = node.activity.at(-2);
  const delta = prev ? Math.round((peak - prev) / prev * 100) : 0;
  const avg = Math.round(node.activity.reduce((a, b) => a + b, 0) / node.activity.length);
  const { positive, neutral, negative } = node.sentimentBreakdown;
  const sCol = node.sentiment > 0.15 ? C.emerald : node.sentiment < -0.15 ? C.rose : C.amber;
  const sLabel = node.sentiment > 0.45 ? 'strongly positive' : node.sentiment > 0.15 ? 'mildly positive'
    : node.sentiment < -0.3 ? 'strongly negative' : node.sentiment < -0.15 ? 'mildly negative' : 'neutral';
  return (
    <div style={vp.isMobile ? { padding: '18px 16px' } : { padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <SecLabel action={<span style={{ fontSize: 10, color: C.fg4 }}>12-week mention volume</span>}>Activity</SecLabel>
      <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, padding: '14px 16px' }}>
        <LineAreaChart data={node.activity} labels={node.activityLabels} color={node.color} gradId={'full-' + node.id} />
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
        {[{ v: peak, l: 'this week', c: node.color }, { v: `${delta >= 0 ? '+' : ''}${delta}%`, l: 'vs. last week', c: delta >= 0 ? C.emerald : C.rose }, { v: avg, l: '12-week avg', c: C.fg2 }].map(s => (
          <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: s.c }}>{s.v}</span>
            <span style={{ fontSize: 11, color: C.fg3 }}>{s.l}</span>
          </div>
        ))}
      </div>
      <Divider />
      <SecLabel>Sentiment</SecLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: sCol, letterSpacing: '-0.03em' }}>{node.sentiment >= 0 ? '+' : ''}{node.sentiment.toFixed(2)}</span>
        <span style={{ fontSize: 12, color: C.fg3 }}>{sLabel}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, display: 'flex', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${positive}%`, background: C.emerald }} />
        <div style={{ width: `${neutral}%`, background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ width: `${negative}%`, background: C.rose }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[['Positive', positive, C.emerald], ['Neutral', neutral, C.fg3], ['Negative', negative, C.rose]].map(([l, p, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: C.fg3 }}>{l}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.fg2, fontFamily: MONO }}>{p}%</span>
          </div>
        ))}
      </div>
      <Divider />
      <SecLabel action={<span style={{ fontSize: 10, color: C.fg4 }}>TF-IDF relevance</span>}>Top keywords</SecLabel>
      <KeywordList keywords={node.keywords} color={node.color} />
    </div>
  );
}

function DetailTimeline({ node }) {
  const vp = useViewport();
  return (
    <div style={vp.isMobile ? { padding: '18px 16px' } : { padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      {node.timeline.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10, flexShrink: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', marginTop: 3, flexShrink: 0,
              background: i === 0 ? node.color : C.bgOverlay, border: `1.5px solid ${i === 0 ? node.color : C.borderDef}`,
              boxShadow: i === 0 ? `0 0 10px ${node.color}60` : 'none',
            }} />
            {i < node.timeline.length - 1 && <div style={{ flex: 1, width: 1, background: C.borderSubtle, marginTop: 4, minHeight: 28 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: i < node.timeline.length - 1 ? 28 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.fg3 }}>{item.date}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 3,
                background: i === 0 ? `${node.color}18` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 0 ? `${node.color}30` : C.borderSubtle}`, color: i === 0 ? node.color : C.fg3,
              }}>{item.tag}</span>
              {item.delta && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: item.pos ? C.emerald : C.rose }}>{item.delta}</span>}
            </div>
            <p style={{ fontSize: 13, color: C.fg2, lineHeight: 1.7, textWrap: 'pretty' }}>{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSources({ node }) {
  const vp = useViewport();
  const kc = node.kindCounts || { post: 0, comment: 0, web: 0, document: 0 };
  const total = KIND_ORDER.reduce((a, k) => a + (kc[k] || 0), 0) || 1;
  return (
    <div style={vp.isMobile ? { padding: '18px 16px' } : { padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {KIND_ORDER.map(k => {
          const m = KIND_META[k];
          return (
            <div key={k} style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: `${m.color}14`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icon} size={12} color={m.color} />
                </div>
                <span style={{ fontSize: 12, color: C.fg2 }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: m.color, marginBottom: 2 }}>{(kc[k] || 0).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: C.fg4 }}>{Math.round((kc[k] || 0) / total * 100)}% of sources</div>
            </div>
          );
        })}
      </div>
      <SecLabel action={<span style={{ fontSize: 10, color: C.fg4 }}>showing {node.sourceList.length} of {node.docs.toLocaleString()}</span>}>Recent sources</SecLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {node.sourceList.map((src, i) => {
          const kd = srcKind(src);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 6, background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
              <SourceGlyph kind={kd} size={28} radius={6} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.title}</div>
                <div style={{ fontSize: 10, color: C.fg4, marginTop: 2, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detailMeta(src)} · {src.time}</div>
              </div>
              <SourceKindBadge kind={kd} small withIcon={false} />
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: src.status === 'ready' ? C.emerald : src.status === 'ingesting' ? C.amber : C.rose,
                boxShadow: src.status === 'ingesting' ? `0 0 5px ${C.amber}` : 'none',
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailLeftPanel({ node }) {
  const vp = useViewport();
  return (
    <div style={vp.isMobile
      ? { width: '100%', background: C.bgSurface, borderBottom: `1px solid ${C.borderDef}`, display: 'flex', flexDirection: 'column' }
      : { width: 312, flexShrink: 0, background: C.bgSurface, borderRight: `1px solid ${C.borderSubtle}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 18, position: 'relative',
          background: `radial-gradient(circle at 35% 35%, ${node.color}cc, ${node.color}88)`,
          boxShadow: `0 0 24px ${node.color}50, 0 0 60px ${node.color}1a` }}>
          <div style={{ position: 'absolute', top: 10, left: 11, width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: C.fg1, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>{node.label}</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 14, padding: '3px 9px', borderRadius: 3, background: `${node.color}14`, border: `1px solid ${node.color}28` }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.color }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: node.color }}>{node.clusterLabel || CLUSTER_LABELS[node.cluster]}</span>
        </div>
        <p style={{ fontSize: 12, color: C.fg3, lineHeight: 1.7, textWrap: 'pretty' }}>{node.description}</p>
      </div>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <SecLabel>Metrics</SecLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ l: 'Sources', v: node.docs.toLocaleString(), c: node.color }, { l: 'Sentiment', v: (node.sentiment >= 0 ? '+' : '−') + Math.abs(node.sentiment).toFixed(2), c: node.sentiment >= 0 ? C.emerald : C.rose }, { l: 'Connections', v: node.connections.length, c: C.amber }, { l: 'Centrality', v: node.centrality.toFixed(3), c: C.rose }].map(m => (
            <div key={m.l} style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 7, padding: '12px 14px' }}>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: m.c, letterSpacing: '-0.02em', marginBottom: 3 }}>{m.v}</div>
              <div style={{ fontSize: 10, color: C.fg4, letterSpacing: '0.03em' }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <SecLabel>Graph importance</SecLabel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: C.amber, letterSpacing: '-0.03em' }}>{node.importance.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: C.fg3 }}>/ 10</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${node.importance * 10}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, rgba(251,191,36,0.6), #FBBF24)` }} />
        </div>
        <p style={{ fontSize: 11, color: C.fg4, lineHeight: 1.55 }}>Ranked {node.rank}{['st','nd','rd'][node.rank-1]||'th'} of {node.nodeCount || NETWORK_NODES.length} nodes by betweenness centrality.</p>
      </div>
      <div style={{ padding: '16px 24px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 7px ${C.emerald}`, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.fg3 }}>Last ingested</span>
          <span style={{ fontSize: 11, color: C.fg2, fontFamily: MONO }}>4 min ago</span>
        </div>
      </div>
    </div>
  );
}

function DetailRightPanel({ node, topics }) {
  const app = useApp();
  const vp = useViewport();
  const kc = node.kindCounts || { post: 0, comment: 0, web: 0, document: 0 };
  const maxKc = Math.max(...KIND_ORDER.map(k => kc[k] || 0), 1);
  const [hov, setHov] = React.useState(null);
  const actions = [
    { label: 'Run query on this topic', icon: 'search', accent: true, onClick: () => app.setScreen('search') },
    { label: 'Export node data', icon: 'download', accent: false, onClick: () => app.showToast('Exported node data as JSON') },
    { label: 'Add to watchlist', icon: 'star', accent: false, onClick: () => app.showToast(`Added "${node.label}" to watchlist`) },
  ];
  return (
    <div style={vp.isMobile
      ? { width: '100%', background: C.bgSurface, borderTop: `1px solid ${C.borderDef}`, display: 'flex', flexDirection: 'column' }
      : { width: 292, flexShrink: 0, background: C.bgSurface, borderLeft: `1px solid ${C.borderSubtle}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <SecLabel>Connected topics ({topics.length})</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topics.map(cn => {
            const h = hov === cn.id;
            return (
              <div key={cn.id} onClick={() => app.openFullDetail(cn.id)} onMouseEnter={() => setHov(cn.id)} onMouseLeave={() => setHov(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                  background: h ? `${cn.color}0a` : C.bgElevated, border: `1px solid ${h ? `${cn.color}35` : C.borderSubtle}`, transition: 'all 200ms ease-out' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cn.color, boxShadow: `0 0 6px ${cn.color}70` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cn.label}</div>
                  <div style={{ fontSize: 10, color: C.fg4, marginTop: 1, fontFamily: MONO }}>{cn.docs.toLocaleString()} sources</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.fg3, fontFamily: MONO }}>{cn.strength}</span>
                  <div style={{ width: 38, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
                    <div style={{ width: `${cn.strength}%`, height: '100%', background: cn.color, borderRadius: 1, opacity: 0.65 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '20px 20px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        <SecLabel>Source breakdown</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {KIND_ORDER.map(k => {
            const m = KIND_META[k];
            const v = kc[k] || 0;
            return (
              <div key={k}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, background: `${m.color}14`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={m.icon} size={11} color={m.color} />
                    </div>
                    <span style={{ fontSize: 12, color: C.fg2 }}>{m.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.fg3, fontFamily: MONO }}>{v.toLocaleString()}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${v / maxKc * 100}%`, height: '100%', background: m.color, borderRadius: 2, opacity: 0.55 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <SecLabel>Actions</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {actions.map(a => {
            const [h, setH] = [hov === a.label, () => {}];
            return (
              <button key={a.label} onClick={a.onClick} onMouseEnter={() => setHov(a.label)} onMouseLeave={() => setHov(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 5, width: '100%',
                  background: hov === a.label ? (a.accent ? 'rgba(251,191,36,0.08)' : C.bgHover) : 'transparent',
                  border: `1px solid ${hov === a.label ? (a.accent ? C.borderAccent : C.borderDef) : C.borderSubtle}`,
                  cursor: 'pointer', fontFamily: FONT, fontSize: 12, textAlign: 'left', color: hov === a.label ? C.fg1 : C.fg2, transition: 'all 200ms ease-out' }}>
                <Icon name={a.icon} size={14} color={C.amber} />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FullDetail() {
  const app = useApp();
  const vp = useViewport();
  const node = app.selectedNodeId != null ? getNodeDetail(app.selectedNodeId, app.wctx) : null;
  const topics = app.selectedNodeId != null ? connectedTopics(app.selectedNodeId, app.wctx) : [];
  const [tab, setTab] = React.useState('overview');
  React.useEffect(() => { setTab('overview'); }, [app.selectedNodeId]);
  if (!node) return null;
  const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'timeline', label: 'Timeline' }, { id: 'sources', label: 'Sources' }];

  if (vp.isMobile) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.bgBase, WebkitOverflowScrolling: 'touch' }}>
        <DetailLeftPanel node={node} />
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, padding: '0 16px', borderBottom: `1px solid ${C.borderSubtle}`, background: C.bgSurface, overflowX: 'auto' }}>
            {TABS.map(t => {
              const on = t.id === tab;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: '13px 0 11px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                  fontSize: 13, fontWeight: on ? 600 : 400, color: on ? C.fg1 : C.fg3, fontFamily: FONT,
                  borderBottom: `2px solid ${on ? C.amber : 'transparent'}`, letterSpacing: '-0.01em',
                }}>{t.label}</button>
              );
            })}
          </div>
          {tab === 'overview' && <DetailOverview node={node} />}
          {tab === 'timeline' && <DetailTimeline node={node} />}
          {tab === 'sources' && <DetailSources node={node} />}
        </div>
        <DetailRightPanel node={node} topics={topics} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', background: C.bgBase }}>
      <DetailLeftPanel node={node} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 28px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, background: C.bgSurface }}>
          {TABS.map(t => {
            const on = t.id === tab;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '14px 0 12px', marginRight: 24, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: on ? 600 : 400, color: on ? C.fg1 : C.fg3, fontFamily: FONT,
                borderBottom: `2px solid ${on ? C.amber : 'transparent'}`, letterSpacing: '-0.01em', transition: 'color 150ms ease-out',
              }}>{t.label}</button>
            );
          })}
          <div style={{ flex: 1 }} />
          <button onClick={() => app.setDetailView('panel')} style={{
            alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6,
            background: 'transparent', border: `1px solid ${C.borderSubtle}`, color: C.fg3, cursor: 'pointer', fontFamily: FONT, fontSize: 11.5,
          }} onMouseEnter={e => { e.currentTarget.style.color = C.fg1; e.currentTarget.style.borderColor = C.borderDef; }}
             onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.borderColor = C.borderSubtle; }}>
            <Icon name="chevron-left" size={13} color="currentColor" /> Back to graph
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {tab === 'overview' && <DetailOverview node={node} />}
          {tab === 'timeline' && <DetailTimeline node={node} />}
          {tab === 'sources' && <DetailSources node={node} />}
        </div>
      </div>
      <DetailRightPanel node={node} topics={topics} />
    </div>
  );
}

Object.assign(window, { FullDetail });
