// TopicNet Prototype — onboarding empty state + live ingestion
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

const OB_VW = 960, OB_VH = 560;

// Ghost / forming graph. revealCount = how many nodes are "formed" (solid).
function OnboardingGraph({ revealCount = 0, ghost = false }) {
  const formed = revealCount;
  // Reveal order: by descending radius so hubs appear first
  const order = React.useMemo(() => [...NETWORK_NODES].sort((a, b) => b.r - a.r).map(n => n.id), []);
  const rank = (id) => order.indexOf(id);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${OB_VW} ${OB_VH}`} preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
      <defs>
        <pattern id="ob-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.045)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={OB_VW} height={OB_VH} fill="url(#ob-grid)" />
      {NETWORK_EDGES.map((e, i) => {
        const both = rank(e.from.id) < formed && rank(e.to.id) < formed;
        return <line key={i} x1={e.from.cx} y1={e.from.cy} x2={e.to.cx} y2={e.to.cy}
          stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 3"
          opacity={ghost ? 0.13 : both ? 0.45 : 0.05} style={{ transition: 'opacity 500ms ease-out' }} />;
      })}
      {NETWORK_NODES.map(n => {
        const color = CLUSTER_COLORS[n.cluster];
        const isFormed = !ghost && rank(n.id) < formed;
        const op = ghost ? 0.16 : isFormed ? 1 : 0.12;
        return (
          <g key={n.id} style={{ transition: 'opacity 500ms ease-out', opacity: op }}>
            <circle cx={n.cx} cy={n.cy} r={n.r + 7} fill={color} opacity={isFormed ? 0.14 : 0.06} />
            <circle cx={n.cx} cy={n.cy} r={n.r} fill={color} fillOpacity={isFormed || ghost ? 0.8 : 0.3}
              stroke={color} strokeWidth={isFormed ? 1.5 : 1} strokeOpacity={isFormed ? 0.5 : 0.2}
              strokeDasharray={!ghost && !isFormed ? '3 2' : 'none'}
              style={{ filter: isFormed ? `drop-shadow(0 0 8px ${color}90)` : 'none' }} />
            {isFormed && (
              <text x={n.cx} y={n.cy + n.r + 12} textAnchor="middle" fontSize={Math.max(9, Math.min(11, n.r * 0.6))}
                fontFamily={FONT} fill={C.fg2} style={{ userSelect: 'none' }}>{n.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function EmptySidebar() {
  const app = useApp();
  return (
    <div style={{ width: 244, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: C.bgSurface, borderRight: `1px solid ${C.borderSubtle}` }}>
      <div style={{ display: 'flex', padding: '0 6px', borderBottom: `1px solid ${C.borderSubtle}` }}>
        {['Groups', 'Sources'].map((t, i) => (
          <div key={t} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0 10px', borderBottom: `2px solid ${i === 0 ? C.amber : 'transparent'}`, marginBottom: -1 }}>
            <span style={{ fontSize: 12.5, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.fg1 : C.fg3 }}>{t}</span>
            <span style={{ fontSize: 10, fontFamily: MONO, color: C.fg4, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 999 }}>{app.ingesting ? (i === 1 ? 1 : 0) : 0}</span>
          </div>
        ))}
      </div>
      {app.ingesting ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.borderSubtle}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 7 }}>
              <SourceTypeIcon type={app.ingesting.source.type} size={22} radius={5} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{app.ingesting.source.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.amber, boxShadow: `0 0 5px ${C.amber}` }} />
                  <span style={{ fontSize: 10.5, color: C.amber }}>ingesting {Math.round(app.ingesting.pct)}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginLeft: 31, overflow: 'hidden' }}>
              <div style={{ width: `${app.ingesting.pct}%`, height: '100%', background: C.amber, borderRadius: 2, transition: 'width 400ms ease-out' }} />
            </div>
          </div>
          <div style={{ padding: '10px 14px', fontSize: 11, color: C.fg4, fontStyle: 'italic' }}>Groups appear as sources finish ingesting</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px dashed ${C.fg3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="circle-dot" size={17} color={C.fg3} /></div>
          <div style={{ fontSize: 13, color: C.fg3 }}>No clusters yet</div>
          <div style={{ fontSize: 11.5, color: C.fg4, textAlign: 'center', lineHeight: 1.5 }}>Add a source to begin mapping your network</div>
        </div>
      )}
      <div style={{ padding: 10, borderTop: `1px solid ${C.borderSubtle}` }}>
        <Btn variant={app.ingesting ? 'secondary' : 'primary'} size="sm" icon="plus" onClick={() => app.setAddSrc(true)} style={{ width: '100%' }}>Add source</Btn>
      </div>
    </div>
  );
}

function OnboardingScreen() {
  const app = useApp();
  const vp = useViewport();
  const ing = app.ingesting;
  const revealCount = ing ? Math.floor(ing.pct / 100 * NETWORK_NODES.length) : 0;
  const started = ing && ing.pct > 8;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: C.bgBase }}>
      {!vp.isMobile && <EmptySidebar />}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <OnboardingGraph revealCount={revealCount} ghost={!started} />

        {/* Idle empty-state card */}
        {!ing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: vp.isNarrow ? 26 : 36, borderRadius: 12, maxWidth: 360, width: '100%', textAlign: 'center',
              background: 'rgba(9,14,28,0.86)', border: `1px solid ${C.borderDef}`, backdropFilter: 'blur(12px)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: C.amberDim, border: `1.5px solid ${C.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="network" size={22} color={C.amber} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.fg1, marginBottom: 8, letterSpacing: '-0.02em' }}>Your network is empty</h2>
                <p style={{ fontSize: 13, color: C.fg3, lineHeight: 1.6 }}>Add a source to start populating your knowledge graph. TopicNet ingests Reddit, the web, and PDFs — then maps the structure within.</p>
              </div>
              <Btn variant="primary" size="lg" icon="plus" onClick={() => app.setAddSrc(true)}>Add first source</Btn>
              <button onClick={() => { app.startIngestion({ type: 'reddit', name: 'Sample workspace', demo: true }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12, color: C.fg4 }}>
                or <span style={{ color: C.info }}>explore a demo workspace</span>
              </button>
            </div>
          </div>
        )}

        {/* Ingestion progress */}
        {ing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '28px 36px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(9,14,28,0.82)', border: `1px solid ${C.borderDef}`, backdropFilter: 'blur(12px)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            }}>
              <ProgressRing pct={ing.pct} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.fg1, marginBottom: 6 }}>{ing.source.demo ? 'Building a sample workspace' : `Ingesting ${ing.source.name}`}</div>
                <div style={{ fontSize: 12.5, color: C.fg3, lineHeight: 1.5 }}>Processing sources and building the topic model…</div>
              </div>
              <div style={{ display: 'flex', gap: 30 }}>
                <div><div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: CLUSTER_COLORS.cyan }}>{ing.docs.toLocaleString()}</div><div style={{ fontSize: 11, color: C.fg4, marginTop: 2 }}>sources processed</div></div>
                <div><div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: C.fg1 }}>{ing.eta}</div><div style={{ fontSize: 11, color: C.fg4, marginTop: 2 }}>remaining</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ pct }) {
  const r = 26, circ = Math.PI * 2 * r;
  return (
    <svg width={64} height={64}>
      <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle cx={32} cy={32} r={r} fill="none" stroke={CLUSTER_COLORS.cyan} strokeWidth={3.5}
        strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dasharray 400ms ease-out', filter: `drop-shadow(0 0 5px ${CLUSTER_COLORS.cyan})` }} />
      <text x={32} y={32} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fontFamily={MONO} fill={C.fg1}>{Math.round(pct)}%</text>
    </svg>
  );
}

Object.assign(window, { OnboardingScreen });
