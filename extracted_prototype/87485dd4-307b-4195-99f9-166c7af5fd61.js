// TopicNet Prototype — Settings modal (two-column, tab nav, dirty-state)
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

const SETTINGS_NAV = [
  { id: 'workspace', icon: 'layers', label: 'Workspace' },
  { id: 'ingestion', icon: 'database', label: 'Ingestion' },
  { id: 'credentials', icon: 'key', label: 'Credentials' },
  { id: 'account', icon: 'user', label: 'Account' },
  { id: 'notifications', icon: 'bell', label: 'Notifications' },
  { id: 'appearance', icon: 'sliders', label: 'Appearance' },
];

const SETTINGS_DEFAULTS = {
  ws_name: 'AI Research 2026', ws_desc: '', ws_view: 'Network explorer', ws_layout: 'Force-directed', ws_threshold: '0.65', ws_maxnodes: '2,000',
  ing_max: '50,000', ing_depth: '3 levels', ing_dedup: true, ing_schedule: 'Every 6 hours', ing_pause: false,
  cred_client: 'r8x••••••••', cred_secret: '•••••••••••••••', cred_agent: 'TopicNet/1.0', cred_delay: '1200',
  acc_email: 'user@example.com', acc_tz: 'UTC',
  not_complete: true, not_errors: true, not_cluster: false, not_digest: false,
  app_sidebar: 'Expanded', app_density: 'Compact', app_labels: true, app_weights: false,
};

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 36, height: 21, borderRadius: 999, flexShrink: 0, padding: 0, cursor: 'pointer', position: 'relative',
      background: on ? C.amber : 'rgba(255,255,255,0.10)', border: 'none', transition: 'background 150ms ease-out',
    }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 18 : 2.5, width: 16, height: 16, borderRadius: '50%', background: on ? C.fgOnAccent : C.fg2, transition: 'left 150ms ease-out' }} />
    </button>
  );
}

function SInput({ value, onChange, mono, w = 220, placeholder }) {
  const [foc, setFoc] = React.useState(false);
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        width: w, maxWidth: '100%', padding: '7px 11px', borderRadius: 6, background: C.bgBase,
        border: `1px solid ${foc ? C.amberBorder : C.borderDef}`, boxShadow: foc ? '0 0 0 2px rgba(251,191,36,0.18)' : 'none',
        color: value ? C.fg1 : C.fg3, fontFamily: mono ? MONO : FONT, fontSize: 13, outline: 'none', transition: 'all 150ms ease-out',
      }} />
  );
}

function SSelect({ value, options, onChange, w = 200 }) {
  return (
    <div style={{ position: 'relative', width: w, maxWidth: '100%' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '7px 28px 7px 11px', borderRadius: 6, background: C.bgBase, border: `1px solid ${C.borderDef}`,
        color: C.fg1, fontFamily: FONT, fontSize: 13, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
      }}>
        {options.map(o => <option key={o} value={o} style={{ background: C.bgOverlay }}>{o}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="chevron-down" size={13} color={C.fg3} /></span>
    </div>
  );
}

function Row({ label, desc, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: desc ? 'flex-start' : 'center', gap: 16, padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${C.borderSubtle}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: C.fg1 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: C.fg3, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, paddingTop: desc ? 2 : 0 }}>{children}</div>
    </div>
  );
}

function SecHead({ children }) {
  return <div style={{ fontSize: 16, fontWeight: 600, color: C.fg1, paddingBottom: 12, borderBottom: `1px solid ${C.borderDef}`, marginBottom: 4 }}>{children}</div>;
}

function SubDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 4px' }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.fg4 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.borderSubtle }} />
    </div>
  );
}

// Saved settings persist across screen navigation within the session.
let SETTINGS_SAVED = { ...SETTINGS_DEFAULTS };

function SettingsScreen() {
  const app = useApp();
  const vp = useViewport();
  const [tab, setTab] = React.useState('workspace');
  const [vals, setVals] = React.useState(SETTINGS_SAVED);
  const [saved, setSaved] = React.useState(SETTINGS_SAVED);

  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(vals) !== JSON.stringify(saved);
  // Which sections changed (for nav dots)
  const sectionDirty = (id) => {
    const prefix = { workspace: 'ws_', ingestion: 'ing_', credentials: 'cred_', account: 'acc_', notifications: 'not_', appearance: 'app_' }[id];
    return Object.keys(vals).some(k => k.startsWith(prefix) && vals[k] !== saved[k]);
  };

  const save = () => { SETTINGS_SAVED = vals; setSaved(vals); app.showToast('Settings saved'); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: vp.isMobile ? 'column' : 'row', overflow: 'hidden', background: C.bgBase }}>
          {/* Nav */}
          {vp.isMobile ? (
            <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${C.borderSubtle}`, flexShrink: 0, overflowX: 'auto' }}>
              {SETTINGS_NAV.map(n => {
                const on = tab === n.id;
                return (
                  <button key={n.id} onClick={() => setTab(n.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT, flexShrink: 0,
                    background: on ? C.amberDim : C.bgElevated, border: `1px solid ${on ? C.amberBorder : C.borderSubtle}`,
                    color: on ? C.amber : C.fg3, fontSize: 12.5, whiteSpace: 'nowrap',
                  }}>
                    <Icon name={n.icon} size={14} color={on ? C.amber : 'currentColor'} />
                    {n.label}
                    {sectionDirty(n.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ) : (
          <div style={{ width: 184, flexShrink: 0, borderRight: `1px solid ${C.borderSubtle}`, padding: '12px 10px', display: 'flex', flexDirection: 'column' }}>
            {SETTINGS_NAV.map(n => {
              const on = tab === n.id;
              return (
                <button key={n.id} onClick={() => setTab(n.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6, marginBottom: 2, cursor: 'pointer', width: '100%', fontFamily: FONT,
                  background: on ? 'rgba(255,255,255,0.05)' : 'transparent', borderLeft: `2px solid ${on ? C.amber : 'transparent'}`, border: 'none',
                  color: on ? C.fg1 : C.fg3, fontSize: 13, textAlign: 'left', transition: 'background 150ms ease-out',
                }}>
                  <Icon name={n.icon} size={14} color={on ? C.amber : 'currentColor'} />
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {sectionDirty(n.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: C.fg4, padding: '0 10px' }}>Workspace v1.4.2</div>
          </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: vp.isNarrow ? '16px 16px' : '18px 28px' }}>
              {tab === 'workspace' && (<>
                <SecHead>Workspace</SecHead>
                <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: vp.isMobile ? '0 0' : '0 40px' }}>
                  <div>
                    <Row label="Workspace name"><SInput value={vals.ws_name} onChange={v => set('ws_name', v)} w="100%" /></Row>
                    <Row label="Graph layout" desc="Algorithm for node positions"><SSelect value={vals.ws_layout} onChange={v => set('ws_layout', v)} options={['Force-directed', 'Hierarchical', 'Radial', 'Grid']} w="100%" /></Row>
                    <Row label="Auto-cluster threshold" desc="Cosine similarity cutoff (0–1)" last><SInput value={vals.ws_threshold} onChange={v => set('ws_threshold', v)} mono w={72} /></Row>
                  </div>
                  <div>
                    <Row label="Default view on open"><SSelect value={vals.ws_view} onChange={v => set('ws_view', v)} options={['Network explorer', 'Sources', 'Search', 'Analytics']} w="100%" /></Row>
                    <Row label="Description" desc="Shown in workspace switcher"><SInput value={vals.ws_desc} onChange={v => set('ws_desc', v)} placeholder="Add a description…" w="100%" /></Row>
                    <Row label="Max nodes displayed" desc="Cap on visible nodes for performance" last><SInput value={vals.ws_maxnodes} onChange={v => set('ws_maxnodes', v)} mono w={72} /></Row>
                  </div>
                </div>
              </>)}

              {tab === 'ingestion' && (<>
                <SecHead>Ingestion</SecHead>
                <Row label="Max documents per source"><SInput value={vals.ing_max} onChange={v => set('ing_max', v)} mono w={110} /></Row>
                <Row label="Crawl depth" desc="Link levels to follow for web sources"><SSelect value={vals.ing_depth} onChange={v => set('ing_depth', v)} options={['1 level', '2 levels', '3 levels', '5 levels']} w={150} /></Row>
                <Row label="Deduplication" desc="Skip docs already indexed in this workspace"><Toggle on={vals.ing_dedup} onChange={v => set('ing_dedup', v)} /></Row>
                <Row label="Ingestion schedule"><SSelect value={vals.ing_schedule} onChange={v => set('ing_schedule', v)} options={['Every hour', 'Every 6 hours', 'Daily', 'Manual']} w={180} /></Row>
                <Row label="Pause all ingestion" desc="Temporarily halt all active sources" last><Toggle on={vals.ing_pause} onChange={v => set('ing_pause', v)} /></Row>
              </>)}

              {tab === 'credentials' && (<>
                <SecHead>Credentials</SecHead>
                <div style={{ fontSize: 12, color: C.fg3, margin: '12px 0' }}>Keys are encrypted at rest — masked after saving.</div>
                <SubDivider label="Reddit API" />
                <Row label="Client ID"><SInput value={vals.cred_client} onChange={v => set('cred_client', v)} mono w={200} /></Row>
                <Row label="Client secret" last><SInput value={vals.cred_secret} onChange={v => set('cred_secret', v)} mono w={200} /></Row>
                <SubDivider label="Web crawler" />
                <Row label="User agent string"><SInput value={vals.cred_agent} onChange={v => set('cred_agent', v)} mono w={200} /></Row>
                <Row label="Request delay (ms)" desc="Minimum pause between outbound requests" last><SInput value={vals.cred_delay} onChange={v => set('cred_delay', v)} mono w={72} /></Row>
              </>)}

              {tab === 'account' && (<>
                <SecHead>Account</SecHead>
                <Row label="Email"><SInput value={vals.acc_email} onChange={v => set('acc_email', v)} w={220} /></Row>
                <Row label="Password"><Btn variant="secondary" size="sm" onClick={() => app.showToast('Password reset link sent')}>Change password…</Btn></Row>
                <Row label="Timezone"><SSelect value={vals.acc_tz} onChange={v => set('acc_tz', v)} options={['UTC', 'US/Pacific', 'US/Eastern', 'Europe/London', 'Asia/Tokyo']} w={160} /></Row>
                <Row label="Delete workspace" desc="Permanently remove all sources, documents and data" last><Btn variant="danger" size="sm" icon="trash-2" onClick={() => app.showToast('Type the workspace name to confirm deletion')}>Delete…</Btn></Row>
              </>)}

              {tab === 'notifications' && (<>
                <SecHead>Notifications</SecHead>
                <Row label="Ingestion complete" desc="Alert when a source finishes processing"><Toggle on={vals.not_complete} onChange={v => set('not_complete', v)} /></Row>
                <Row label="Source errors" desc="Immediate alert on ingestion failure"><Toggle on={vals.not_errors} onChange={v => set('not_errors', v)} /></Row>
                <Row label="New cluster detected" desc="When auto-clustering finds a new topic group"><Toggle on={vals.not_cluster} onChange={v => set('not_cluster', v)} /></Row>
                <Row label="Weekly digest email" desc="Summary sent every Monday 09:00 UTC" last><Toggle on={vals.not_digest} onChange={v => set('not_digest', v)} /></Row>
              </>)}

              {tab === 'appearance' && (<>
                <SecHead>Appearance</SecHead>
                <Row label="Sidebar default"><SSelect value={vals.app_sidebar} onChange={v => set('app_sidebar', v)} options={['Expanded', 'Collapsed']} w={160} /></Row>
                <Row label="Interface density"><SSelect value={vals.app_density} onChange={v => set('app_density', v)} options={['Compact', 'Comfortable', 'Spacious']} w={160} /></Row>
                <Row label="Show node labels" desc="Display topic names on graph nodes"><Toggle on={vals.app_labels} onChange={v => set('app_labels', v)} /></Row>
                <Row label="Show edge weights" desc="Visualize connection strength as line thickness" last><Toggle on={vals.app_weights} onChange={v => set('app_weights', v)} /></Row>
              </>)}
            </div>

            {/* Save bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', padding: vp.isNarrow ? '12px 16px' : '13px 28px', borderTop: `1px solid ${C.borderSubtle}`, flexShrink: 0 }}>
              {dirty && !vp.isNarrow && <span style={{ marginRight: 'auto', fontSize: 11, color: C.amber, background: C.amberDim, border: `1px solid ${C.amberBorder}`, padding: '3px 9px', borderRadius: 999 }}>Unsaved changes</span>}
              <Btn variant="ghost" size="md" onClick={() => setVals(saved)} disabled={!dirty}>Discard</Btn>
              <Btn variant="primary" size="md" onClick={save} disabled={!dirty}>Save changes</Btn>
            </div>
          </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
