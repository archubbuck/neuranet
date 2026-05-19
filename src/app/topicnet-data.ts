export interface ClusterDef {
  id: string;
  label: string;
  color: string;
  count: number;
}

export interface TopicNode {
  id: string;
  label: string;
  cluster: string;
  r: number;
  importance: number;
  degree: number;
  desc: string;
}

export const CLUSTER_DEFS: ClusterDef[] = [
  { id: 'purple', label: 'AI / ML Core', color: '#7878ff', count: 7 },
  { id: 'orange', label: 'Data Science', color: '#ff8c42', count: 5 },
  { id: 'teal', label: 'NLP & Language', color: '#3fcfbc', count: 5 },
  { id: 'rose', label: 'Computer Vision', color: '#ff607a', count: 4 },
  { id: 'yellow', label: 'Mathematics', color: '#f5c842', count: 3 },
  { id: 'green', label: 'Applications', color: '#6bcb77', count: 3 },
];

export const TOPICS: TopicNode[] = [
  { id: 'ml', label: 'Machine Learning', cluster: 'purple', r: 44, importance: 10, degree: 6, desc: 'Algorithms that learn patterns from data to make predictions or decisions without explicit programming.' },
  { id: 'dl', label: 'Deep Learning', cluster: 'purple', r: 28, importance: 8, degree: 5, desc: 'Multi-layer neural networks capable of learning hierarchical representations from raw data.' },
  { id: 'nn', label: 'Neural Networks', cluster: 'purple', r: 22, importance: 7, degree: 3, desc: 'Computational models loosely inspired by biological neurons and synaptic connections.' },
  { id: 'rl', label: 'Reinforcement Learning', cluster: 'purple', r: 20, importance: 7, degree: 3, desc: 'Agents maximize cumulative reward through trial-and-error interaction with an environment.' },
  { id: 'sl', label: 'Supervised Learning', cluster: 'purple', r: 17, importance: 6, degree: 2, desc: 'Training on labeled input-output pairs to learn generalizable prediction mappings.' },
  { id: 'ul', label: 'Unsupervised Learning', cluster: 'purple', r: 15, importance: 5, degree: 2, desc: 'Discovering inherent structure in unlabeled data via clustering or dimensionality reduction.' },
  { id: 'tl', label: 'Transfer Learning', cluster: 'purple', r: 14, importance: 5, degree: 2, desc: 'Adapting pretrained models to new tasks by leveraging previously learned representations.' },
  { id: 'ds', label: 'Data Science', cluster: 'orange', r: 30, importance: 8, degree: 5, desc: 'Combining statistics, programming, and domain expertise to extract insights from data.' },
  { id: 'fe', label: 'Feature Engineering', cluster: 'orange', r: 19, importance: 6, degree: 3, desc: 'Crafting informative input representations to improve model performance and generalization.' },
  { id: 'stat', label: 'Statistics', cluster: 'orange', r: 23, importance: 7, degree: 3, desc: 'Mathematical methods for collecting, analyzing, and drawing conclusions from data.' },
  { id: 'bi', label: 'Business Intelligence', cluster: 'orange', r: 17, importance: 5, degree: 2, desc: 'Frameworks for transforming enterprise data into actionable strategic insights.' },
  { id: 'etl', label: 'Data Pipelines', cluster: 'orange', r: 14, importance: 4, degree: 2, desc: 'Automated workflows for reliably extracting, transforming, and loading data at scale.' },
  { id: 'nlp', label: 'NLP', cluster: 'teal', r: 28, importance: 8, degree: 5, desc: 'Computational techniques enabling machines to understand and generate human language.' },
  { id: 'llm', label: 'Large Language Models', cluster: 'teal', r: 26, importance: 9, degree: 4, desc: 'Foundation models with billions of parameters trained on massive text corpora.' },
  { id: 'trans', label: 'Transformers', cluster: 'teal', r: 20, importance: 7, degree: 4, desc: 'Attention-based architecture that transformed sequence modeling across NLP and beyond.' },
  { id: 'embed', label: 'Word Embeddings', cluster: 'teal', r: 15, importance: 5, degree: 2, desc: 'Dense vector representations capturing semantic relationships between tokens.' },
  { id: 'sent', label: 'Sentiment Analysis', cluster: 'teal', r: 13, importance: 4, degree: 2, desc: 'Classifying emotional valence and opinion polarity in text using NLP methods.' },
  { id: 'cv', label: 'Computer Vision', cluster: 'rose', r: 26, importance: 8, degree: 4, desc: 'Enabling machines to extract meaningful information from images and video streams.' },
  { id: 'obj', label: 'Object Detection', cluster: 'rose', r: 19, importance: 6, degree: 3, desc: 'Identifying and localizing multiple objects of interest within a visual scene.' },
  { id: 'seg', label: 'Segmentation', cluster: 'rose', r: 16, importance: 5, degree: 2, desc: 'Partitioning images into semantically meaningful pixel-level regions.' },
  { id: 'gan', label: 'GANs', cluster: 'rose', r: 15, importance: 5, degree: 2, desc: 'Generative Adversarial Networks - adversarial training for synthetic data generation.' },
  { id: 'la', label: 'Linear Algebra', cluster: 'yellow', r: 20, importance: 6, degree: 3, desc: 'Vectors, matrices, and transformations that form the mathematical backbone of ML.' },
  { id: 'prob', label: 'Probability Theory', cluster: 'yellow', r: 18, importance: 6, degree: 3, desc: 'Formal framework for quantifying uncertainty and reasoning about random processes.' },
  { id: 'opt', label: 'Optimization', cluster: 'yellow', r: 16, importance: 5, degree: 2, desc: 'Minimizing loss functions via gradient descent and related iterative methods.' },
  { id: 'auto', label: 'Automation', cluster: 'green', r: 18, importance: 5, degree: 2, desc: 'Deploying AI to perform repetitive processes at scale, reducing manual effort.' },
  { id: 'rob', label: 'Robotics', cluster: 'green', r: 16, importance: 5, degree: 3, desc: 'Integrating ML with physical systems to enable autonomous perception and action.' },
  { id: 'hci', label: 'Human-AI Interaction', cluster: 'green', r: 14, importance: 4, degree: 2, desc: 'Designing intuitive interfaces enabling effective human-AI collaboration.' },
  { id: 'bc', label: 'Blockchain', cluster: 'purple', r: 18, importance: 4, degree: 3, desc: 'Distributed ledger enabling trustless, immutable, transparent transaction records.' },
  { id: 'crypto', label: 'Cryptography', cluster: 'purple', r: 14, importance: 3, degree: 2, desc: 'Mathematical techniques securing digital information through encryption and hashing.' },
  { id: 'dist', label: 'Distributed Systems', cluster: 'purple', r: 12, importance: 3, degree: 2, desc: 'Architectures spreading computation across multiple coordinated networked nodes.' },
  { id: 'p2p', label: 'P2P Networks', cluster: 'purple', r: 10, importance: 2, degree: 1, desc: 'Decentralized topologies where peers communicate and share resources directly.' },
  { id: 'bio', label: 'Bioinformatics', cluster: 'teal', r: 17, importance: 4, degree: 2, desc: 'Applying computational methods to analyze biological sequences and genomic data.' },
  { id: 'genomics', label: 'Genomics', cluster: 'teal', r: 13, importance: 3, degree: 2, desc: 'Large-scale analysis of complete DNA sequences and gene expression patterns.' },
  { id: 'protein', label: 'Protein Folding', cluster: 'teal', r: 11, importance: 3, degree: 1, desc: 'Predicting three-dimensional protein structure from amino acid sequence.' },
];

export const EDGES_RAW: Array<[string, string]> = [
  ['ml', 'dl'], ['ml', 'ds'], ['ml', 'nlp'], ['ml', 'cv'], ['ml', 'la'], ['ml', 'auto'],
  ['dl', 'nn'], ['dl', 'rl'], ['dl', 'tl'], ['dl', 'cv'],
  ['nn', 'sl'], ['nn', 'ul'], ['sl', 'fe'],
  ['ds', 'stat'], ['ds', 'fe'], ['ds', 'bi'], ['ds', 'etl'], ['stat', 'prob'], ['stat', 'ml'],
  ['nlp', 'llm'], ['nlp', 'trans'], ['nlp', 'embed'], ['nlp', 'sent'],
  ['llm', 'trans'], ['trans', 'embed'],
  ['cv', 'obj'], ['cv', 'seg'], ['cv', 'gan'],
  ['la', 'opt'], ['la', 'prob'], ['opt', 'dl'],
  ['auto', 'rob'], ['rob', 'hci'], ['rl', 'rob'],
  ['llm', 'cv'],
  ['bc', 'crypto'], ['bc', 'dist'], ['dist', 'p2p'],
  ['bio', 'genomics'], ['genomics', 'protein'],
];

export const TN = {
  bg: '#0b0b18',
  panel: '#0f0f1e',
  panel2: '#141428',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.1)',
  text: 'rgba(255,255,255,0.92)',
  mid: 'rgba(255,255,255,0.55)',
  dim: 'rgba(255,255,255,0.28)',
  navH: 54,
  sbW: 280,
  detW: 340,
};

export function clusterColor(clusterId: string): string {
  return CLUSTER_DEFS.find((c) => c.id === clusterId)?.color ?? '#888';
}

export function getNeighbours(nodeId: string): TopicNode[] {
  const ids = new Set<string>();
  for (const [a, b] of EDGES_RAW) {
    if (a === nodeId) {
      ids.add(b);
    }
    if (b === nodeId) {
      ids.add(a);
    }
  }
  return TOPICS.filter((topic) => ids.has(topic.id));
}

export interface TopicDoc {
  id: number;
  title: string;
  text: string;
  status: string;
  derivedNodeSlugs?: string[];
}

export interface TopicEdge {
  source: string;
  target: string;
  kind?: string;
}

export interface NetworkOverlay {
  derivedClusters: ClusterDef[];
  derivedNodes: TopicNode[];
  derivedEdges: TopicEdge[];
}
