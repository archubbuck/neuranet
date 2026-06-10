// TopicNet Prototype — Reports / analytics dashboard
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

function KpiCard({ value, label, change, pos, spark, color }) {
  const vp = useViewport();
  return (
    <div style={{ flex: 1, background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: 16, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: C.fg1, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12.5, color: C.fg3, marginTop: 6 }}>{label}</div>
        </div>
        {change && <span style={{ fontSize: 11, color: pos ? C.emerald : C.rose, background: `${pos ? C.emerald : C.rose}18`, padding: '2px 7px', borderRadius: 3, flexShrink: 0, fontFamily: MONO }}>{change}</span>}
      </div>
      {spark && <div style={{ marginTop: 12 }}><Sparkline data={spark} color={color} width={vp.isMobile ? 110 : 150} height={26} /></div>}
    </div>
  );
}

function Panel({ title, right, children, style }) {
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.fg1 }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function DateRange() {
  const [active, setActive] = React.useState('30d');
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {['7d', '30d', '90d', 'Custom'].map(o => (
        <button key={o} onClick={() => setActive(o)} style={{
          padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 12,
          background: active === o ? C.bgActive : 'transparent', color: active === o ? C.fg1 : C.fg3,
          border: `1px solid ${active === o ? C.borderDef : C.borderSubtle}`, transition: 'all 150ms ease-out',
        }}>{o}</button>
      ))}
    </div>
  );
}

function ReportsScreen() {
  const app = useApp();
  const vp = useViewport();
  const peakIdx = RPT.ingest.indexOf(Math.max(...RPT.ingest));
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bgBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: vp.isNarrow ? '10px 14px' : '12px 20px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.fg1 }}>30-day overview</span>
        {!vp.isMobile && <span style={{ fontSize: 12.5, color: C.fg4, fontFamily: MONO }}>May 1–30, 2026</span>}
        <div style={{ flex: 1 }} />
        <DateRange />
        <Btn variant="secondary" size="sm" icon="download" onClick={() => app.showToast('Report exported as PDF')}>Export</Btn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: vp.isNarrow ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* KPI strip */}
        <div style={vp.isMobile
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }
          : { display: 'flex', gap: 12, flexShrink: 0 }}>
          <KpiCard value="6,620" label="Nodes discovered" change="+57%" pos spark={RPT.nodes} color={C.amber} />
          <KpiCard value="72.8K" label="Docs processed" change="+77%" pos spark={RPT.docs} color={CLUSTER_COLORS.cyan} />
          <KpiCard value="+0.50" label="Avg sentiment" change="+0.22" pos spark={RPT.sent} color={C.emerald} />
          <KpiCard value="2,427" label="Avg docs / day" change="+14%" pos spark={RPT.ingest} color={CLUSTER_COLORS.violet} />
        </div>

        {/* Two-column body */}
        <div style={{ flex: vp.isMobile ? 'none' : 1, display: 'flex', flexDirection: vp.isMobile ? 'column' : 'row', gap: 14, minHeight: 0 }}>
          {/* Left */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <Panel title="Network growth" right={
              <>
                <div style={{ display: 'flex', gap: 14 }}>
                  <Legendlet color={C.amber} label="Nodes" />
                  <Legendlet color={CLUSTER_COLORS.cyan} label="Docs (K)" dim />
                </div>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>4,210 → 6,620 (+57%)</span>
              </>
            } style={{ flexShrink: 0 }}>
              <DualAreaChart data={RPT.nodes} color={C.amber} data2={RPT.docs} color2={CLUSTER_COLORS.cyan} labels={RPT.labels} height={130} />
            </Panel>

            <Panel title="Ingestion activity" right={
              <><div style={{ flex: 1 }} /><span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO }}>peak 4,600 docs · May 28</span></>
            } style={{ flex: vp.isMobile ? 'none' : 1, minHeight: 0 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <BarChart data={RPT.ingest} color={C.amber} height={150} peakIdx={peakIdx} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: C.fg4 }}>May 1</span>
                  <span style={{ fontSize: 10, color: C.fg4 }}>May 30</span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Right */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <Panel title="Group sentiment" right={<span style={{ fontSize: 11, color: C.fg4 }}>diverging from 0</span>} style={{ flex: vp.isMobile ? 'none' : 1, minHeight: 0 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
                {RPT_CLUSTERS.map(c => {
                  const pos = c.sentVal >= 0, barPct = Math.abs(c.sentVal) * 90;
                  const color = CLUSTER_COLORS[c.key];
                  return (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80`, flexShrink: 0 }} />
                      <span style={{ width: 64, fontSize: 11.5, color: C.fg2, flexShrink: 0 }}>{c.name}</span>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 3, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.14)' }} />
                        <div style={{
                          position: 'absolute', top: 0, height: '100%',
                          ...(pos ? { left: '50%' } : { right: '50%' }), width: `${barPct / 2}%`,
                          background: pos ? `${C.emerald}45` : `${C.rose}45`,
                          borderRadius: pos ? '0 3px 3px 0' : '3px 0 0 3px',
                          borderRight: pos ? `1.5px solid ${C.emerald}` : 'none', borderLeft: !pos ? `1.5px solid ${C.rose}` : 'none',
                        }} />
                      </div>
                      <span style={{ width: 38, textAlign: 'right', fontSize: 11.5, color: pos ? C.emerald : C.rose, fontFamily: MONO, flexShrink: 0 }}>{c.sent}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Top sources" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {RPT_TOP_SOURCES.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: i < RPT_TOP_SOURCES.length - 1 ? `1px solid ${C.borderSubtle}` : 'none' }}>
                    <SourceTypeIcon type={s.type} size={20} radius={4} />
                    <span style={{ flex: 1, fontSize: 12.5, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ fontSize: 12.5, color: C.fg1, fontFamily: MONO }}>{s.docs}</span>
                    <span style={{ width: 58, textAlign: 'right', fontSize: 11, color: C.fg4, fontFamily: MONO, flexShrink: 0 }}>{s.rate}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legendlet({ color, label, dim }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 18, height: 2, background: color, borderRadius: 1, opacity: dim ? 0.6 : 1 }} />
      <span style={{ fontSize: 10.5, color: C.fg4 }}>{label}</span>
    </div>
  );
}

Object.assign(window, { ReportsScreen });
