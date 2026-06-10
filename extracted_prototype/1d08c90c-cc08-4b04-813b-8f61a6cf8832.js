// TopicNet Prototype — slide-in node detail panel (analytics + timeline)
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

function SentimentStrip({ breakdown, score }) {
  const { positive, neutral, negative } = breakdown;
  const col = score > 0.15 ? C.emerald : score < -0.15 ? C.rose : C.amber;
  const label = score > 0.45 ? 'strongly positive' : score > 0.15 ? 'mildly positive'
    : score < -0.3 ? 'strongly negative' : score < -0.15 ? 'mildly negative' : 'neutral';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: col, letterSpacing: '-0.03em' }}>
          {score >= 0 ? '+' : ''}{score.toFixed(2)}
        </span>
        <span style={{ fontSize: 11.5, color: C.fg3 }}>{label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, display: 'flex', overflow: 'hidden', marginBottom: 9 }}>
        <div style={{ width: `${positive}%`, background: C.emerald }} />
        <div style={{ width: `${neutral}%`, background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ width: `${negative}%`, background: C.rose }} />
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {[['Positive', positive, C.emerald], ['Neutral', neutral, C.fg3], ['Negative', negative, C.rose]].map(([l, p, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: C.fg3 }}>{l}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.fg2, fontFamily: MONO }}>{p}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedTopics({ topics, onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {topics.map((t, i) => (
        <div key={t.id} onClick={() => onPick(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
          background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, transition: 'all 150ms ease-out',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.color + '45'; e.currentTarget.style.background = t.color + '0a'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderSubtle; e.currentTarget.style.background = C.bgElevated; }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 6px ${t.color}70`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
            <div style={{ fontSize: 10, color: C.fg4, fontFamily: MONO, marginTop: 1 }}>{t.docs.toLocaleString()} sources</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.fg3, fontFamily: MONO }}>{t.strength}</span>
            <div style={{ width: 36, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }}>
              <div style={{ width: `${t.strength}%`, height: '100%', background: t.color, borderRadius: 1, opacity: 0.65 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniTimeline({ items, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.slice(0, 4).map((t, i, arr) => (
        <div key={i} style={{ display: 'flex', gap: 11 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 9, flexShrink: 0 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', marginTop: 3, flexShrink: 0,
              background: i === 0 ? color : C.bgOverlay, border: `1.5px solid ${i === 0 ? color : C.borderDef}`,
              boxShadow: i === 0 ? `0 0 8px ${color}60` : 'none',
            }} />
            {i < arr.length - 1 && <div style={{ flex: 1, width: 1, background: C.borderSubtle, marginTop: 3, minHeight: 22 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.fg3 }}>{t.date}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                background: i === 0 ? `${color}18` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 0 ? `${color}30` : C.borderSubtle}`, color: i === 0 ? color : C.fg3,
              }}>{t.tag}</span>
              {t.delta && <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: t.pos ? C.emerald : C.rose }}>{t.delta}</span>}
            </div>
            <p style={{ fontSize: 12, color: C.fg2, lineHeight: 1.6, textWrap: 'pretty' }}>{t.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideInDetail() {
  const app = useApp();
  const vp = useViewport();
  const open = app.detailView === 'panel' && app.selectedNodeId != null;
  const node = app.selectedNodeId != null ? getNodeDetail(app.selectedNodeId, app.wctx) : null;
  const topics = app.selectedNodeId != null ? connectedTopics(app.selectedNodeId, app.wctx) : [];

  // Keep last node for slide-out animation
  const [cached, setCached] = React.useState(node);
  React.useEffect(() => { if (node) setCached(node); }, [app.selectedNodeId]);
  const n = node || cached;

  const peak = n ? n.activity.at(-1) : 0;
  const prev = n ? n.activity.at(-2) : 1;
  const delta = prev ? Math.round((peak - prev) / prev * 100) : 0;
  const avg = n ? Math.round(n.activity.reduce((a, b) => a + b, 0) / n.activity.length) : 0;

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, height: '100%', width: vp.isMobile ? '100%' : 360, maxWidth: '100%', zIndex: 30,
      transform: open ? 'translateX(0)' : 'translateX(110%)',
      transition: 'transform 300ms ease-out',
      background: C.bgSurface, borderLeft: `1px solid ${C.borderDef}`,
      boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column',
    }}>
      {n && (
        <>
          {/* Header */}
          <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 3,
                background: `${n.color}14`, border: `1px solid ${n.color}28`,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: n.color }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: n.color }}>{n.clusterLabel || CLUSTER_LABELS[n.cluster]}</span>
              </span>
              <div style={{ flex: 1 }} />
              <IconBtn name="maximize" title="Expand to full view" size={28} iconSize={14} onClick={() => app.openFullDetail(n.id)} />
              <IconBtn name="x" title="Close" size={28} iconSize={15} onClick={() => app.closeDetail()} />
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative',
                background: `radial-gradient(circle at 35% 35%, ${n.color}cc, ${n.color}88)`,
                boxShadow: `0 0 20px ${n.color}50, 0 0 48px ${n.color}1a`,
              }}>
                <div style={{ position: 'absolute', top: 8, left: 9, width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: C.fg1, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{n.label}</h2>
            </div>
            <p style={{ fontSize: 12, color: C.fg3, lineHeight: 1.65, marginBottom: 18, textWrap: 'pretty' }}>{n.description}</p>

            {/* Metrics 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {[
                { l: 'Sources', v: n.docs.toLocaleString(), c: n.color },
                { l: 'Sentiment', v: (n.sentiment >= 0 ? '+' : '−') + Math.abs(n.sentiment).toFixed(2), c: n.sentiment >= 0 ? C.emerald : C.rose },
                { l: 'Connections', v: n.connections.length, c: C.amber },
                { l: 'Centrality', v: n.centrality.toFixed(3), c: CLUSTER_COLORS.violet },
              ].map(m => (
                <div key={m.l} style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 7, padding: '11px 13px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: m.c, letterSpacing: '-0.02em', marginBottom: 3 }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: C.fg4, letterSpacing: '0.03em' }}>{m.l}</div>
                </div>
              ))}
            </div>

            {/* Activity */}
            <SecLabel action={<span style={{ fontSize: 10, color: C.fg4 }}>12-week volume</span>}>Activity</SecLabel>
            <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, padding: '12px 14px' }}>
              <LineAreaChart data={n.activity} labels={n.activityLabels} color={n.color} gradId={'panel-' + n.id} />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[
                { v: peak, l: 'this week', c: n.color },
                { v: `${delta >= 0 ? '+' : ''}${delta}%`, l: 'vs. last', c: delta >= 0 ? C.emerald : C.rose },
                { v: avg, l: '12-wk avg', c: C.fg2 },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: s.c }}>{s.v}</span>
                  <span style={{ fontSize: 10.5, color: C.fg3 }}>{s.l}</span>
                </div>
              ))}
            </div>

            <Divider />
            <SecLabel>Sentiment</SecLabel>
            <SentimentStrip breakdown={n.sentimentBreakdown} score={n.sentiment} />

            <Divider />
            <SecLabel>Connected topics ({topics.length})</SecLabel>
            <RankedTopics topics={topics} onPick={(id) => app.selectNode(id)} />

            <Divider />
            <SecLabel>Recent timeline</SecLabel>
            <MiniTimeline items={n.timeline} color={n.color} />
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.borderSubtle}`, flexShrink: 0, display: 'flex', gap: 8 }}>
            <Btn variant="secondary" size="md" icon="maximize" onClick={() => app.openFullDetail(n.id)} style={{ flex: 1 }}>Full detail</Btn>
            <Btn variant="primary" size="md" iconRight="arrow-right" onClick={() => { app.setScreen('search'); }} style={{ flex: 1 }}>Query topic</Btn>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { SlideInDetail });
