import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStore } from '../../data/app.store';
import { formatCount } from '../../core/format';
import { IconComponent } from '../../ui/primitives/icon.component';
import { PopoverComponent } from '../../ui/overlays/popover.component';
import { CheckboxComponent } from '../../ui/primitives/checkbox.component';
import { HBarListComponent, type HBarRow } from '../../ui/charts/hbar-list.component';
import { DonutChartComponent, type DonutSegment } from '../../ui/charts/donut-chart.component';
import { SentBarsComponent, type SentBarRow } from '../../ui/charts/sent-bars.component';
import { StatCardComponent } from '../../ui/charts/stat-card.component';
import { PageHeaderComponent } from '../../ui/primitives/page-header.component';
import { TabsComponent } from '../../ui/primitives/tabs.component';
import { ModalComponent } from '../../ui/overlays/modal.component';
import { ButtonComponent } from '../../ui/primitives/button.component';
import { NewCategoryModalComponent } from './new-category-modal.component';
import { SplitCategoryModalComponent } from './split-category-modal.component';
import type { Cluster } from '../../data/types';
import {
  applySorts,
  applyColumnFilters,
  toggleSort,
  type SortColumn,
  type ColumnFilters,
} from '../../ui/table-sort';

// 8-color curated palette (matching prototype PALETTE)
const PALETTE = [
  '#22D3EE',
  '#A78BFA',
  '#FB7185',
  '#34D399',
  '#FB923C',
  '#38BDF8',
  '#F472B6',
  '#A3E635',
];

const COLOR_NAMES: Record<string, string> = {
  '#22D3EE': 'Teal',
  '#A78BFA': 'Violet',
  '#FB7185': 'Coral',
  '#34D399': 'Emerald',
  '#FB923C': 'Amber',
  '#38BDF8': 'Sky',
  '#F472B6': 'Pink',
  '#A3E635': 'Lime',
};

/**
 * Derive a friendly color name from any color string the server may send.
 * Hex palette colors use the static map above; HSL colors are matched by
 * their hue angle so the name always reads naturally.
 */
function colorName(color: string): string {
  // 1. Try exact lookup (hex palette)
  const exact = COLOR_NAMES[color];
  if (exact) return exact;

  // 2. Parse HSL value:  "hsl(H S% L%)"
  const m = /hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/i.exec(color);
  if (m) {
    const h = Number(m[1]);
    return HUE_NAME(h);
  }

  // 3. Fallback — show the raw value
  return color;
}

/** Map a hue angle (0–359) to a unique friendly colour name via 10° bands. */
const HUE_NAMES = [
  'Crimson',
  'Coral',
  'Tangerine',
  'Amber',
  'Gold',
  'Chartreuse',
  'Lime',
  'Sage',
  'Green',
  'Emerald',
  'Jade',
  'Mint',
  'Forest',
  'Moss',
  'Pine',
  'Teal',
  'Cerulean',
  'Cyan',
  'Azure',
  'Sky',
  'Ocean',
  'Steel',
  'Indigo',
  'Slate',
  'Blue',
  'Denim',
  'Violet',
  'Iris',
  'Orchid',
  'Plum',
  'Magenta',
  'Pink',
  'Blush',
  'Rose',
  'Ruby',
  'Scarlet',
];

function HUE_NAME(h: number): string {
  const idx = Math.min(Math.floor(h / 10), HUE_NAMES.length - 1);
  return HUE_NAMES[idx];
}

interface CatRow {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly nodeCount: number;
  readonly docCount: number;
  readonly avgSent: number;
  readonly cluster: Cluster;
}

@Component({
  selector: 'app-categories-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    PopoverComponent,
    CheckboxComponent,
    HBarListComponent,
    DonutChartComponent,
    SentBarsComponent,
    StatCardComponent,
    PageHeaderComponent,
    TabsComponent,
    ModalComponent,
    ButtonComponent,
    NewCategoryModalComponent,
    SplitCategoryModalComponent,
  ],
  template: `
    <div class="root">
      <!-- Header -->
      <div class="header">
        <app-page-header
          heading="Manage categories"
          subtitle="Rename, recolor, merge, split or dissolve categories; changes restyle the network instantly."
        >
          <app-button variant="secondary" (pressed)="openFilterModal()">
            <app-icon name="filter" [size]="13" />
            Filter
          </app-button>
          <app-button variant="primary" (pressed)="openCreateModal()">
            <app-icon name="plus" [size]="14" />
          </app-button>
        </app-page-header>
      </div>

      <!-- Tab strip -->
      <app-tabs [tabs]="tabs" [(active)]="activeTab" />

      <!-- ═══ Categories (records) tab ═══ -->
      @if (activeTab() === 'records') {
        <!-- Toolbar -->
        <div class="toolbar">
          @if (sortedByCount() > 0) {
            <span class="toolbar-sort-badge"
              >Sorted by {{ sortedByCount() }} field{{ sortedByCount() === 1 ? '' : 's' }}</span
            >
          }
          <span class="toolbar-count"
            >{{ visibleRows().length }} of {{ rows().length }} categories</span
          >
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <div class="table">
            <!-- sticky head -->
            <div class="thead">
              <app-checkbox
                [checked]="allSelected()"
                [indeterminate]="selectedIds().size > 0 && !allSelected()"
                (toggled)="toggleAll()"
              />
              <span class="th th-swatch">Color</span>
              <div class="th-cell th-label">
                <button
                  class="th th-sort"
                  type="button"
                  (click)="toggleColumnSort('label', $event)"
                >
                  @let si = sortIndicator('label');
                  Category
                  <app-icon
                    [name]="si.icon"
                    [size]="17"
                    [color]="si.active ? '#FBBF24' : '#475569'"
                  />
                </button>
              </div>
              <div class="th-cell th-num">
                <button
                  class="th th-sort"
                  type="button"
                  (click)="toggleColumnSort('nodeCount', $event)"
                >
                  @let si2 = sortIndicator('nodeCount');
                  Topics
                  <app-icon
                    [name]="si2.icon"
                    [size]="17"
                    [color]="si2.active ? '#FBBF24' : '#475569'"
                  />
                </button>
              </div>
              <div class="th-cell th-num">
                <button
                  class="th th-sort"
                  type="button"
                  (click)="toggleColumnSort('docCount', $event)"
                >
                  @let si3 = sortIndicator('docCount');
                  Sources
                  <app-icon
                    [name]="si3.icon"
                    [size]="17"
                    [color]="si3.active ? '#FBBF24' : '#475569'"
                  />
                </button>
              </div>
              <div class="th-cell th-num">
                <button
                  class="th th-sort"
                  type="button"
                  (click)="toggleColumnSort('avgSent', $event)"
                >
                  @let si4 = sortIndicator('avgSent');
                  Sentiment
                  <app-icon
                    [name]="si4.icon"
                    [size]="17"
                    [color]="si4.active ? '#FBBF24' : '#475569'"
                  />
                </button>
              </div>
              <span class="th th-menu"></span>
            </div>

            @for (r of visibleRows(); track r.id) {
              @let on = selectedIds().has(r.id);
              <div class="tr" [class.sel]="on">
                <app-checkbox [checked]="on" (toggled)="toggleSelect(r.id)" />
                <div class="td td-swatch">
                  <div class="color-name-wrap">
                    <button
                      class="color-name-btn"
                      type="button"
                      [style.color]="r.color"
                      (click)="openColorPicker.set(r.id)"
                    >
                      {{ colorName(r.color) }}
                    </button>
                    <app-popover
                      [open]="openColorPicker() === r.id"
                      style="top: 30px; left: 0; padding: 12px; width: max-content;"
                      (closed)="openColorPicker.set(null)"
                    >
                      <div class="pop-label">Category color</div>
                      <div class="color-grid">
                        @for (col of PALETTE; track col) {
                          <button
                            class="color-swatch"
                            type="button"
                            [attr.aria-label]="'Set color ' + col"
                            [style.background]="col"
                            [class.picked]="col === r.color"
                            (click)="recolor(r.id, col)"
                          ></button>
                        }
                      </div>
                    </app-popover>
                  </div>
                </div>
                <div class="td td-main">
                  <!-- Editable label -->
                  @if (editingId() === r.id) {
                    <input
                      class="editor"
                      type="text"
                      [ngModel]="editingLabel()"
                      (ngModelChange)="editingLabel.set($event)"
                      (keydown.enter)="commitRename(r)"
                      (keydown.escape)="cancelRename()"
                    />
                  } @else {
                    <span
                      class="cat-label"
                      role="button"
                      tabindex="0"
                      (click)="startRename(r)"
                      (keyup.enter)="startRename(r)"
                      title="Click to rename"
                      >{{ r.label }}</span
                    >
                  }
                </div>
                <div class="td td-num">{{ r.nodeCount }}</div>
                <div class="td td-num">{{ fmtK(r.docCount) }}</div>
                @let sent = r.avgSent;
                <div class="td td-num" [style.color]="sent >= 0 ? '#34D399' : '#FB7185'">
                  {{ (sent >= 0 ? '+' : '−') + (sent < 0 ? -sent : sent).toFixed(2) }}
                </div>
                <div class="td td-menu">
                  <div class="menu-wrap">
                    <button class="menu-trigger" type="button" (click)="toggleRowMenu(r.id)">
                      <app-icon name="more-horizontal" [size]="15" />
                    </button>
                    <app-popover
                      [open]="rowMenuId() === r.id"
                      style="top: 32px; right: 0; width: 176px; padding: 6px;"
                      (closed)="rowMenuId.set(null)"
                    >
                      <button
                        class="menu-item"
                        type="button"
                        (click)="startSplit(r); rowMenuId.set(null)"
                      >
                        <app-icon name="hash" [size]="14" color="#94a3b8" />
                        <span>Split category</span>
                      </button>
                      <div class="menu-sep"></div>
                      <button
                        class="menu-item danger"
                        type="button"
                        (click)="startDissolve(r); rowMenuId.set(null)"
                      >
                        <app-icon name="trash-2" [size]="14" color="#FB7185" />
                        <span>Dissolve</span>
                      </button>
                    </app-popover>
                  </div>
                </div>
              </div>
            }

            @if (visibleRows().length === 0) {
              <div class="empty">
                @if (store.clusters().length === 0) {
                  No categories yet. Create one to start organizing topics.
                } @else {
                  No categories match this filter.
                }
              </div>
            }
          </div>
        </div>

        <!-- Floating bulk action bar -->
        @if (selectedIds().size > 0) {
          <div class="bulk-bar">
            <div class="bulk-left">
              <span class="bulk-badge">{{ selectedIds().size }}</span>
              <span class="bulk-label">{{
                selectedIds().size === 1 ? 'category selected' : 'categories selected'
              }}</span>
            </div>
            @if (selectedIds().size > 1) {
              <button class="btn-secondary" type="button" (click)="commitMerge()">
                <app-icon name="layers" [size]="13" />
                Merge into {{ selectedList()[0]?.label }}
              </button>
            }
            <button class="btn-clear" type="button" (click)="clearSelection()">Clear</button>
          </div>
        }
      }

      <!-- ═══ Analytics tab ═══ -->
      @if (activeTab() === 'analytics') {
        <div class="analytics-scroll">
          <!-- Stat strip -->
          <div class="stat-strip">
            <app-stat-card [value]="'' + store.clusters().length" label="Categories" />
            <app-stat-card [value]="'' + store.nodes().length" label="Nodes mapped" />
            <app-stat-card [value]="fmtK(store.totalDocs())" label="Documents" color="#22D3EE" />
            <app-stat-card
              [value]="fmtSent(store.avgSentiment())"
              label="Avg sentiment"
              [color]="store.avgSentiment() >= 0 ? '#34D399' : '#FB7185'"
            />
          </div>

          <!-- Charts grid -->
          <div class="charts-row">
            <div class="panel">
              <div class="panel-head">
                <span class="panel-title">Nodes per category</span>
                <span class="panel-meta">{{ store.nodes().length }} total</span>
              </div>
              <app-hbar-list [rows]="byNodes()" [emptyText]="'No categories yet'" />
            </div>
            <div class="panel">
              <div class="panel-head">
                <span class="panel-title">Document share</span>
              </div>
              <div class="donut-row">
                <app-donut-chart
                  [segments]="docSegs()"
                  [centerValue]="fmtK(store.totalDocs())"
                  centerLabel="documents"
                />
                <div class="donut-legend">
                  @for (s of docSegsWithPct(); track s.label) {
                    <div class="legend-item">
                      <span
                        class="legend-swatch"
                        [style.background]="s.color"
                        [style.boxShadow]="'0 0 5px ' + s.color + '70'"
                      ></span>
                      <span class="legend-label">{{ s.label }}</span>
                      <span class="legend-val">{{ fmtK(s.value) }}</span>
                      <span class="legend-pct">{{ s.pct }}%</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Sentiment bars panel -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Sentiment by category</span>
              <span class="panel-meta">diverging from 0</span>
            </div>
            <app-sent-bars [rows]="sentRows()" />
          </div>
        </div>
      }
    </div>

    <!-- ═══ New Category modal ═══ -->
    <app-new-category-modal
      [open]="creating()"
      [palette]="PALETTE"
      (create)="commitCreate($event)"
      (closed)="creating.set(false)"
    />

    <!-- ═══ Filter modal ═══ -->
    <app-modal
      [open]="showFilterModal()"
      title="Filter categories"
      (closed)="showFilterModal.set(false)"
      [showFooter]="true"
      [width]="440"
    >
      <div class="field">
        <label class="field-label" for="filter-search">Search</label>
        <input
          id="filter-search"
          class="field-input"
          type="text"
          [ngModel]="filter()"
          (ngModelChange)="filter.set($event)"
          placeholder="Filter by name or ID…"
        />
      </div>
      @for (col of ['label', 'nodeCount', 'docCount', 'avgSent']; track col) {
        <div class="field">
          <label class="field-label" [for]="'filter-' + col">{{ filterLabel(col) }}</label>
          <input
            [id]="'filter-' + col"
            class="field-input"
            type="text"
            [ngModel]="columnFilters()[col]"
            (ngModelChange)="setColumnFilter(col, $event)"
            [placeholder]="'Filter ' + filterLabel(col) + '…'"
          />
        </div>
      }
      <div footer style="display: flex; justify-content: space-between; width: 100%; gap: 8px">
        <button
          class="btn-secondary"
          type="button"
          style="min-width: 80px; padding: 9px 16px; font-size: 13px"
          (click)="clearAllFilters()"
        >
          Reset
        </button>
        <button
          class="btn-primary"
          type="button"
          style="min-width: 80px"
          (click)="showFilterModal.set(false)"
        >
          Apply
        </button>
      </div>
    </app-modal>

    <!-- ═══ Split Category modal ═══ -->
    <app-split-category-modal
      [cat]="splitCat()"
      [members]="splitMembers()"
      [palette]="PALETTE"
      (split)="commitSplit($event)"
      (closed)="splitCat.set(null)"
    />

    <!-- ═══ Dissolve popover ═══ -->
    @if (dissolvingId(); as sourceId) {
      <app-popover
        [open]="true"
        style="top: 38px; right: 0; width: 248px; padding: 14px;"
        (closed)="cancelDissolve()"
      >
        <div class="dissolve-title">Dissolve "{{ dissolveCatLabel() }}"?</div>
        @if (dissolveNodeCount() > 0) {
          <p class="dissolve-desc">
            {{ dissolveNodeCount() }} node{{ dissolveNodeCount() > 1 ? 's' : '' }} need a category.
            Move them to:
          </p>
          <div class="dissolve-options">
            @for (o of dissolveOthers(); track o.id) {
              <button
                class="dissolve-opt"
                type="button"
                [class.on]="dissolveTarget() === o.id"
                (click)="dissolveTarget.set(o.id)"
              >
                <span
                  class="dot-sm"
                  [style.background]="o.color"
                  [style.boxShadow]="'0 0 6px ' + o.color + '80'"
                ></span>
                <span class="dissolve-opt-label">{{ o.label }}</span>
                @if (dissolveTarget() === o.id) {
                  <app-icon name="check" [size]="12" color="#FBBF24" [strokeWidth]="3" />
                }
              </button>
            }
            <button
              class="dissolve-opt"
              type="button"
              [class.on]="dissolveTarget() === ''"
              (click)="dissolveTarget.set('')"
            >
              <span class="dot-sm" style="background: #475569;"></span>
              <span class="dissolve-opt-label" style="color: #94a3b8;">Leave uncategorized</span>
              @if (dissolveTarget() === '') {
                <app-icon name="check" [size]="12" color="#FBBF24" [strokeWidth]="3" />
              }
            </button>
          </div>
        } @else {
          <p class="dissolve-desc">This category has no nodes. It will be removed.</p>
        }
        <div class="dissolve-actions">
          <button class="btn-ghost" type="button" (click)="cancelDissolve()">Cancel</button>
          <button class="btn-danger" type="button" (click)="commitDissolve()">Dissolve</button>
        </div>
      </app-popover>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .root {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      color: #94a3b8;
    }
    .sel {
      background: rgba(251, 191, 36, 0.04);
      box-shadow: inset 2px 0 0 #fbbf24;
    }
    .tr:nth-child(odd) {
      background: rgba(255, 255, 255, 0.018);
    }
    .tr.sel:nth-child(odd) {
      background: rgba(251, 191, 36, 0.06);
    }
    .color-name-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 500;
    }
    .cat-label {
      font-size: 13.5px;
      font-weight: 500;
      color: #f1f5f9;
      cursor: text;
      border-radius: 0;
      padding: 2px 5px;
      margin: -2px -5px;
      transition: background 120ms ease-out;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cat-label:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .editor {
      background: #0b1120;
      border: 1px solid rgba(251, 191, 36, 0.35);
      color: #f1f5f9;
      border-radius: 0;
      padding: 5px 9px;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      width: 100%;
      max-width: 280px;
      letter-spacing: -0.01em;
    }
    .sel-opt {
      background: rgba(251, 191, 36, 0.08);
      border-color: rgba(251, 191, 36, 0.35);
    }
    @keyframes tnPop {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class CategoriesScreenComponent {
  protected readonly store = inject(AppStore);
  private readonly router = inject(Router);

  // ── tabs ──
  protected readonly activeTab = signal<string>('records');
  protected readonly tabs = [
    { id: 'records', label: 'Categories', icon: 'list' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  ];

  // ── filter + selection ──
  protected readonly filter = signal('');
  protected readonly selectedIds = signal<Set<string>>(new Set());

  // ── sort ──
  protected readonly sortBy = signal<SortColumn[]>([]);

  protected toggleColumnSort(column: string, event: MouseEvent): void {
    this.sortBy.update((cur) => toggleSort(cur, column, event.shiftKey));
  }

  protected sortIndicator(column: string): { icon: string; active: boolean } {
    const list = this.sortBy();
    const idx = list.findIndex((s) => s.column === column);
    if (idx === -1) return { icon: 'chevrons-up-down', active: false };
    const dir = list[idx].dir;
    return {
      icon: dir === 'asc' ? 'chevron-up' : 'chevron-down',
      active: idx === 0,
    };
  }

  // ── column filters ──
  protected readonly columnFilters = signal<ColumnFilters>({});
  protected readonly showFilterModal = signal(false);

  protected openFilterModal(): void {
    this.showFilterModal.set(true);
  }

  protected clearAllFilters(): void {
    this.filter.set('');
    this.columnFilters.set({});
  }

  protected setColumnFilter(column: string, value: string): void {
    this.columnFilters.update((cur) => ({ ...cur, [column]: value }));
  }

  protected removeColumnFilter(column: string): void {
    this.columnFilters.update((cur) => {
      const next = { ...cur };
      delete next[column];
      return next;
    });
  }

  protected hasColumnFilter(column: string): boolean {
    return (this.columnFilters()[column] ?? '').trim() !== '';
  }

  protected readonly columnFilterCount = computed(
    () => Object.entries(this.columnFilters()).filter(([, v]) => v.trim() !== '').length,
  );

  protected readonly sortedByCount = computed(() => this.sortBy().length);

  protected filterLabel(column: string): string {
    const labels: Record<string, string> = {
      label: 'Category',
      nodeCount: 'Topics',
      docCount: 'Sources',
      avgSent: 'Sentiment',
    };
    return labels[column] ?? column;
  }

  // Prune stale selections when clusters change
  constructor() {
    effect(() => {
      const ids = new Set(this.store.clusters().map((c) => c.id));
      this.selectedIds.update((prev) => {
        const next = new Set([...prev].filter((k) => ids.has(k)));
        return next.size === prev.size ? prev : next;
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // ── rename ──
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingLabel = signal('');

  protected startRename(r: CatRow): void {
    this.editingId.set(r.id);
    this.editingLabel.set(r.label);
  }
  protected cancelRename(): void {
    this.editingId.set(null);
    this.editingLabel.set('');
  }

  protected async commitRename(r: CatRow): Promise<void> {
    const label = this.editingLabel().trim();
    if (!label || label === r.label) {
      this.cancelRename();
      return;
    }
    await this.store.renameCluster(r.id, label);
    this.cancelRename();
  }

  // ── recolor ──
  protected readonly openColorPicker = signal<string | null>(null);
  protected async recolor(id: string, color: string): Promise<void> {
    this.openColorPicker.set(null);
    await this.store.recolorCluster(id, color);
  }

  // ── row menu ──
  protected readonly rowMenuId = signal<string | null>(null);
  protected toggleRowMenu(id: string): void {
    this.rowMenuId.update((v) => (v === id ? null : id));
  }

  // ── create modal ──
  protected readonly creating = signal(false);

  protected openCreateModal(): void {
    this.creating.set(true);
  }

  protected async commitCreate(input: { label: string; color: string }): Promise<void> {
    await this.store.createCluster(input.label, input.color);
    this.creating.set(false);
  }

  // ── dissolve ──
  protected readonly dissolvingId = signal<string | null>(null);
  protected readonly dissolveTarget = signal('');
  protected startDissolve(r: CatRow): void {
    const others = this.store.clusters().filter((c) => c.id !== r.id);
    this.dissolvingId.set(r.id);
    this.dissolveTarget.set(others[0]?.id ?? '');
  }
  protected cancelDissolve(): void {
    this.dissolvingId.set(null);
    this.dissolveTarget.set('');
  }

  protected async commitDissolve(): Promise<void> {
    const from = this.dissolvingId();
    const to = this.dissolveTarget();
    if (!from) return;
    this.dissolvingId.set(null);
    if (to) {
      await this.store.dissolveCluster(from, to);
    } else {
      // Leave uncategorized: delete the cluster; nodes become unassigned
      await this.store.deleteCluster(from);
    }
    this.dissolveTarget.set('');
  }

  // ── merge ──
  protected async commitMerge(): Promise<void> {
    const list = this.selectedList();
    const target = list[0];
    if (!target) return;
    const sources = list.slice(1).map((r) => r.id);
    if (sources.length === 0) return;
    await this.store.mergeCategories(sources, target.id);
    this.selectedIds.set(new Set());
  }

  // ── split ──
  protected readonly splitCat = signal<CatRow | null>(null);

  protected startSplit(r: CatRow): void {
    this.splitCat.set(r);
  }
  protected readonly splitMembers = computed(() => {
    const cat = this.splitCat();
    if (!cat) return [];
    return this.store.nodes().filter((n) => n.cluster === cat.id);
  });

  protected async commitSplit(input: {
    name: string;
    color: string;
    nodeIds: string[];
  }): Promise<void> {
    const cat = this.splitCat();
    if (!cat) return;
    await this.store.splitCategory(cat.id, input.nodeIds, input.name, input.color);
    this.splitCat.set(null);
  }

  // ── computed rows ──
  protected readonly rows = computed<readonly CatRow[]>(() => {
    const stats = this.store.clusterStats();
    return this.store.clusters().map((c) => {
      const st = stats.get(c.id) ?? { count: 0, docs: 0, sentSum: 0, sentCount: 0 };
      return {
        id: c.id,
        label: c.label,
        color: c.color,
        nodeCount: st.count,
        docCount: st.docs,
        avgSent: st.sentCount > 0 ? st.sentSum / st.sentCount : 0,
        cluster: c,
      };
    });
  });

  protected readonly visibleRows = computed(() => {
    const f = this.filter().trim().toLowerCase();
    let rows = this.rows();
    if (f)
      rows = rows.filter(
        (r) => r.label.toLowerCase().includes(f) || r.id.toLowerCase().includes(f),
      );
    const colAcc = {
      label: (r: CatRow) => r.label,
      nodeCount: (r: CatRow) => r.nodeCount,
      docCount: (r: CatRow) => r.docCount,
      avgSent: (r: CatRow) => r.avgSent,
    };
    rows = applyColumnFilters(rows, this.columnFilters(), colAcc);
    return applySorts(rows, this.sortBy(), colAcc);
  });

  // ── bulk selection helpers ──
  protected readonly allSelected = computed(() => {
    const v = this.visibleRows();
    return v.length > 0 && v.every((r) => this.selectedIds().has(r.id));
  });

  protected toggleSelect(id: string): void {
    this.selectedIds.update((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.visibleRows().map((r) => r.id)));
    }
  }

  protected readonly selectedList = computed(() =>
    this.rows().filter((r) => this.selectedIds().has(r.id)),
  );

  // ── analytics computeds ──
  protected readonly byNodes = computed<readonly HBarRow[]>(() =>
    [...this.rows()]
      .sort((a, b) => b.nodeCount - a.nodeCount)
      .map((r) => ({ label: r.label, value: r.nodeCount, color: r.color })),
  );

  protected readonly docSegs = computed<readonly DonutSegment[]>(() =>
    [...this.rows()]
      .sort((a, b) => b.docCount - a.docCount)
      .map((r) => ({ label: r.label, value: r.docCount, color: r.color })),
  );

  protected readonly totalDocsForPct = computed(
    () => this.docSegs().reduce((a, s) => a + s.value, 0) || 1,
  );

  protected readonly docSegsWithPct = computed(() =>
    this.docSegs().map((s) => ({
      ...s,
      pct: Math.round((s.value / this.totalDocsForPct()) * 100),
    })),
  );

  protected readonly sentRows = computed<readonly SentBarRow[]>(() =>
    [...this.rows()]
      .filter((r) => r.nodeCount > 0)
      .sort((a, b) => b.avgSent - a.avgSent)
      .map((r) => ({ label: r.label, value: r.avgSent, color: r.color })),
  );

  // ── dissolve helpers ──
  protected readonly dissolveCatLabel = computed(() => {
    const id = this.dissolvingId();
    if (!id) return '';
    return this.store.clusters().find((c) => c.id === id)?.label ?? '';
  });
  protected readonly dissolveNodeCount = computed(() => {
    const id = this.dissolvingId();
    if (!id) return 0;
    return this.rows().find((r) => r.id === id)?.nodeCount ?? 0;
  });
  protected readonly dissolveOthers = computed(() => {
    const id = this.dissolvingId();
    if (!id) return [];
    return this.store.clusters().filter((c) => c.id !== id);
  });

  protected goToTopics(): void {
    this.router.navigate(['/topics']);
  }

  // ── utilities ──

  protected readonly PALETTE = PALETTE;
  protected readonly fmtK = formatCount;
  protected readonly colorName = colorName;

  protected fmtSent(v: number): string {
    return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  }
}
