// TopicNet Prototype — Add source: a manual, synchronous, single-item ingest.
// The unit is one item (a Reddit post or comment, a web page, a document) — never
// a whole subreddit or site. You run the job and watch it finish in-place; it ends
// on a result summary. The same item can be added again — re-ingest is allowed.
// Depends on tn-core.jsx, tn-data.jsx, tn-shell.jsx

// Believable comment lines synthesized when a post's top comments are pulled in.
const COMMENT_SNIPPETS = [
'This matches what we saw internally — the effect basically vanishes past 13B.',
'Counterpoint: the benchmark itself is leaking into pretraining, so the gains are illusory.',
'Has anyone tried this without the warmup schedule? Curious if it still holds.',
'The ablation in the appendix is the actual story here, not the headline number.',
'Reproduced on 2×A100 — within 3% of the reported figures.',
'Deployment friction is the part nobody benchmarks and it dominates in practice.',
'Strong disagree on the framing, but the data is hard to argue with.'];

const COMMENT_AUTHORS = ['u/kl_divergence', 'u/repro_bot', 'u/slow_takeoff', 'u/byte_pair', 'u/policy_wonk', 'u/tool_use'];

// Build the source rows + job log entry for one finished ingest.
function buildIngestResult({ type, redditKind, withComments, idx, target, fileName }) {
  const now = Date.now();
  const topics = 2 + idx % 3; // 2–4 topics linked
  const sentiment = +((idx * 37 % 78 - 18) / 100).toFixed(2); // ~ −0.18…+0.59
  let sources = [],headline;

  if (type === 'reddit') {
    const s = INGEST_SAMPLES.reddit[idx % INGEST_SAMPLES.reddit.length];
    if (redditKind === 'comment') {
      sources.push({ id: now, type: 'comment', title: COMMENT_SNIPPETS[idx % COMMENT_SNIPPETS.length], feed: s.feed, cluster: s.cluster, status: 'ready', time: 'just now', author: s.author, score: 200 + idx * 53 % 900, onPost: s.title });
      headline = '1 comment';
    } else {
      sources.push({ id: now, type: 'post', title: s.title, feed: s.feed, cluster: s.cluster, status: 'ready', time: 'just now', author: s.author, score: s.score, replies: s.replies });
      let n = 0;
      if (withComments) {
        n = 4 + idx % 3; // 4–6 top comments
        for (let i = 0; i < n; i++) {
          sources.push({ id: now + 1 + i, type: 'comment', title: COMMENT_SNIPPETS[(idx + i) % COMMENT_SNIPPETS.length], feed: s.feed, cluster: s.cluster, status: 'ready', time: 'just now', author: COMMENT_AUTHORS[(idx + i) % COMMENT_AUTHORS.length], score: 120 + (i * 211 + idx * 47) % 760, onPost: s.title });
        }
      }
      headline = n ? `1 post + ${n} comments` : '1 post';
    }
  } else if (type === 'web') {
    const s = INGEST_SAMPLES.web[idx % INGEST_SAMPLES.web.length];
    sources.push({ id: now, type: 'web', title: s.title, feed: s.feed, cluster: s.cluster, status: 'ready', time: 'just now', url: target && target.trim() ? target.trim() : s.url });
    headline = '1 web page';
  } else {
    const s = INGEST_SAMPLES.document[idx % INGEST_SAMPLES.document.length];
    const title = fileName || s.title;
    const ext = (fileName ? fileName.split('.').pop() : s.docSubtype).toLowerCase();
    const sub = ['pdf', 'docx', 'txt'].includes(ext) ? ext : 'pdf';
    sources.push({ id: now, type: 'document', docSubtype: sub, title, feed: 'upload', cluster: s.cluster, status: 'ready', time: 'just now', pages: s.pages, size: s.size });
    headline = `1 document · ${s.pages} ${s.pages === 1 ? 'page' : 'pages'}`;
  }

  const first = sources[0];
  const kind = first.type === 'document' ? first.docSubtype : first.type;
  const job = { id: 'sj' + now, kind, title: first.title, detail: headline, count: sources.length, status: 'done', time: 'just now', topics, sentiment };
  return { sources, job, headline, topics, sentiment };
}

function StepDot({ active, done }) {
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: active ? C.amber : done ? C.emerald : C.borderDef,
      boxShadow: active ? `0 0 6px ${C.amber}` : 'none', transition: 'all 200ms ease-out'
    }} />);

}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.fg4, marginBottom: 8 }}>{children}</div>;
}

function TextField({ value, onChange, placeholder, prefix, mono }) {
  const [foc, setFoc] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 6,
      background: C.bgBase, border: `1px solid ${foc ? C.amberBorder : C.borderDef}`,
      boxShadow: foc ? `0 0 0 2px rgba(251,191,36,0.18)` : 'none', transition: 'all 150ms ease-out'
    }}>
      {prefix && <span style={{ fontSize: 13, color: C.fg3, fontFamily: mono ? MONO : FONT }}>{prefix}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.fg1, fontFamily: mono ? MONO : FONT, fontSize: 13, minWidth: 0 }} data-comment-anchor="bff80a5bde-input-84-7" />
    </div>);

}

function Checkbox({ on, onClick, children, sub }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: 0, textAlign: 'left' }}>
      <span style={{
        width: 17, height: 17, borderRadius: 4, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? C.amber : 'transparent', border: `1.5px solid ${on ? C.amber : C.borderDef}`, transition: 'all 150ms ease-out'
      }}>{on && <Icon name="check" size={11} color={C.fgOnAccent} />}</span>
      <span>
        <span style={{ display: 'block', fontSize: 12.5, color: C.fg2 }}>{children}</span>
        {sub && <span style={{ display: 'block', fontSize: 11, color: C.fg4, marginTop: 2, lineHeight: 1.4 }}>{sub}</span>}
      </span>
    </button>);

}

function AddSourceModal() {
  const app = useApp();
  const vp = useViewport();
  const [phase, setPhase] = React.useState('pick'); // pick | config | running | done
  const [type, setType] = React.useState(null);
  const [redditKind, setRedditKind] = React.useState('post'); // post | comment
  const [target, setTarget] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [withComments, setWithComments] = React.useState(true);
  const [pct, setPct] = React.useState(0);
  const [result, setResult] = React.useState(null);

  React.useEffect(() => {
    if (app.addSourceOpen) {
      setPhase('pick');setType(null);setRedditKind('post');setTarget('');setFileName('');
      setWithComments(true);setPct(0);setResult(null);
    }
  }, [app.addSourceOpen]);

  // Drive the synchronous ingest job (a single item — finishes in ~1.4s).
  React.useEffect(() => {
    if (phase !== 'running') return;
    if (pct >= 100) {
      const idx = app.sessionJobs.length;
      const res = buildIngestResult({ type, redditKind, withComments, idx, target, fileName });
      const t = setTimeout(() => {
        app.commitIngest({ sources: res.sources, job: res.job });
        setResult(res);
        setPhase('done');
        app.showToast(`Added ${res.headline} · linked to ${res.topics} topic${res.topics === 1 ? '' : 's'}`);
      }, 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPct((p) => Math.min(100, p + (12 + Math.random() * 20))), 120);
    return () => clearTimeout(t);
  }, [phase, pct]);

  if (!app.addSourceOpen) return null;

  const typeDef = SOURCE_TYPES.find((t) => t.id === type);
  const placeholders = {
    reddit: redditKind === 'comment' ? 'https://www.reddit.com/r/mildlyinfuriating/comments/1tvxijv/comment/opk8o9e/' : 'https://www.reddit.com/r/mildlyinfuriating/comments/1tvxijv/spam_calls_how_can_i_stop_this_its_a_different/',
    web: 'arxiv.org/abs/1706.03762'
  };

  const displayName = () => {
    if (target.trim()) return target.trim();
    if (type === 'document') return fileName || 'document.pdf';
    if (type === 'reddit') return redditKind === 'comment' ? 'Reddit comment' : 'Reddit post';
    return 'web page';
  };

  const targetValid = type === 'document' ? !!fileName : target.trim().length > 0;

  const beginIngest = () => {
    // First-ever source bootstraps the demo workspace via the onboarding overlay.
    if (!app.hasData) {
      app.startIngestion({ type, name: displayName() });
      return;
    }
    setPct(0);setPhase('running');
  };

  const addAnother = () => {setPhase('pick');setType(null);setTarget('');setFileName('');setWithComments(true);setPct(0);setResult(null);};
  const close = () => app.setAddSrc(false);

  const kindForGlyph = result ? result.sources[0].type === 'document' ? result.sources[0].docSubtype : result.sources[0].type : null;

  return (
    <div onClick={phase === 'running' ? undefined : close} style={{
      position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', alignItems: vp.isMobile ? 'flex-end' : 'center', justifyContent: 'center',
      background: 'rgba(6,9,15,0.7)', backdropFilter: 'blur(8px)', animation: 'tnFade 180ms ease-out'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: vp.isMobile ? '100%' : 520, maxHeight: vp.isMobile ? '92dvh' : '88vh',
        background: C.bgOverlay, borderRadius: vp.isMobile ? '14px 14px 0 0' : 12, border: `1px solid ${C.borderDef}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)', padding: vp.isNarrow ? 20 : 28, display: 'flex', flexDirection: 'column',
        animation: 'tnPop 200ms ease-out'
      }}>

        {/* Step indicator — only during input phases */}
        {(phase === 'pick' || phase === 'config') &&
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 22 }}>
            <StepDot active={phase === 'pick'} done={phase === 'config'} />
            <StepDot active={phase === 'config'} />
            <span style={{ fontSize: 11, color: C.fg4, fontFamily: MONO, marginLeft: 4 }}>{phase === 'pick' ? '1 / 2' : '2 / 2'}</span>
          </div>
        }

        {/* PICK — item type */}
        {phase === 'pick' &&
        <>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: C.fg1, marginBottom: 6 }}>Add a source</h2>
            <p style={{ fontSize: 13, color: C.fg3, marginBottom: 20, lineHeight: 1.5 }}>A source is a single item. Pick what you're adding — one post, one page, one file.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {SOURCE_TYPES.map((t) => {
              const on = type === t.id;
              return (
                <button key={t.id} onClick={() => setType(t.id)} style={{
                  padding: '13px 14px', borderRadius: 9, cursor: 'pointer', textAlign: 'left', fontFamily: FONT, width: '100%',
                  background: on ? `${t.color}12` : C.bgElevated, border: `1px solid ${on ? `${t.color}80` : C.borderSubtle}`,
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all 150ms ease-out'
                }}>
                    <div style={{ width: 34, height: 34, borderRadius: 7, flexShrink: 0, background: `${t.color}18`, border: `1px solid ${t.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={t.icon} size={17} color={t.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: on ? C.fg1 : C.fg2, marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 11.5, color: C.fg4, lineHeight: 1.4 }}>{t.desc}</div>
                    </div>
                    {on && <Icon name="check" size={16} color={t.color} />}
                  </button>);

            })}
            </div>
          </>
        }

        {/* CONFIG — the specific item */}
        {phase === 'config' && typeDef &&
        <>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: C.fg1, marginBottom: 6 }}>
              {type === 'reddit' ? 'Link a Reddit item' : type === 'web' ? 'Link a web page' : 'Upload a document'}
            </h2>
            <p style={{ fontSize: 13, color: C.fg3, marginBottom: 20, lineHeight: 1.5 }}>
              {type === 'reddit' ? 'Paste the permalink to one post or comment — not a subreddit.' : type === 'web' ? 'Paste the URL of a single article or page.' : 'Add one file to index as a source.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {type === 'reddit' &&
            <div>
                  <FieldLabel>This link is a</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['post', 'Post'], ['comment', 'Comment']].map(([k, l]) => {
                  const on = redditKind === k;
                  return (
                    <button key={k} onClick={() => setRedditKind(k)} style={{
                      flex: 1, padding: '9px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 12.5,
                      background: on ? C.amberDim : C.bgElevated, color: on ? C.amber : C.fg3,
                      border: `1px solid ${on ? C.amberBorder : C.borderSubtle}`, transition: 'all 150ms ease-out'
                    }}>{l}</button>);

                })}
                  </div>
                </div>
            }

              <div>
                <FieldLabel>{type === 'reddit' ? 'Permalink' : type === 'web' ? 'URL' : 'File'}</FieldLabel>
                {type === 'document' ?
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', borderRadius: 8,
                background: C.bgBase, border: `1.5px dashed ${fileName ? C.amberBorder : C.borderDef}`, cursor: 'pointer', transition: 'border-color 150ms ease-out'
              }}>
                    <Icon name="upload" size={22} color={fileName ? C.amber : C.fg3} />
                    <span style={{ fontSize: 12.5, color: fileName ? C.fg1 : C.fg2 }}>{fileName || 'Drop a PDF, DOCX or TXT — or click to browse'}</span>
                    <input type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={(e) => setFileName(e.target.files[0]?.name || '')} />
                  </label> :

              <TextField value={target} onChange={setTarget} placeholder={placeholders[type]} mono />
              }
              </div>

              {type === 'reddit' && redditKind === 'post' &&
            <Checkbox on={withComments} onClick={() => setWithComments((v) => !v)} sub="Each top-level comment is added as its own comment-source alongside the post.">
                  Also ingest the post's top 5 comments
                </Checkbox>
            }


            </div>
          </>
        }

        {/* RUNNING — synchronous, in-place */}
        {phase === 'running' && typeDef &&
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${typeDef.color}18`, border: `1px solid ${typeDef.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name={typeDef.icon} size={20} color={typeDef.color} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: C.fg1, marginBottom: 6 }}>Ingesting</h2>
            <div style={{ fontSize: 12.5, color: C.fg3, fontFamily: MONO, marginBottom: 18, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName()}</div>
            <div style={{ width: '100%', maxWidth: 380, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: C.amber, borderRadius: 2, boxShadow: `0 0 8px ${C.amber}`, transition: 'width 150ms ease-out' }} />
            </div>
            <div style={{ fontSize: 11.5, color: C.fg4 }}>
              {pct < 40 ? 'Fetching content…' : pct < 80 ? 'Extracting & embedding…' : 'Linking to topics…'}
            </div>
          </div>
        }

        {/* DONE — completion summary */}
        {phase === 'done' && result &&
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `${C.emerald}18`, border: `1px solid ${C.emerald}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={18} color={C.emerald} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: C.fg1 }}>Ingest complete</h2>
                <div style={{ fontSize: 12, color: C.fg4, marginTop: 2 }}>Added {result.headline}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
            [String(result.sources.length), result.sources.length === 1 ? 'source added' : 'sources added', C.fg1],
            [String(result.topics), result.topics === 1 ? 'topic linked' : 'topics linked', CLUSTER_COLORS[result.sources[0].cluster]],
            [`${result.sentiment >= 0 ? '+' : '−'}${Math.abs(result.sentiment).toFixed(2)}`, 'sentiment', result.sentiment >= 0 ? C.emerald : C.rose]].
            map(([v, l, c]) =>
            <div key={l} style={{ padding: '13px 14px', borderRadius: 8, background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: MONO, color: c, letterSpacing: '-0.02em' }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: C.fg4, marginTop: 3 }}>{l}</div>
                </div>
            )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 8, background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
              <SourceGlyph kind={SOURCE_KINDS[kindForGlyph] || SOURCE_KINDS.web} size={30} radius={7} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.sources[0].title}</div>
                <div style={{ fontSize: 10.5, color: C.fg4, fontFamily: MONO, marginTop: 2 }}>Now at the top of your sources list</div>
              </div>
            </div>
          </>
        }

        {/* Footer */}
        {phase !== 'running' &&
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            {phase === 'pick' && <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: C.fg3 }}>Cancel</button>}
            {phase === 'config' && <Btn variant="ghost" size="md" icon="arrow-left" onClick={() => setPhase('pick')}>Back</Btn>}
            {phase === 'done' && <Btn variant="ghost" size="md" icon="plus" onClick={addAnother}>Add another</Btn>}

            {phase === 'pick' && <Btn variant="primary" size="md" iconRight="arrow-right" disabled={!type} onClick={() => setPhase('config')}>Continue</Btn>}
            {phase === 'config' && <Btn variant="primary" size="md" icon={app.hasData ? 'download' : 'play'} disabled={!targetValid} onClick={beginIngest}>Submit</Btn>}
            {phase === 'done' && <Btn variant="primary" size="md" onClick={close}>Done</Btn>}
          </div>
        }
      </div>
    </div>);

}

Object.assign(window, { AddSourceModal });