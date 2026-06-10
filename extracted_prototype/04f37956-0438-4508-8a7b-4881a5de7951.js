// TopicNet Prototype — unified mock data + per-node detail generator
// Depends on tn-core.jsx (CLUSTER_COLORS, CLUSTER_LABELS)

// ─── Network nodes (positions on a 960×560 canvas) ───────────────────────────
const NETWORK_NODES = [
  { id:1,  label:'Large Language Models', cluster:'cyan',    r:26, cx:480, cy:280, docs:3241, connections:[2,3,8,11],   sentiment:0.54,  sources:8 },
  { id:2,  label:'GPT-4 / Claude',        cluster:'cyan',    r:18, cx:355, cy:192, docs:1847, connections:[1,3],        sentiment:0.42,  sources:4 },
  { id:3,  label:'AI Safety Research',    cluster:'cyan',    r:22, cx:600, cy:198, docs:2103, connections:[1,2,4,10],   sentiment:0.31,  sources:6 },
  { id:4,  label:'Policy & Regulation',   cluster:'rose',    r:23, cx:714, cy:300, docs:1654, connections:[3,5,10],     sentiment:-0.18, sources:5 },
  { id:5,  label:'EU AI Act',             cluster:'rose',    r:14, cx:788, cy:218, docs:643,  connections:[4],          sentiment:-0.28, sources:2 },
  { id:6,  label:'r/MachineLearning',     cluster:'violet',  r:20, cx:295, cy:362, docs:1342, connections:[1,7,8],      sentiment:0.38,  sources:3 },
  { id:7,  label:'Social Discourse',      cluster:'violet',  r:18, cx:178, cy:274, docs:978,  connections:[6,13],       sentiment:0.08,  sources:4 },
  { id:8,  label:'Neural Architecture',   cluster:'cyan',    r:21, cx:420, cy:398, docs:1923, connections:[1,6,9,11],   sentiment:0.47,  sources:5 },
  { id:9,  label:'Open Source Models',    cluster:'emerald', r:22, cx:554, cy:432, docs:2156, connections:[8,11,12,14], sentiment:0.61,  sources:7 },
  { id:10, label:'Ethics & Bias',         cluster:'rose',    r:19, cx:688, cy:404, docs:1234, connections:[3,4,15],     sentiment:-0.32, sources:4 },
  { id:11, label:'Research Papers',       cluster:'emerald', r:25, cx:344, cy:468, docs:4821, connections:[1,8,9,12],   sentiment:0.49,  sources:9 },
  { id:12, label:'Benchmarks & Evals',    cluster:'emerald', r:15, cx:562, cy:508, docs:847,  connections:[9,11],       sentiment:0.22,  sources:3 },
  { id:13, label:'Investment & VC',       cluster:'sky',     r:16, cx:152, cy:404, docs:723,  connections:[7,14],       sentiment:0.15,  sources:2 },
  { id:14, label:'Startup Ecosystem',     cluster:'sky',     r:15, cx:252, cy:488, docs:634,  connections:[9,13],       sentiment:0.24,  sources:3 },
  { id:15, label:'Healthcare AI',         cluster:'pink',    r:19, cx:768, cy:464, docs:1456, connections:[10,11],      sentiment:0.38,  sources:4 },
];

const NODE_BY_ID = Object.fromEntries(NETWORK_NODES.map(n => [n.id, n]));

// Deduplicated edges
const NETWORK_EDGES = (() => {
  const seen = new Set(), edges = [];
  NETWORK_NODES.forEach(n => n.connections.forEach(tid => {
    const key = [Math.min(n.id, tid), Math.max(n.id, tid)].join('-');
    if (!seen.has(key) && NODE_BY_ID[tid]) { seen.add(key); edges.push({ from: n, to: NODE_BY_ID[tid] }); }
  }));
  return edges;
})();

// ─── Hand-crafted rich detail for the hero node (Large Language Models) ───────
const HERO_DETAIL = {
  description: 'Captures discourse on model capabilities, scaling laws, emergent behaviors, and deployment challenges across research papers, community forums, and policy discussions.',
  centrality: 0.847,
  importance: 9.2,
  rank: 3,
  activity: [18,22,19,31,28,42,38,51,47,62,58,74],
  activityLabels: ['Mar 3','Mar 10','Mar 17','Mar 24','Mar 31','Apr 7','Apr 14','Apr 21','Apr 28','May 5','May 12','May 19'],
  sentimentBreakdown: { positive: 68, neutral: 24, negative: 8 },
  keywords: [
    { term: 'attention mechanism',   score: 94 },
    { term: 'scaling laws',          score: 87 },
    { term: 'emergent capabilities', score: 76 },
    { term: 'RLHF / alignment',      score: 71 },
    { term: 'tokenization',          score: 63 },
    { term: 'context window',        score: 58 },
    { term: 'fine-tuning',           score: 52 },
    { term: 'inference efficiency',  score: 44 },
  ],
  // kindCounts sum to node.docs (= total individual sources feeding this topic)
  kindCounts: { post: 1180, comment: 1290, web: 560, document: 211 },
  feeds: 8,
  sourceList: [
    { type:'post',     title:'Why does attention scale quadratically? An intuition thread', feed:'r/MachineLearning', status:'ready',     time:'4 min ago',  score:2431 },
    { type:'comment',  title:'RLHF doesn\u2019t \u201Calign\u201D the model so much as reshape its output distribution.', feed:'r/MachineLearning', status:'ready', time:'9 min ago', score:847 },
    { type:'web',      title:'Attention Is All You Need', feed:'arxiv.org', status:'ready', time:'12 min ago', url:'arxiv.org/abs/1706.03762' },
    { type:'web',      title:'Scaling Laws for Neural Language Models', feed:'arxiv.org', status:'ready', time:'18 min ago', url:'arxiv.org/abs/2001.08361' },
    { type:'document', docSubtype:'pdf', title:'LLM Survey 2025.pdf', feed:'Uploads', status:'ready', time:'2 hr ago', pages:84 },
    { type:'document', docSubtype:'pdf', title:'GPT-4 Technical Report.pdf', feed:'Uploads', status:'ready', time:'3 days ago', pages:100 },
    { type:'post',     title:'[D] Claude 3.7 vs GPT-4o for code generation \u2014 benchmarks inside', feed:'r/MachineLearning', status:'ready', time:'22 min ago', score:1894 },
    { type:'comment',  title:'Context windows are a red herring; retrieval quality dominates beyond 32k.', feed:'r/MachineLearning', status:'ready', time:'7 hr ago', score:704 },
  ],
  timeline: [
    { date:'May 19', tag:'Peak volume', delta:'+26%', pos:true,  text:'74 documents this week — highest since node creation. GPT-5 speculation driving 40% of new content volume.' },
    { date:'May 12', tag:'Spike',       delta:'+18%', pos:true,  text:"Anthropic's Claude 3.7 release. r/MachineLearning thread reaches 2.4K upvotes, linked across 3 connected topics." },
    { date:'Apr 28', tag:'Index',       delta:null,   pos:null,  text:'"Attention Is All You Need" indexed as primary source, surfacing 12 supporting quotes across 4 groups.' },
    { date:'Apr 14', tag:'Merge',       delta:null,   pos:null,  text:"AI Safety Research node merges 3 prior groups, strengthening this node's connections by 2 new links." },
    { date:'Mar 17', tag:'Created',     delta:null,   pos:null,  text:'Node created during initial network crawl. Connected to 2 groups and 3 nodes at creation.' },
  ],
};

// Per-node keyword pools (deterministic flavor by cluster)
const CLUSTER_KEYWORDS = {
  cyan:    ['attention mechanism','scaling laws','transformer','fine-tuning','context window','inference','tokenization','pretraining'],
  violet:  ['community sentiment','viral threads','discourse','engagement','moderation','upvote velocity','subreddit drift','memetics'],
  rose:    ['regulation','compliance','liability','governance','risk framework','disclosure','enforcement','oversight'],
  emerald: ['peer review','reproducibility','methodology','citations','benchmark','dataset','ablation','open weights'],
  sky:     ['valuation','funding round','market fit','runway','acquisition','revenue','go-to-market','unit economics'],
  pink:    ['clinical trial','diagnosis','patient data','FDA','efficacy','biomarker','triage','privacy'],
  orange:  ['narrative','distribution','virality','editorial','creator','format','reach','retention'],
  lime:    ['emissions','sustainability','carbon','renewable','footprint','offset','policy','adaptation'],
};

// A small deterministic PRNG so generated detail is stable per node
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

function buildActivity(node) {
  const rnd = seeded(node.id * 97 + 13);
  const base = Math.max(6, Math.round(node.docs / 90));
  const trend = node.sentiment >= 0 ? 1.9 : 1.3;
  return Array.from({ length: 12 }, (_, i) => Math.round(base * (1 + (i / 11) * trend) * (0.82 + rnd() * 0.36)));
}

// Returns the full detail object for any node id (hero is hand-crafted).
// Pass the live workspace context (wctx) so edits — rename, reassign, recolor,
// remove — are reflected in the panel and breadcrumb.
function getNodeDetail(id, wctx) {
  const byId = (wctx && wctx.nodeById) || NODE_BY_ID;
  const node = byId[id];
  if (!node) return null;
  const color = wctx ? wctx.catColor(node.cluster) : CLUSTER_COLORS[node.cluster];
  const clusterLabel = wctx ? wctx.catLabel(node.cluster) : CLUSTER_LABELS[node.cluster];
  const nodeCount = (wctx && wctx.nodes) ? wctx.nodes.length : NETWORK_NODES.length;
  if (id === 1) {
    return { ...node, ...HERO_DETAIL, color, clusterLabel, nodeCount };
  }
  const rnd = seeded(id * 131 + 7);
  const activity = buildActivity(node);
  const labels = ['Mar 3','Mar 10','Mar 17','Mar 24','Mar 31','Apr 7','Apr 14','Apr 21','Apr 28','May 5','May 12','May 19'];
  const pool = CLUSTER_KEYWORDS[node.cluster] || CLUSTER_KEYWORDS.cyan;
  const keywords = pool.slice(0, 7).map((term, i) => ({ term, score: Math.max(28, Math.round(96 - i * (7 + rnd() * 4))) }));
  const pos = Math.round(50 + node.sentiment * 60);
  const neg = Math.round(Math.max(4, 22 - node.sentiment * 40));
  const sentimentBreakdown = { positive: Math.min(86, Math.max(8, pos)), negative: Math.min(60, Math.max(4, neg)), neutral: 0 };
  sentimentBreakdown.neutral = Math.max(6, 100 - sentimentBreakdown.positive - sentimentBreakdown.negative);
  const connNodes = node.connections.map(cid => byId[cid]).filter(Boolean);
  const lab = node.label, labLow = lab.toLowerCase();
  const SAMPLE = [
    { type:'post',     title:`Discussion: where is ${lab} actually headed?`,                       feed:'r/MachineLearning', score: 800 + Math.round(rnd()*2600) },
    { type:'comment',  title:`On ${labLow}: the consensus seems to be shifting fast this quarter.`, feed:'r/artificial',      score: 200 + Math.round(rnd()*900)  },
    { type:'web',      title:`${lab}: a survey of recent work`,                                     feed:'arxiv.org',         url:'arxiv.org/abs/24' + (1000 + Math.round(rnd()*8999)) },
    { type:'web',      title:`Why ${labLow} matters now`,                                           feed:'Hacker News',       url:'news.ycombinator.com/item' },
    { type:'document', docSubtype:'pdf',  title:`${lab} report 2025.pdf`,                           feed:'Uploads',           pages: 12 + Math.round(rnd()*120) },
    { type:'post',     title:`[D] Practical notes on ${labLow}`,                                    feed:'r/MachineLearning', score: 300 + Math.round(rnd()*1500) },
    { type:'comment',  title:`Counterpoint on ${labLow} \u2014 deployment friction is underrated.`,feed:'r/singularity',     score: 120 + Math.round(rnd()*700)  },
    { type:'document', docSubtype:'docx', title:`${lab} working notes.docx`,                        feed:'Uploads',           pages: 4 + Math.round(rnd()*40)  },
  ];
  const sampleN = Math.min(SAMPLE.length, Math.max(4, node.sources));
  const times = ['4 min ago','12 min ago','1 hr ago','2 hr ago','3 days ago','7 hr ago'];
  const sourceList = SAMPLE.slice(0, sampleN).map((s, i) => ({
    ...s,
    status: 'ready',
    time: times[i % times.length],
  }));
  // Per-kind totals across the whole topic (sum to node.docs)
  const kc = {};
  kc.post = Math.round(node.docs * 0.32);
  kc.comment = Math.round(node.docs * 0.34);
  kc.web = Math.round(node.docs * 0.24);
  kc.document = Math.max(0, node.docs - kc.post - kc.comment - kc.web);
  const peak = activity.at(-1), prev = activity.at(-2);
  const deltaPct = Math.round((peak - prev) / prev * 100);
  const timeline = [
    { date:'May 19', tag:'Peak volume', delta:`${deltaPct>=0?'+':''}${deltaPct}%`, pos: deltaPct>=0, text:`${peak} documents this week across ${node.sources} active sources — the strongest week on record for this topic.` },
    { date:'May 5',  tag:'Spike',       delta:'+14%', pos:true,  text:`New discussion threads in ${connNodes[0]?.label || 'a connected topic'} drove a measurable lift in mention volume.` },
    { date:'Apr 21', tag:'Index',       delta:null,   pos:null,  text:`Primary source re-indexed, surfacing additional supporting passages across ${connNodes.length} connected nodes.` },
    { date:'Mar 17', tag:'Created',     delta:null,   pos:null,  text:`Node created during network crawl. Connected to ${node.connections.length} nodes at creation.` },
  ];
  return {
    ...node, color, clusterLabel, nodeCount,
    description: `Aggregates discourse and documents related to ${node.label.toLowerCase()} across ${node.sources} sources, capturing how the topic connects to ${node.connections.length} neighboring areas of the network.`,
    centrality: +(0.4 + rnd() * 0.45).toFixed(3),
    importance: +(4 + rnd() * 5).toFixed(1),
    rank: Math.max(1, Math.round(rnd() * 14) + 1),
    activity, activityLabels: labels, keywords, sentimentBreakdown, sourceList, timeline,
    kindCounts: kc, feeds: node.sources,
  };
}

function connectedTopics(id, wctx) {
  const byId = (wctx && wctx.nodeById) || NODE_BY_ID;
  const node = byId[id];
  if (!node) return [];
  const rnd = seeded(id * 53 + 3);
  return node.connections.map(cid => {
    const c = byId[cid];
    if (!c) return null;
    const color = wctx ? wctx.catColor(c.cluster) : CLUSTER_COLORS[c.cluster];
    return { id: c.id, label: c.label, cluster: c.cluster, color, docs: c.docs, strength: Math.round(60 + rnd() * 36) };
  }).filter(Boolean).sort((a, b) => b.strength - a.strength);
}

// Derive deduplicated edges from a live nodes array (used by the graph so
// node removals / merges restructure the edges immediately).
function deriveEdges(nodes) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const seen = new Set(), edges = [];
  nodes.forEach(n => (n.connections || []).forEach(tid => {
    const key = [Math.min(n.id, tid), Math.max(n.id, tid)].join('-');
    if (!seen.has(key) && byId[tid]) { seen.add(key); edges.push({ from: n, to: byId[tid] }); }
  }));
  return edges;
}

// ─── Feeds (connectors) → each yields many individual sources ────────────────
// A feed is what you connect (a subreddit, a website/domain, an upload batch).
// The individual posts, comments, pages and documents it produces are the sources.
const FEEDS = [
  { id:'ml',     name:'r/MachineLearning', kind:'reddit', cluster:'cyan'    },
  { id:'art',    name:'r/artificial',      kind:'reddit', cluster:'violet'  },
  { id:'sing',   name:'r/singularity',     kind:'reddit', cluster:'violet'  },
  { id:'arxiv',  name:'arxiv.org',         kind:'web',    cluster:'emerald' },
  { id:'hn',     name:'Hacker News',       kind:'web',    cluster:'sky'     },
  { id:'oai',    name:'openai.com',        kind:'web',    cluster:'cyan'    },
  { id:'nature', name:'nature.com',        kind:'web',    cluster:'emerald' },
  { id:'euai',   name:'euaiact.eu',        kind:'web',    cluster:'rose'    },
  { id:'upload', name:'Uploads',           kind:'upload', cluster:'cyan'    },
];
const FEED_BY_ID = Object.fromEntries(FEEDS.map(f => [f.id, f]));

// ─── Sources (individual ingested items) ─────────────────────────────────────
// type: 'post' | 'comment' | 'web' | 'document'  (documents carry a docSubtype)
const SOURCES_DATA = [
  { id:1,  type:'post',    title:'Why does attention scale quadratically? An intuition thread', feed:'ml',     cluster:'cyan',    status:'ready',     time:'4 min ago',  author:'u/grad_descent', score:2431, replies:312 },
  { id:2,  type:'comment', title:'RLHF doesn\u2019t \u201Calign\u201D the model so much as reshape its output distribution toward rated samples.', feed:'ml', cluster:'cyan', status:'ready', time:'9 min ago', author:'u/kl_divergence', score:847, onPost:'Why does attention scale quadratically?' },
  { id:3,  type:'post',    title:'[D] Claude 3.7 vs GPT-4o for code generation \u2014 benchmarks inside', feed:'ml', cluster:'cyan', status:'ready', time:'22 min ago', author:'u/eval_harness', score:1894, replies:241 },
  { id:4,  type:'comment', title:'Reproduced the scaling-laws result on 2\u00D7A100 \u2014 numbers match within 3%.', feed:'ml', cluster:'emerald', status:'ready', time:'1 hr ago', author:'u/repro_bot', score:512, onPost:'Has anyone reproduced the scaling-laws paper?' },
  { id:5,  type:'post',    title:'Weekly discussion: best resource for understanding self-attention?', feed:'ml', cluster:'violet', status:'ready', time:'1 hr ago', author:'u/automod', score:128, replies:64 },
  { id:6,  type:'post',    title:'The EU AI Act will kill open-source models. Change my mind.', feed:'art', cluster:'rose', status:'ready', time:'2 hr ago', author:'u/oss_forever', score:3140, replies:921 },
  { id:7,  type:'comment', title:'Counterpoint: the Act explicitly exempts models released under a free and open-source licence for research.', feed:'art', cluster:'rose', status:'ready', time:'2 hr ago', author:'u/policy_wonk', score:1203, onPost:'The EU AI Act will kill open-source models.' },
  { id:8,  type:'post',    title:'Open weights just dropped \u2014 first impressions and quick benchmarks', feed:'art', cluster:'emerald', status:'ready', time:'3 hr ago', author:'u/weights_only', score:2210, replies:188 },
  { id:9,  type:'post',    title:'Is AGI by 2027 realistic? Mega-thread', feed:'sing', cluster:'violet', status:'ready', time:'5 hr ago', author:'u/exponential', score:4821, replies:1842 },
  { id:10, type:'comment', title:'Timelines keep compressing because people anchor on capability, not deployment friction.', feed:'sing', cluster:'violet', status:'ready', time:'5 hr ago', author:'u/slow_takeoff', score:933, onPost:'Is AGI by 2027 realistic?' },
  { id:11, type:'web', title:'Attention Is All You Need', feed:'arxiv', cluster:'cyan', status:'ready', time:'12 min ago', url:'arxiv.org/abs/1706.03762' },
  { id:12, type:'web', title:'Scaling Laws for Neural Language Models', feed:'arxiv', cluster:'emerald', status:'ready', time:'18 min ago', url:'arxiv.org/abs/2001.08361' },
  { id:13, type:'web', title:'Efficient Transformers: A Survey', feed:'arxiv', cluster:'emerald', status:'ready', time:'1 hr ago', url:'arxiv.org/abs/2009.06732' },
  { id:14, type:'web', title:'On the Opportunities and Risks of Foundation Models', feed:'arxiv', cluster:'rose', status:'ready', time:'2 hr ago', url:'arxiv.org/abs/2108.07258' },
  { id:15, type:'web', title:'GPT-4 is here: what we actually know so far', feed:'hn', cluster:'cyan', status:'ready', time:'3 hr ago', url:'news.ycombinator.com/item?id=35138' },
  { id:16, type:'web', title:'\u201CEmergent abilities are a mirage\u201D \u2014 discussion', feed:'hn', cluster:'emerald', status:'ready', time:'6 hr ago', url:'news.ycombinator.com/item?id=36210' },
  { id:17, type:'web', title:'Our approach to alignment research', feed:'oai', cluster:'cyan', status:'ready', time:'3 days ago', url:'openai.com/research/alignment' },
  { id:18, type:'web', title:'Large language models in medicine: applications and limits', feed:'nature', cluster:'pink', status:'ready', time:'1 day ago', url:'nature.com/articles/s41591' },
  { id:19, type:'web', title:'EU AI Act \u2014 consolidated text, Article 53 obligations', feed:'euai', cluster:'rose', status:'error', time:'failed', url:'euaiact.eu/article/53' },
  { id:20, type:'document', docSubtype:'pdf',  title:'LLM Survey 2025.pdf', feed:'upload', cluster:'cyan', status:'ready', time:'5 hr ago', pages:84, size:'6.1 MB' },
  { id:21, type:'document', docSubtype:'pdf',  title:'GPT-4 Technical Report.pdf', feed:'upload', cluster:'cyan', status:'ready', time:'2 hr ago', pages:100, size:'4.4 MB' },
  { id:22, type:'document', docSubtype:'pdf',  title:'AI Safety Landscape.pdf', feed:'upload', cluster:'rose', status:'ready', time:'2 hr ago', pages:42, size:'18.4 MB' },
  { id:23, type:'document', docSubtype:'pdf',  title:'Attention Is All You Need.pdf', feed:'upload', cluster:'cyan', status:'ready', time:'3 days ago', pages:15, size:'2.2 MB' },
  { id:24, type:'document', docSubtype:'docx', title:'Q2 model evaluation notes.docx', feed:'upload', cluster:'emerald', status:'ready', time:'6 hr ago', pages:12, size:'320 KB' },
  { id:25, type:'document', docSubtype:'txt',  title:'interview-transcript-safety-team.txt', feed:'upload', cluster:'violet', status:'ready', time:'6 hr ago', pages:1, size:'88 KB' },
  { id:26, type:'document', docSubtype:'pdf',  title:'Open Problems in Mechanistic Interpretability.pdf', feed:'upload', cluster:'emerald', status:'ready', time:'1 day ago', pages:28, size:'3.0 MB' },
  { id:27, type:'post',    title:'Tokenization is still the most underrated bottleneck', feed:'ml', cluster:'cyan', status:'ready', time:'7 hr ago', author:'u/byte_pair', score:1422, replies:96 },
  { id:28, type:'comment', title:'Context windows are a red herring; retrieval quality dominates beyond 32k tokens.', feed:'ml', cluster:'cyan', status:'ready', time:'7 hr ago', author:'u/rag_pilled', score:704, onPost:'Tokenization is still the most underrated bottleneck' },
  { id:29, type:'web', title:'A primer on RLHF and constitutional methods', feed:'hn', cluster:'cyan', status:'ready', time:'8 hr ago', url:'news.ycombinator.com/item?id=35990' },
  { id:30, type:'post',    title:'Startup ecosystem: who is actually profitable in AI infra?', feed:'art', cluster:'sky', status:'ready', time:'9 hr ago', author:'u/term_sheet', score:1188, replies:204 },
];
// Aggregate workspace context (the network is far larger than the recent list above).
// The Sources page headline + the Network stats bar both read from these, so the
// two surfaces always agree (12,847 indexed sources across the workspace).
const SOURCES_TOTAL = 12847;
const SOURCES_BREAKDOWN = { post: 4210, comment: 3980, web: 3420, document: 1237 }; // sums to SOURCES_TOTAL
const SOURCES_READY = 12831;
const SOURCES_ERRORS = 16;

// ─── Search results (faceted query builder) ──────────────────────────────────
const SEARCH_RESULTS = [
  { id:1, title:'Attention Is All You Need', source:'Attention Is All You Need.pdf', type:'pdf', cluster:'cyan', score:97, date:'May 12', sentiment:0.54,
    snippet:'We propose a new simple network architecture, the Transformer, based solely on ', highlight:'attention mechanisms', snippetEnd:', dispensing with recurrence and convolutions entirely.', nodeId:1 },
  { id:2, title:'Thread: Comparing attention heads across BERT layers', source:'r/MachineLearning', type:'reddit', cluster:'cyan', score:88, date:'May 18', sentiment:0.38,
    snippet:'Multi-head ', highlight:'attention mechanisms', snippetEnd:' let each head specialize in different syntactic relationships — positional, dependency, coreference.', nodeId:6 },
  { id:3, title:'GPT-4 Technical Report: Architecture section', source:'GPT-4 Technical Report.pdf', type:'pdf', cluster:'cyan', score:81, date:'Apr 28', sentiment:0.42,
    snippet:'Scaled ', highlight:'transformer attention', snippetEnd:' with sparse patterns reduces the quadratic complexity of full self-attention.', nodeId:8 },
  { id:4, title:'Scaling laws for neural language models', source:'arxiv.org/abs/2001.08361', type:'web', cluster:'emerald', score:74, date:'May 3', sentiment:0.49,
    snippet:'Model performance scales predictably with compute, data, and parameters — ', highlight:'attention depth', snippetEnd:' is a stronger predictor of downstream performance than width.', nodeId:11 },
  { id:5, title:"Weekly thread: best resource for understanding self-attention?", source:'r/learnmachinelearning', type:'reddit', cluster:'violet', score:66, date:'May 20', sentiment:0.31,
    snippet:"Andrej Karpathy's minGPT walks through the ", highlight:'self-attention mechanism', snippetEnd:' implementation step-by-step, roughly 150 lines.', nodeId:7 },
  { id:6, title:'Efficient Transformers: A Survey', source:'arxiv.org/abs/2009.06732', type:'web', cluster:'emerald', score:58, date:'Apr 14', sentiment:0.22,
    snippet:'Memory-efficient variants include sparse ', highlight:'attention', snippetEnd:', linear approximations, and locality-sensitive hashing.', nodeId:12 },
];

const SEARCH_SUGGESTIONS = [
  'sentiment > 0.4 AND cluster:tech',
  'topics CONNECTED TO "AI Safety" DEPTH 2',
  'nodes WHERE docs > 2000 ORDER BY sentiment',
  '"language model" OR "LLM" IN sources:reddit',
];

// ─── Reports time-series (30 days, May 1–30) ─────────────────────────────────
const RPT = {
  nodes:   [4210,4380,4290,4450,4600,4580,4720,4850,4910,4880,5020,5180,5240,5190,5340,5420,5580,5640,5710,5680,5820,5950,6010,6140,6090,6240,6380,6420,6510,6620],
  docs:    [41.2,42.8,43.1,44.5,45.9,45.2,47.8,49.1,50.4,49.8,52.3,54.1,55.6,54.9,57.2,58.8,60.4,61.2,62.5,61.9,63.8,65.4,66.2,67.8,66.9,68.4,69.8,70.5,71.2,72.8],
  sent:    [28,31,29,33,30,34,36,35,32,37,38,35,40,38,41,39,43,41,44,42,45,43,47,44,46,48,45,49,47,50],
  ingest:  [1840,2100,1960,2340,2580,1920,3100,2840,2680,2200,3400,3100,2900,2600,3800,3600,2400,3200,3500,2800,4100,3700,3200,3900,3300,4200,3800,4600,4100,4400],
  labels:  ['May 1','May 8','May 15','May 22','May 29'],
};

const RPT_CLUSTERS = [
  { key:'cyan',    name:'Tech / AI', docs:'28.4K', sent:'+0.42', sentVal:0.42,  nodes:'1,840', pct:28 },
  { key:'emerald', name:'Research',  docs:'14.2K', sent:'+0.38', sentVal:0.38,  nodes:'920',   pct:14 },
  { key:'violet',  name:'Social',    docs:'11.6K', sent:'+0.18', sentVal:0.18,  nodes:'750',   pct:11 },
  { key:'sky',     name:'Business',  docs:'9.8K',  sent:'+0.31', sentVal:0.31,  nodes:'630',   pct:10 },
  { key:'rose',    name:'Policy',    docs:'8.4K',  sent:'−0.12', sentVal:-0.12, nodes:'540',   pct:8  },
  { key:'orange',  name:'Media',     docs:'6.2K',  sent:'+0.08', sentVal:0.08,  nodes:'400',   pct:6  },
  { key:'pink',    name:'Health',    docs:'4.8K',  sent:'+0.22', sentVal:0.22,  nodes:'310',   pct:5  },
  { key:'lime',    name:'Climate',   docs:'3.6K',  sent:'−0.04', sentVal:-0.04, nodes:'230',   pct:4  },
];

const RPT_TOP_SOURCES = [
  { name:'arxiv.org (cs.AI)',   type:'web',    docs:'28.4K', rate:'410/day', cluster:'emerald' },
  { name:'r/MachineLearning',   type:'reddit', docs:'12.8K', rate:'112/day', cluster:'cyan' },
  { name:'Hacker News',         type:'web',    docs:'5.6K',  rate:'29/day',  cluster:'sky' },
  { name:'r/artificial',        type:'reddit', docs:'3.2K',  rate:'70/day',  cluster:'violet' },
  { name:'LLM Survey 2025.pdf', type:'pdf',    docs:'1.2K',  rate:'static',  cluster:'cyan' },
];

// ─── Add-source flow definitions ─────────────────────────────────────────────
// The unit of ingestion is a single item — one Reddit post or comment, one web
// page, one document. A subreddit or site is a *feed* (a grouping), never a
// source you ingest. Adding is manual and synchronous: you run one job and watch
// it finish. The same item may be added again — re-ingest is allowed, not blocked.
const SOURCE_TYPES = [
  { id:'reddit',   icon:'message-square', label:'Reddit link',  desc:'A single post or comment',  color:'#FF6040' },
  { id:'web',      icon:'globe',          label:'Web page',     desc:'One article, blog or page', color:'#38BDF8' },
  { id:'document', icon:'file-text',      label:'Document',     desc:'Upload a PDF, DOCX or TXT', color:'#C084FC' },
];

// Realistic items synthesized when a source is ingested in the prototype, so
// re-adding visibly stacks new rows. Cycled by add-count for variety.
const INGEST_SAMPLES = {
  reddit: [
    { title:'[D] Has anyone reproduced the muP scaling results at 7B?', feed:'ml',   author:'u/grad_descent',  score:1284, replies:142, cluster:'cyan'    },
    { title:'Why is nobody talking about data contamination in these evals?', feed:'art', author:'u/eval_skeptic', score:962,  replies:88,  cluster:'emerald' },
    { title:'The case against agentic benchmarks as they exist today',   feed:'sing', author:'u/tool_use',     score:1540, replies:233, cluster:'violet'  },
  ],
  web: [
    { title:'A Mathematical Framework for Transformer Circuits', feed:'arxiv', url:'arxiv.org/abs/2312.0001',          cluster:'cyan'    },
    { title:'The Bitter Lesson, revisited',                     feed:'hn',    url:'news.ycombinator.com/item?id=40210', cluster:'emerald' },
    { title:'How we think about model evaluations',             feed:'oai',   url:'openai.com/research/evals',          cluster:'cyan'    },
  ],
  document: [
    { title:'Mechanistic Interpretability Review.pdf', docSubtype:'pdf',  pages:52, size:'4.8 MB', cluster:'emerald' },
    { title:'Q3 research roadmap.docx',                docSubtype:'docx', pages:9,  size:'240 KB', cluster:'sky'     },
    { title:'safety-interview-notes.txt',              docSubtype:'txt',  pages:1,  size:'64 KB',  cluster:'violet'  },
  ],
};

// Seeded history for the “Recent jobs” panel — each is a finished manual ingest.
const RECENT_JOBS = [
  { id:'j1', kind:'post', title:'Why does attention scale quadratically?', detail:'1 post + 6 comments', count:7, status:'done',   time:'4 min ago'  },
  { id:'j2', kind:'web',  title:'Attention Is All You Need',               detail:'1 web page',         count:1, status:'done',   time:'12 min ago' },
  { id:'j3', kind:'pdf',  title:'LLM Survey 2025.pdf',                     detail:'84 pages indexed',   count:1, status:'done',   time:'2 hr ago'  },
  { id:'j4', kind:'web',  title:'euaiact.eu/article/53',                   detail:'fetch failed (403)', count:0, status:'failed', time:'3 hr ago'  },
];

Object.assign(window, {
  NETWORK_NODES, NODE_BY_ID, NETWORK_EDGES, deriveEdges,
  getNodeDetail, connectedTopics,
  FEEDS, FEED_BY_ID, SOURCES_DATA, SOURCES_TOTAL, SOURCES_BREAKDOWN, SOURCES_READY, SOURCES_ERRORS, SEARCH_RESULTS, SEARCH_SUGGESTIONS,
  RPT, RPT_CLUSTERS, RPT_TOP_SOURCES, SOURCE_TYPES, INGEST_SAMPLES, RECENT_JOBS,
});
