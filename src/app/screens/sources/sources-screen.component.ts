import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	HostListener,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../data/app.store';
import { formatCount } from '../../core/format';
import { CheckboxComponent } from '../../ui/primitives/checkbox.component';
import { IconComponent } from '../../ui/primitives/icon.component';
import { PopoverComponent } from '../../ui/overlays/popover.component';
import { StatCardComponent } from '../../ui/charts/stat-card.component';
import { HBarListComponent, type HBarRow } from '../../ui/charts/hbar-list.component';
import { StatusBadgeComponent } from '../../ui/primitives/status-badge.component';
import { PageHeaderComponent } from '../../ui/primitives/page-header.component';
import { SearchInputComponent } from '../../ui/primitives/search-input.component';
import { TabsComponent } from '../../ui/primitives/tabs.component';
import { ButtonComponent } from '../../ui/primitives/button.component';
import { AddSourceModalComponent } from './add-source-modal.component';
import type { DataSource, Job, SourceStatus, SourceType } from '../../data/types';
import {
	applySorts,
	applyColumnFilters,
	toggleSort,
	type SortColumn,
	type SortAccessors,
	type ColumnFilters,
} from '../../ui/table-sort';

// ── View model ────────────────────────────────────────────────────────

interface SourceRow {
	readonly key: string;
	/** Display name (e.g. "arxiv.org", "r/MachineLearning"). */
	readonly name: string;
	/** Secondary line (e.g. "Web · 410 docs/day"). */
	readonly subtitle: string;
	readonly status: SourceStatus;
	readonly type: SourceType;
	readonly persistent: boolean;
	readonly sourceId: number | null;
	readonly defaultClusterId: string | null;
	readonly documentCount: number | null;
	readonly lastIngestAt: string | null;
}

const TYPE_LABEL: Record<SourceType, string> = {
	reddit: 'Reddit',
	web: 'Web',
	pdf: 'PDF',
	docx: 'DOCX',
	txt: 'Text',
};

const TYPE_ICON: Record<SourceType, string> = {
	reddit: 'message-circle',
	web: 'globe',
	pdf: 'file-text',
	docx: 'file-text',
	txt: 'file-text',
};

// ── Component ─────────────────────────────────────────────────────────

/**
 * Sources screen — redesigned to match the prototype table layout.
 *
 * Features:
 *   - Tab switcher: Records | Analytics
 *   - Search input + type/status dropdown filters
 *   - Summary line (X of Y sources · Z docs)
 *   - Table columns: Source, Default cluster, Documents, Last ingest, Status
 *   - Row checkboxes (visual)
 *   - Cluster reassign dropdown per row
 *   - Three-dot action menu per row
 *   - Combines persistent `AppStore.sources()` and ephemeral
 *     `AppStore.sessionJobs()`.
 */
@Component({
	selector: 'app-sources-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule, IconComponent, CheckboxComponent, PopoverComponent,
		StatCardComponent, HBarListComponent, StatusBadgeComponent, AddSourceModalComponent,
		PageHeaderComponent, SearchInputComponent, TabsComponent, ButtonComponent],
	template: `
		<div class="root">
			<!-- Header -->
			<div class="header">
				<app-page-header
					heading="Manage sources"
					subtitle="A source is a connector — a subreddit, site or upload batch — that streams documents into the network. Rename, repoint its default cluster, pause, re-ingest or disconnect it. Each source feeds many nodes."
				>
					<app-search-input [(value)]="searchQuery" placeholder="Filter sources…" />
					<app-button variant="primary" (pressed)="modal.open()">
						<app-icon name="plus" [size]="14" />
					</app-button>
				</app-page-header>
			</div>

			<!-- Tab strip -->
			<app-tabs [tabs]="sourcesTabs" [(active)]="tab" />

			<!-- ═══ Records tab ═══ -->
			@if (tab() === 'records') {
				<!-- Filter toolbar -->
				<div class="toolbar">
					<div class="cat-filter-wrap">
						<button class="cat-filter-btn" [class.active]="typeFilter() != null" type="button" (click)="toggleTypeMenu()">
							<span>{{ typeFilterLabel() }}</span>
							<app-icon name="chevron-down" [size]="13" color="#475569" />
						</button>
						<app-popover [open]="typeMenuOpen()" (closed)="typeMenuOpen.set(false)"
							style="top: 40px; left: 0; width: 160px; padding: 6px;">
							<button class="cf-option" type="button" (click)="typeFilter.set(null); typeMenuOpen.set(false)">
								<app-icon name="layers" [size]="13" [color]="typeFilter() == null ? '#FBBF24' : '#475569'" />
								<span>All types</span>
							</button>
							@for (t of allTypes; track t) {
								<button class="cf-option" [class.cf-active]="typeFilter() === t" type="button"
									(click)="typeFilter.set(t); typeMenuOpen.set(false)">
									<app-icon [name]="typeIcon(t)" [size]="13" color="#94a3b8" />
									<span>{{ typeLabel(t) }}</span>
								</button>
							}
						</app-popover>
					</div>
					<div class="cat-filter-wrap">
						<button class="cat-filter-btn" [class.active]="statusFilter() != null" type="button" (click)="toggleStatusMenu()">
							<span>{{ statusFilterLabel() }}</span>
							<app-icon name="chevron-down" [size]="13" color="#475569" />
						</button>
						<app-popover [open]="statusMenuOpen()" (closed)="statusMenuOpen.set(false)"
							style="top: 40px; left: 0; width: 160px; padding: 6px;">
							<button class="cf-option" type="button" (click)="statusFilter.set(null); statusMenuOpen.set(false)">
								<app-icon name="circle" [size]="13" [color]="statusFilter() == null ? '#FBBF24' : '#475569'" />
								<span>All status</span>
							</button>
							@for (s of allStatuses; track s) {
								<button class="cf-option" [class.cf-active]="statusFilter() === s" type="button"
									(click)="statusFilter.set(s); statusMenuOpen.set(false)">
									<span>{{ statusLabel(s) }}</span>
								</button>
							}
						</app-popover>
					</div>
					<div class="cat-filter-wrap">
						<button class="cat-filter-btn" [class.active]="filterOpen() || columnFilterCount() > 0" type="button" (click)="filterOpen.set(!filterOpen())">
							<app-icon name="filter" [size]="13" [color]="columnFilterCount() > 0 ? '#FBBF24' : '#475569'" />
							<span>Filter</span>
							@if (columnFilterCount() > 0) {
								<span class="toolbar-badge">{{ columnFilterCount() }}</span>
							}
						</button>
					</div>
					@if (sortedByCount() > 0) {
						<span class="toolbar-sort-badge">Sorted by {{ sortedByCount() }} field{{ sortedByCount() === 1 ? '' : 's' }}</span>
					}
					<span class="toolbar-count">{{ visibleCount() }} of {{ rows().length }} sources · {{ totalDocsLabel() }}</span>
				</div>

				<!-- Filter panel -->
				@if (filterOpen()) {
					<div class="filter-panel">
						<div class="fp-head">Filter</div>
						@for (col of ['name', 'cluster', 'documents', 'lastIngest', 'status']; track col) {
							<div class="fp-row">
								<span class="fp-col">{{ filterLabel(col) }}</span>
								<input class="fp-input" type="text" [ngModel]="columnFilters()[col] ?? ''"
									(ngModelChange)="setColumnFilter(col, $event)"
									[placeholder]="'Filter ' + filterLabel(col) + '…'" />
								@if (hasColumnFilter(col)) {
									<button class="fp-clear" type="button" (click)="removeColumnFilter(col)">
										<app-icon name="x" [size]="12" color="#94a3b8" />
									</button>
								}
							</div>
						}
					</div>
				}

				<!-- Table -->
				<div class="table-wrap">
					<div class="table">
						<!-- sticky head -->
						<div class="thead">
							<app-checkbox
								[checked]="allSelected()"
								[indeterminate]="selectedIds().size > 0 && !allSelected()"
								(toggled)="toggleAll()" />
							<div class="th-cell th-source">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('name', $event)">
									@let si = sortIndicator('name');
									Source
									<app-icon [name]="si.icon" [size]="17" [color]="si.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-cluster">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('cluster', $event)">
									@let si2 = sortIndicator('cluster');
									Default cluster
									<app-icon [name]="si2.icon" [size]="17" [color]="si2.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-num">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('documents', $event)">
									@let si3 = sortIndicator('documents');
									Documents
									<app-icon [name]="si3.icon" [size]="17" [color]="si3.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-num">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('lastIngest', $event)">
									@let si4 = sortIndicator('lastIngest');
									Last ingest
									<app-icon [name]="si4.icon" [size]="17" [color]="si4.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-status">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('status', $event)">
									@let si5 = sortIndicator('status');
									Status
									<app-icon [name]="si5.icon" [size]="17" [color]="si5.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<span class="th th-menu"></span>
						</div>

						@for (row of visibleRows(); track row.key) {
							@let on = selectedIds().has(row.key);
							<div class="tr" [class.sel]="on">
								<app-checkbox [checked]="on" (toggled)="toggleSelect(row.key)" />

								<!-- Source cell -->
								<div class="td td-main">
									<div class="source-icon" [attr.data-type]="row.type">
										<app-icon [name]="typeIcon(row.type)" [size]="16" />
									</div>
									<div class="source-meta">
										<span class="source-name">{{ row.name }}</span>
										<span class="source-sub">{{ row.subtitle }}</span>
									</div>
								</div>

								<!-- Default cluster -->
								<div class="td td-cluster">
									@if (row.persistent) {
										<span>{{ defaultClusterLabel(row.defaultClusterId) }}</span>
									} @else {
										<span style="color: #475569;">—</span>
									}
								</div>

								<div class="td td-num">
									@if (row.documentCount != null) {
										{{ row.documentCount | number }}
									} @else {
										<span style="color: #475569;">—</span>
									}
								</div>
								<div class="td td-num">
									@if (row.lastIngestAt) {
										{{ relativeTime(row.lastIngestAt) }}
									} @else {
										<span style="color: #475569;">—</span>
									}
								</div>
								<div class="td td-status">
									<app-status-badge [status]="row.status" [label]="statusLabel(row.status)" />
								</div>
								<div class="td td-menu">
									<div class="menu-wrap">
										<button class="menu-trigger" type="button" (click)="toggleRowMenu(row.key)">
											<app-icon name="more-horizontal" [size]="15" />
										</button>
										<app-popover [open]="rowMenuFor() === row.key"
											(closed)="rowMenuFor.set(null)"
											style="top: 32px; right: 0; width: 166px; padding: 6px;">
											@if (row.persistent) {
												<button class="menu-item danger" type="button"
													(click)="disconnect(row); rowMenuFor.set(null)"
													[disabled]="deleting() === row.sourceId">
													<app-icon name="trash-2" [size]="13" color="#FB7185" />
													<span>Disconnect</span>
												</button>
											}
										</app-popover>
									</div>
								</div>
							</div>
						}

						@if (visibleRows().length === 0) {
							<div class="empty">
								@if (rows().length === 0) {
									No sources configured yet.
								} @else {
									No sources match these filters.
								}
							</div>
						}
					</div>
				</div>
			}

			<!-- ═══ Analytics tab ═══ -->
			@if (tab() === 'analytics') {
				@if (rows().length === 0) {
					<div class="empty">No sources to analyze.</div>
				} @else {
					<div class="analytics-scroll">
						<!-- Stat strip -->
						<div class="stat-strip">
							<app-stat-card [value]="'' + rows().length" label="Sources" />
							<app-stat-card [value]="'' + activeCount()" label="Active" color="#34D399" />
							<app-stat-card [value]="fmtK(store.totalDocs())" label="Total documents" color="#22D3EE" />
							<app-stat-card [value]="fmtK(avgDocsPerSource())" label="Avg docs / source" />
						</div>

						<!-- Charts grid -->
						<div class="charts-row">
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Sources by type</span>
									<span class="panel-meta">{{ typeDistribution().length }} types</span>
								</div>
								<app-hbar-list [rows]="typeDistRows()" [emptyText]="'No sources yet'" />
							</div>
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Documents by type</span>
									<span class="panel-meta">from persistent sources</span>
								</div>
								<app-hbar-list [rows]="docDistRows()" [emptyText]="'No documents yet'" />
							</div>
						</div>
					</div>
				}
			}
		</div>

		<app-add-source-modal #modal />
	`,
	styles: [
		`
			:host { display: flex; flex: 1; min-height: 0; }
			.root {
				flex: 1; display: flex; flex-direction: column;
				min-height: 0;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #94a3b8;
			}

			/* ── header ── */
			.header { padding: 36px 32px 0; margin-bottom: 22px; flex-shrink: 0; }
			.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
			.header-text { min-width: 0; }
			.header-text h1 { font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.02em; margin: 0 0 6px; }
			.header-text p {
				font-size: 13px; color: #475569; margin-top: 3px; max-width: 580px;
				text-wrap: pretty; display: -webkit-box; -webkit-box-orient: vertical;
				-webkit-line-clamp: 2; overflow: hidden;
			}
			.header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

			/* ── tabs ── */
			.tabs {
				display: flex; gap: 4px;
				padding: 0 32px; margin-bottom: 22px;
				border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
			}
			.tab {
				display: flex; align-items: center; gap: 7px;
				padding: 8px 14px; margin-bottom: -1px;
				background: transparent; border: none;
				border-bottom: 2px solid transparent;
				cursor: pointer; font-family: inherit; font-size: 13px;
				font-weight: 600;
				color: #475569; transition: color 120ms, border-color 120ms;
			}
			.tab:hover { color: #94a3b8; }
			.tab.on { color: #fbbf24; border-bottom-color: #fbbf24; }

			/* ── search ── */
			.search-wrap { position: relative; width: 240px; flex-shrink: 0; }
			.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
			.search-input {
				width: 100%; font: 400 13px 'Space Grotesk', system-ui, sans-serif;
				color: #f1f5f9; background: #0f1828;
				border: 1px solid rgba(255,255,255,0.09); border-radius: 0;
				padding: 8px 12px 8px 32px; outline: none;
			}
			.search-input:focus { border-color: rgba(251,191,36,0.35); }

			/* ── toolbar ── */
			.toolbar {
				display: flex; gap: 10px; align-items: center;
				padding: 0 32px 8px; flex-shrink: 0;
			}
			.toolbar-count { font-size: 12px; color: #475569; font-family: 'JetBrains Mono', monospace; white-space: nowrap; margin-left: auto; }

			/* ── filter popovers ── */
			.cat-filter-wrap { position: relative; }
			.cat-filter-btn {
				display: flex; align-items: center; gap: 8px;
				padding: 7px 12px; border-radius: 0; cursor: pointer;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 12.5px; color: #94a3b8;
				background: #0f1828;
				border: 1px solid rgba(255,255,255,0.09);
			}
			.cat-filter-btn:hover { color: #f1f5f9; }
			.cat-filter-btn.active { border-color: rgba(251,191,36,0.35); }
			.cf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
			.cf-option {
				display: flex; align-items: center; gap: 9px;
				width: 100%; padding: 7px 8px; border-radius: 0;
				background: transparent; border: none; cursor: pointer;
				font-family: inherit; font-size: 12.5px; color: #f1f5f9;
				text-align: left;
			}
			.cf-option:hover { background: rgba(255,255,255,0.04); }
			.cf-option.cf-active { background: rgba(251,191,36,0.08); }

			/* ── table ── */
			.table-wrap { flex: 1; overflow-y: auto; padding: 0 0 90px; }
			.table { display: flex; flex-direction: column; }
			.thead {
				display: flex; align-items: center; gap: 12px;
				padding: 0 32px 9px;
				border-bottom: 1px solid rgba(255,255,255,0.05);
				position: sticky; top: 0; background: #090e1c; z-index: 2;
			}
			.th {
				font-size: 10.5px; font-weight: 600; color: #475569;
				text-transform: uppercase; letter-spacing: 0.04em;
			}
			.th-source { flex: 1; min-width: 0; }
			.th-cluster { width: 140px; }
			.th-num { width: 100px; text-align: right; }
			.th-status { width: 80px; }
			.th-menu { width: 40px; }

			/* sortable headers */
			.th-cell {
				display: flex; align-items: center; gap: 12px;
			}
			.th-cell.th-source { flex: 1; min-width: 0; }
			.th-cell.th-cluster { width: 140px; }
			.th-cell.th-num { width: 100px; justify-content: flex-end; }
			.th-cell.th-status { width: 80px; }
			.th-sort {
				background: transparent; border: none; cursor: pointer;
				font-family: inherit; font-size: inherit; font-weight: inherit;
				text-transform: inherit; letter-spacing: inherit;
				display: flex; align-items: center; gap: 12px;
				transition: color 120ms; padding: 0;
			}
			.th-sort:hover { color: #94a3b8; }
			.th-sort:has(app-icon) { color: #94a3b8; }

			/* filter panel */
			.filter-panel {
				margin: 0 32px 10px;
				border: 1px solid rgba(255,255,255,0.09);
				background: #0b1120;
			}
			.fp-head {
				font-size: 10px; font-weight: 700; text-transform: uppercase;
				letter-spacing: 0.06em; color: #475569;
				padding: 10px 12px 6px; border-bottom: 1px solid rgba(255,255,255,0.05);
			}
			.fp-row {
				display: flex; align-items: center; gap: 8px;
				padding: 6px 12px;
			}
			.fp-col {
				font-size: 12px; color: #94a3b8; width: 90px; flex-shrink: 0;
			}
			.fp-input {
				flex: 1; max-width: 260px;
				font: 400 12px 'Space Grotesk', system-ui, sans-serif;
				color: #f1f5f9; background: #0f1828;
				border: 1px solid rgba(255,255,255,0.09);
				padding: 5px 8px; outline: none;
			}
			.fp-input:focus { border-color: rgba(251,191,36,0.3); }
			.fp-clear {
				background: transparent; border: none; cursor: pointer;
				padding: 2px; display: flex; align-items: center;
			}
			.toolbar-sort-badge {
				font-size: 11px; color: #FBBF24; font-family: inherit;
				background: rgba(251,191,36,0.1); padding: 4px 9px;
				border: 1px solid rgba(251,191,36,0.2);
			}
			.toolbar-badge {
				display: inline-flex; align-items: center; justify-content: center;
				min-width: 16px; height: 16px; font-size: 10px; font-weight: 700;
				background: #FBBF24; color: #090e1c; padding: 0 4px;
			}

			.tr {
				display: flex; align-items: center; gap: 12px;
				padding: 12px 32px;
				border-bottom: 1px solid rgba(255,255,255,0.05);
				background: transparent; transition: background 120ms;
			}
			.tr.sel {
				background: rgba(251,191,36,0.04);
				box-shadow: inset 2px 0 0 #fbbf24;
			}
			.tr:nth-child(odd) { background: rgba(255,255,255,0.018); }
			.tr.sel:nth-child(odd) { background: rgba(251,191,36,0.06); }
			.td { display: flex; align-items: center; }
			.td-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
			.td-cluster { width: 140px; position: relative; }
			.td-num {
				width: 100px; justify-content: flex-end;
				font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #94a3b8;
			}
			.td-status { width: 80px; }
			.td-menu { width: 40px; justify-content: flex-end; }

			/* ── source icon ── */
			.source-icon {
				width: 30px; height: 30px; border-radius: 0;
				display: flex; align-items: center; justify-content: center;
				flex-shrink: 0;
				background: rgba(255,255,255,0.05); color: #94a3b8;
			}
			.source-icon[data-type='reddit'] { background: rgba(255,96,64,0.12); color: #ff6040; }
			.source-icon[data-type='web'] { background: rgba(56,189,248,0.12); color: #38bdf8; }
			.source-icon[data-type='pdf'],
			.source-icon[data-type='docx'],
			.source-icon[data-type='txt'] { background: rgba(192,132,252,0.12); color: #c084fc; }
			.source-meta {
				display: flex; flex-direction: column; min-width: 0; gap: 2px;
			}
			.source-name {
				font-size: 13px; font-weight: 600; color: #f1f5f9;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.source-sub {
				font-size: 11px; color: #475569;
				font-family: 'JetBrains Mono', monospace;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}

			/* ── cluster dropdown ── */
			.td-cluster { position: relative; }
			.cluster-btn {
				display: inline-flex; align-items: center; gap: 5px;
				background: transparent; border: 1px solid rgba(255,255,255,0.08);
				border-radius: 0; color: #94a3b8;
				padding: 5px 9px; font-size: 11.5px; font-family: inherit; cursor: pointer;
			}
			.cluster-btn:hover { border-color: rgba(255,255,255,0.18); color: #f1f5f9; }

			/* ── row menu ── */
			.menu-wrap { position: relative; display: flex; justify-content: flex-end; }
			.menu-trigger {
				width: 28px; height: 28px; border-radius: 0;
				border: none; background: transparent; color: #94a3b8; cursor: pointer;
				display: flex; align-items: center; justify-content: center;
			}
			.menu-trigger:hover { background: rgba(255,255,255,0.04); color: #f1f5f9; }
			.menu-item {
				display: flex; align-items: center; gap: 10px;
				width: 100%; padding: 8px 9px; border-radius: 0;
				background: transparent; border: none; cursor: pointer;
				font-family: inherit; text-align: left; font-size: 12.5px;
				color: #f1f5f9;
			}
			.menu-item:hover { background: rgba(255,255,255,0.04); }
			.menu-item.danger { color: #fb7185; }
			.menu-item.danger:hover { background: rgba(251,113,133,0.08); }
			.menu-item:disabled { opacity: 0.4; cursor: default; }
			.menu-sep { height: 1px; background: rgba(255,255,255,0.05); margin: 5px 4px; }

			/* ── Analytics ── */
			.analytics-scroll { flex: 1; overflow-y: auto; padding: 18px 32px 28px; display: flex; flex-direction: column; gap: 16px; }
			.stat-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 16px; flex-shrink: 0; }
			.charts-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
			.panel {
				background: #0f1828; border: 1px solid rgba(255,255,255,0.05);
				border-radius: 0; padding: 16px;
				display: flex; flex-direction: column; min-width: 0;
			}
			.panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-shrink: 0; }
			.panel-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
			.panel-meta { font-size: 11px; color: #2a3d66; font-family: 'JetBrains Mono', monospace; margin-left: auto; }

			/* ── buttons ── */
			.btn-primary {
				display: flex; align-items: center; gap: 7px;
				padding: 9px 16px; background: #fbbf24; color: #06090f;
				border: none; border-radius: 0; font-size: 13px;
				font-family: inherit; font-weight: 600; cursor: pointer; flex-shrink: 0;
			}
			.btn-primary:hover { background: #fcd34d; }
			.btn-primary:disabled { opacity: 0.4; cursor: default; }

			.empty { font-size: 13px; color: #475569; padding: 32px; text-align: center; }
		`,
	],
})
export class SourcesScreenComponent {
	protected readonly store = inject(AppStore);

	protected readonly modal = viewChild.required<AddSourceModalComponent>('modal');

	// ── tabs ──
	protected readonly tab = signal<string>('records');
	protected readonly sourcesTabs = [
		{ id: 'records', label: 'Records', icon: 'list' },
		{ id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
	];

	// ── Filters ────────────────────────────────────────────────────────

	protected readonly searchQuery = signal('');
	protected readonly typeFilter = signal<SourceType | null>(null);
	protected readonly statusFilter = signal<SourceStatus | null>(null);
	protected readonly typeMenuOpen = signal(false);
	protected readonly statusMenuOpen = signal(false);

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
	protected readonly filterOpen = signal(false);

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

	protected readonly columnFilterCount = computed(() =>
		Object.entries(this.columnFilters()).filter(([, v]) => v.trim() !== '').length,
	);

	protected readonly sortedByCount = computed(() => this.sortBy().length);

	protected filterLabel(column: string): string {
		const labels: Record<string, string> = { name: 'Source', cluster: 'Default cluster', documents: 'Documents', lastIngest: 'Last ingest', status: 'Status' };
		return labels[column] ?? column;
	}

	protected readonly allTypes: readonly SourceType[] = ['reddit', 'web', 'pdf', 'docx', 'txt'];
	protected readonly allStatuses: readonly SourceStatus[] = ['idle', 'fetching', 'done', 'error'];

	protected readonly typeFilterLabel = computed(() =>
		this.typeFilter() ? this.typeLabel(this.typeFilter()!) : 'All types',
	);
	protected readonly statusFilterLabel = computed(() =>
		this.statusFilter() ? this.statusLabel(this.statusFilter()!) : 'All status',
	);

	protected toggleTypeMenu(): void {
		this.typeMenuOpen.update((v) => !v);
		this.statusMenuOpen.set(false);
	}
	protected toggleStatusMenu(): void {
		this.statusMenuOpen.update((v) => !v);
		this.typeMenuOpen.set(false);
	}

	// ── selection ──
	protected readonly selectedIds = signal<Set<string>>(new Set());

	@HostListener('document:keydown.escape')
	protected clearSelection(): void { this.selectedIds.set(new Set()); }

	protected readonly allSelected = computed(() => {
		const v = this.visibleRows();
		return v.length > 0 && v.every((r) => this.selectedIds().has(r.key));
	});

	protected toggleSelect(key: string): void {
		this.selectedIds.update((prev) => {
			const n = new Set(prev);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});
	}

	protected toggleAll(): void {
		if (this.allSelected()) {
			this.selectedIds.set(new Set());
		} else {
			this.selectedIds.set(new Set(this.visibleRows().map((r) => r.key)));
		}
	}

	// ── Row data ───────────────────────────────────────────────────────

	protected readonly deleting = signal<number | null>(null);

	protected readonly rows = computed<readonly SourceRow[]>(() => {
		const persistent = this.store.sources().map<SourceRow>((s) => ({
			key: `s-${s.id}`,
			name: this.displayName(s),
			subtitle: this.buildSubtitle(s),
			status: s.status,
			type: s.source_type,
			persistent: true,
			sourceId: s.id,
			defaultClusterId: s.defaultClusterId ?? null,
			documentCount: s.documentCount ?? null,
			lastIngestAt: s.lastIngestAt ?? null,
		}));
		const persistentSourceIds = new Set(persistent.map((r) => r.sourceId));
		const transient = this.store
			.sessionJobs()
			.filter((j) => !persistentSourceIds.has(this.jobSourceId(j)))
			.map<SourceRow>((j) => ({
				key: `j-${j.id}`,
				name: j.label,
				subtitle: j.message ?? 'queued in this session',
				status: j.status,
				type: j.sourceType,
				persistent: false,
				sourceId: null,
				defaultClusterId: null,
				documentCount: null,
				lastIngestAt: null,
			}));
		return [...persistent, ...transient];
	});

	protected readonly visibleRows = computed<readonly SourceRow[]>(() => {
		const q = this.searchQuery().trim().toLowerCase();
		const tf = this.typeFilter();
		const sf = this.statusFilter();
		let rows = this.rows();
		if (tf) rows = rows.filter((r) => r.type === tf);
		if (sf) rows = rows.filter((r) => r.status === sf);
		if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
		const colAcc: SortAccessors<SourceRow> = {
			name: (r) => r.name,
			cluster: (r) => r.defaultClusterId,
			documents: (r) => r.documentCount,
			lastIngest: (r) => r.lastIngestAt,
			status: (r) => r.status,
		};
		rows = applyColumnFilters(rows, this.columnFilters(), colAcc);
		return applySorts(rows, this.sortBy(), colAcc);
	});

	protected readonly visibleCount = computed(() => this.visibleRows().length);

	protected readonly totalDocsLabel = computed(() => {
		const total = this.store.totalDocs();
		return total > 0 ? `${this.formatNum(total)} docs` : '0 docs';
	});

	// ── Cluster display ──────────────────────────────────────────────────

	protected defaultClusterLabel(clusterId: string | null): string {
		if (!clusterId) return 'None';
		return this.store.clusters().find((c) => c.id === clusterId)?.label ?? clusterId;
	}

	// ── Row action menu ────────────────────────────────────────────────

	protected readonly rowMenuFor = signal<string | null>(null);

	protected toggleRowMenu(key: string): void {
		this.rowMenuFor.set(this.rowMenuFor() === key ? null : key);
	}

	protected async disconnect(row: SourceRow): Promise<void> {
		if (!row.persistent || row.sourceId == null) return;
		if (!confirm('Disconnect this source? Derived nodes stay until you delete them explicitly.')) {
			return;
		}
		this.deleting.set(row.sourceId);
		try {
			await this.store.deleteSource(row.sourceId);
		} finally {
			this.deleting.set(null);
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────

	protected typeIcon(type: SourceType): string {
		return TYPE_ICON[type];
	}

	protected typeLabel(type: SourceType): string {
		return TYPE_LABEL[type];
	}

	protected readonly fmtK = formatCount;

	protected statusLabel(status: SourceStatus): string {
		switch (status) {
			case 'idle': return 'Idle';
			case 'fetching': return 'Active';
			case 'done': return 'Active';
			case 'error': return 'Error';
		}
	}

	protected relativeTime(iso: string): string {
		if (!iso) return '';
		const diff = Date.now() - new Date(iso).getTime();
		const sec = Math.floor(diff / 1000);
		if (sec < 60) return 'just now';
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min} min ago`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr} hr ago`;
		const days = Math.floor(hr / 24);
		if (days === 1) return '1 day ago';
		return `${days} days ago`;
	}

	private displayName(source: DataSource): string {
		const cfg = source.config ?? {};
		const url =
			(cfg as { threadUrl?: string }).threadUrl ??
			(cfg as { url?: string }).url ??
			(cfg as { filename?: string }).filename;
		if (!url) return '(no metadata)';
		try {
			const u = new URL(url);
			if (source.source_type === 'reddit') {
				const parts = u.pathname.split('/').filter(Boolean);
				const sub = parts[1];
				return sub ? `r/${sub}` : u.hostname;
			}
			return u.hostname.replace(/^www\./, '');
		} catch {
			return url.length > 50 ? url.slice(0, 47) + '\u2026' : url;
		}
	}

	private buildSubtitle(source: DataSource): string {
		const parts = [this.typeLabel(source.source_type)];
		if (source.documentCount != null) {
			parts.push(`${this.formatNum(source.documentCount)} documents`);
		}
		return parts.join(' \u00b7 ');
	}

	private formatNum(n: number): string {
		if (n >= 1000) {
			const k = n / 1000;
			return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`;
		}
		return String(n);
	}

	private jobSourceId(j: Job): number {
		const match = /^src-(\d+)$/.exec(j.id);
		return match ? Number(match[1]) : -1;
	}

	// ── analytics ──

	protected readonly activeCount = computed(() =>
		this.rows().filter((r) => r.status === 'fetching' || r.status === 'done').length,
	);

	protected readonly avgDocsPerSource = computed(() => {
		const persistent = this.rows().filter((r) => r.persistent && r.documentCount != null);
		if (persistent.length === 0) return 0;
		return persistent.reduce((sum, r) => sum + (r.documentCount ?? 0), 0) / persistent.length;
	});

	protected readonly typeDistribution = computed(() => {
		const map = new Map<SourceType, number>();
		for (const r of this.rows().filter((r) => r.persistent)) {
			map.set(r.type, (map.get(r.type) ?? 0) + 1);
		}
		return [...map.entries()]
			.map(([type, count]) => ({ type, count, label: TYPE_LABEL[type], icon: TYPE_ICON[type] }))
			.sort((a, b) => b.count - a.count);
	});

	protected readonly docDistribution = computed(() => {
		const map = new Map<SourceType, number>();
		for (const r of this.rows().filter((r) => r.persistent && r.documentCount != null)) {
			map.set(r.type, (map.get(r.type) ?? 0) + (r.documentCount ?? 0));
		}
		return [...map.entries()]
			.map(([type, count]) => ({ type, count, label: TYPE_LABEL[type], icon: TYPE_ICON[type] }))
			.sort((a, b) => b.count - a.count);
	});

	protected readonly typeDistRows = computed<readonly HBarRow[]>(() => {
		const colors: Record<SourceType, string> = { reddit: '#ff6040', web: '#38bdf8', pdf: '#c084fc', docx: '#c084fc', txt: '#c084fc' };
		return this.typeDistribution().map((d) => ({ label: d.label, value: d.count, color: colors[d.type] }));
	});

	protected readonly docDistRows = computed<readonly HBarRow[]>(() => {
		const colors: Record<SourceType, string> = { reddit: '#ff6040', web: '#38bdf8', pdf: '#c084fc', docx: '#c084fc', txt: '#c084fc' };
		return this.docDistribution().map((d) => ({ label: d.label, value: d.count, color: colors[d.type] }));
	});
}
