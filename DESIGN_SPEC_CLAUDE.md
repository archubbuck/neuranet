# Topic Visualizer — Design Spec for Claude Design Agent

## Brand & Identity

**Product**: TopicNet
**Tagline**: Visualize conversations, discover connections.
**Vibe**: Dark, futuristic, analytical. Think Bloomberg Terminal meets a mind map.
**Font**: Space Grotesk (sans-serif, all weights from 400-700, from Google Fonts)

---

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#0b0b18` | Page backgrounds |
| `panel` | `#0f0f1e` | Cards, nav, sidebar, detail panel |
| `panel2` | `#141428` | Slightly lighter panels, stat cards |
| `border` | `rgba(255,255,255,0.07)` | Subtle borders |
| `border2` | `rgba(255,255,255,0.13)` | Stronger borders |
| `amber` | `#f59e0b` | Primary accent (active tabs, CTAs, selection highlights) |
| `amberBg` | `rgba(245,158,11,0.1)` | Amber background tint for active tabs |
| `text` | `rgba(255,255,255,0.92)` | Primary text |
| `mid` | `rgba(255,255,255,0.55)` | Secondary text |
| `dim` | `rgba(255,255,255,0.28)` | Muted text, placeholders |
| Cluster colors | auto-generated: `hsl(H 72% 62%)` | Each cluster gets a unique hue via hash of its slug |

---

## Layout Structure

### Frame
Full-screen app (100vw × 100vh), no scrolling on page level. All overflow handled by internal panels.

### Layout Zones
```
┌──────────────────────────────────────────────────┐
│                    Navbar (54px)                  │
├─────────┬───────────────────────────┬────────────│
│         │                           │             │
│ Sidebar │    Network Canvas         │  Detail     │
│ (280px) │    (flex fill)            │  Panel      │
│         │                           │  (340px,    │
│         │       Stats bar (bottom-  │   slide-in) │
│         │       left overlay)       │             │
│         │                           │             │
│         │ Source Panel toggle btn   │             │
│         │ (floating bottom-right)   │             │
└─────────┴───────────────────────────┴────────────┘
```

---

## Pages & Components

### Page 1: Workspace List (`/`)

**Layout**: Vertically stacked in a centered column (max 900px).

```
┌──────────────────────────────────────────────────┐
│ Topic Visualizer    Workspaces                    │  ← Header (20px heading, 14px subtitle)
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │            [+ New Workspace]                │ │  ← Create button (amber bg, dark text)
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│ │ Reddit ML     │  │ AI Research   │  │ New      ││  ← Cards (grid, auto-fill, min 260px)
│ │ Discussion    │  │ Review        │  │ Workspace││
│ │               │  │               │  │          ││
│ │ 2 sources     │  │ 0 sources     │  │ 1 source ││
│ │ Open →        │  │ Open →        │  │ Open →   ││
│ └──────────────┘  └──────────────┘  └──────────┘│
│                                                  │
│ Empty state (if no workspaces):                   │
│ "No workspaces yet."                             │
│ "Create one to start building a topic network..." │
└──────────────────────────────────────────────────┘
```

**Interactions**:
- Click "+ New Workspace" → inline form slides down with two inputs (name, description) + Create/Cancel buttons
- Click card → navigate to `/workspace/:id`
- Hover card → amber border glow, subtle upward translate

**Create Form (expanded)**:
```
┌──────────────────────────────────────────────┐
│ [Workspace name____________________________] │
│ [Description (optional)____________________] │
│ [Create] [Cancel]                            │
└──────────────────────────────────────────────┘
```

---

### Page 2: Workspace Network (`/workspace/:id`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ TopicNet  /  Reddit ML Discussion   [Network] [Upload]       [▤]  │  ← Navbar
├──────────────┬─────────────────────────────────────────┬────────────┤
│ Clusters     │                                         │            │
│              │    (D3 Force-directed graph)            │  Detail    │
│ ◎ All        │         ◉ ← central node                │  Panel     │
│   12 nodes   │        /  \                              │  (hidden   │
│              │       ●    ●   ← depth-1 topics          │  by        │
│ ● ai-core    │      / \    / \                          │  default)  │
│   3          │     ●   ●  ●   ●  ← depth-2 sub-topics  │            │
│              │                                         │            │
│ ● data-sci   │     ◉ = central (larger, amber glow)    │            │
│   2          │     ● = topic (color by cluster)        │            │
│              │     ─ = connection                       │            │
│ ● nlp        │                                         │            │
│   5          │   ┌─ 12 nodes  3 edges  1 doc ─┐        │            │
│              │   └──────────────────────────────┘        │            │
│              │                                         │            │
│              │                               [Data Sources]  ← btn  │
└──────────────┴─────────────────────────────────────────┴────────────┘
```

#### Navbar Component
- **Left**: Logo `◉ TopicNet` (links to `/`) + breadcrumb `/ Workspace Name`
- **Center**: Tab links `Network` (active), `Upload`
- **Right**: Sidebar toggle button `▤`

#### Sidebar Component
- Collapsible (width animates from 280px to 0px, 0.28s cubic-bezier)
- **Title**: "Clusters"
- **Rows**: Each cluster shows:
  - Colored dot (8px), cluster label, item count badge
  - Underneath: horizontal bar chart (proportional to count vs max, colored)
- Active cluster filter: clicking a row dims all other clusters in the graph
- Click again to clear filter

#### Network Canvas Component
- **Background**: Dot-grid pattern (28px spacing, 0.8px dots at 4% white opacity)
- **Nodes**: Circles colored by cluster, sized by importance (`r` field, 10-44px)
  - Nodes with `r >= 16` show text labels (font size = `max(9, min(13, r * 0.32))`)
  - 3-layer SVG structure: selection ring → halo → body circle
- **Edges**: Subtle white lines (10% opacity, 1.2px width)
- **Selection**: Click node → amber ring + halo highlight; background click → deselect
- **Dragging**: Nodes are draggable; released nodes return to simulation
- **Zoom**: Scroll to zoom (0.3× – 3×), click-drag background to pan
- **Stats bar**: Absolute overlay at bottom-left; rounded pill with dark background
  - Shows: `N nodes`, `N edges`, `N documents`
- **Simulation**: D3 force-directed layout with link, charge, center, and collision forces

#### Detail Panel Component
- **Position**: Absolute, right side, slides in (transform translateX, 0.3s cubic-bezier)
- **Width**: 340px, full height
- **Content** (when node selected):
  - Cluster badge (small pill with colored dot, uppercase)
  - Close button `✕` (top-right)
  - Node label (22px, bold)
  - Description text (13px, mid color, 1.6 line height)
  - Stats row (2 cards side by side):
    - **Degree** (purple `#7878ff` stat) — number of connections
    - **Importance** (amber stat) — X/10
  - "Related topics" section with colored chips (pill badges, cluster-colored)
- **Empty state**: "◎ Click any node in the network to inspect its connections and details."

#### Source Panel Component (toggle overlay)
- **Position**: Right of canvas, 340px wide, toggled by floating button
- **Header**: "Data Sources" + "+ Add Source" button
- **Empty state**: "No data sources yet. Add a Reddit thread to get started."
- **Source rows**:
  - 📌 Reddit badge
  - URL preview (truncated)
  - Status badge with color: yellow "Pending", blue "Fetching…", green "Done", red "Error"
  - Delete button `×` (turns red on hover)
- **Add form** (toggled by "+ Add Source"):
  - Label: "Reddit Thread URL"
  - Input: placeholder `https://www.reddit.com/r/.../comments/...`
  - Button: "Fetch Thread" (amber, disabled when empty)
  - On submit: creates source, triggers fetch, loads network
- **Floating toggle button**: Bottom-right, amber, `[Data Sources]` / `[Hide Sources]`

---

### Page 3: Upload (`/workspace/:id/upload`)

**Layout**: Centered single-column, ~600px max-width.

```
┌──────────────────────────────────────────────────┐
│ ◉ TopicNet  /  Reddit ML Discussion   [Upload]   │
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │           Import Content                     │ │  ← Heading
│ │  Add documents to extract semantic topics    │ │
│ │  and build your network.                     │ │
│ │                                              │ │
│ │  ┌──────────────────────────────────────┐   │ │
│ │  │           ↑                          │   │ │
│ │  │   Drop .txt or .md files here        │   │ │  ← Drop zone (dashed border)
│ │  │   or paste text below                │   │ │
│ │  └──────────────────────────────────────┘   │ │
│ │                                              │ │
│ │  ────────────────── or ──────────────────    │ │  ← Divider
│ │                                              │ │
│ │  [Document title (optional)______________]  │ │  ← Input
│ │  ┌──────────────────────────────────────┐   │ │
│ │  │ Paste your text content here...      │   │ │  ← Textarea (5 rows)
│ │  │                                      │   │ │
│ │  └──────────────────────────────────────┘   │ │
│ │                                              │ │
│ │  [+ Add Document]                            │ │  ← Button
│ │                                              │ │
│ │  Processed ────────────────── 2 docs ─────  │ │  ← Queue header
│ │  ● Brain-Computer Interfaces     ✓ ready     │ │
│ │  ● Neural Networks Overview     ✓ ready     │ │  ← Queue items
│ │                                              │ │
│ │  [View Network →]                            │ │  ← Navigation button
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Interactions**:
- Start dragging file → drop zone gets `.dragging` class (CSS-only visual feedback)
- Drop .txt/.md → auto-fills title from filename, text from content
- Empty title → saves as "Untitled document"
- Click "+ Add Document" → sends to API, shows processing indicator
- Disabled button while processing: shows "Processing..."
- Error banner appears below button for API failures
- Success → appended to processed queue, form resets
- "View Network" navigates to `/workspace/:id`

---

## User Flows

### Flow 1: First-time user
1. Open app → see empty workspace list with CTA
2. Click "+ New Workspace" → form slides down
3. Enter name "My Research" → click "Create"
4. Card appears in grid → click to open
5. See empty network view with "Data Sources" button
6. Click "Data Sources" → panel slides in
7. Click "+ Add Source" → URL field appears
8. Paste Reddit URL → click "Fetch Thread"
9. Spinner appears → network populates with central node + topic nodes
10. Click nodes → detail panel shows info

### Flow 2: Exploring a network
1. Open workspace from list
2. See network graph with central node and radiating topics
3. Drag nodes to rearrange
4. Scroll to zoom into a cluster
5. Click cluster in sidebar → graph filters to show only that cluster
6. Click a node → detail panel slides in with stats and related topics
7. Click related topic chip → jumps to that node

### Flow 3: Adding more content
1. From workspace, click "Upload" tab
2. Paste text about a new topic
3. Click "+ Add Document"
4. See doc in queue with "✓ ready"
5. Click "View Network" or "Network" tab
6. New nodes appear in graph, connected to existing topics

---

## Transitions & Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Sidebar collapse | width → 0 | 280ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Detail panel slide | transform translateX → 0 | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Node selection ring | opacity 0 → 1 | 200ms | transition |
| Node halo highlight | opacity 0.15 → 0.4 | 200ms | transition |
| Cluster dim | opacity 1 → 0.15 | 200ms | transition |
| Workspace card hover | translateY(-2px), border-color | 150ms | transition |
| Button hover | opacity 0.85 | 150ms | transition |

---

## Responsive Breakpoints

| Breakpoint | Adjustments |
|------------|-------------|
| ≤900px | Logo shell width 160px (was 280px), tab padding 14px (was 22px) |

---

## Mockup Guidance

When mocking up the network graph page, prioritize:
1. The dark aesthetic with the amber accent
2. The layered node rendering (halo → body → label)
3. The right-side detail panel as an overlay, not pushing content
4. The sidebar as a collapsible navigation/filter element
5. The bottom-left stats overlay
6. The floating "Data Sources" button

Use dummy data for mockups:
- **Workspace name**: "Reddit ML Discussion"
- **Central node**: "What are you working on in ML?" (large, centered)
- **Depth-1**: "Reinforcement Learning", "Computer Vision", "NLP", "Generative Models"
- **Depth-2**: "Policy Gradients", "Object Detection", "Sentiment Analysis", "Diffusion Models"
- **Clusters**: "Reinforcement Learning", "Computer Vision", "NLP", "Deep Learning"

The legacy `/network` route (with static 34 seed topics about ML/DL) can be ignored — the workspace-based approach is the primary experience.
