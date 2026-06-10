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
import { AppStore } from '../data/app.store';
import { formatCount } from '../core/format';
import { CheckboxComponent } from '../ui/checkbox.component';
import { IconComponent } from '../ui/icon.component';
import { PopoverComponent } from '../ui/popover.component';
import { ModalComponent } from '../ui/modal.component';
import { StatCardComponent } from '../ui/stat-card.component';
import { HBarListComponent, type HBarRow } from '../ui/bar-list.component';
import { PageHeaderComponent } from '../ui/page-header.component';
import { SearchInputComponent } from '../ui/search-input.component';
import { TabsComponent } from '../ui/tabs.component';
import { ButtonComponent } from '../ui/button.component';
import type { Cluster, Node } from '../data/types';
import {
	applySorts,
	applyColumnFilters,
	toggleSort,
	type SortColumn,
	type ColumnFilters,
} from '../ui/table-sort';

interface TopicRow {
	readonly id: string;
	readonly title: string;
	readonly cluster: string;
	readonly color: string;
	readonly docCount: number;
	readonly linkCount: number;
	readonly sentiment: number | null;
	readonly node: Node;
}

/**
 * Topics management screen — lists all nodes with search, category filter,
 * inline rename, bulk actions (reassign / merge / delete), and an analytics
 * tab with distribution charts.
 *
 * Mirrors the prototype's NodesManageScreen (Records + Analytics tabs).
 */
@Component({
	selector: 'app-topics-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, FormsModule, CheckboxComponent, IconComponent, PopoverComponent,
		ModalComponent, StatCardComponent, HBarListComponent,
		PageHeaderComponent, SearchInputComponent, TabsComponent, ButtonComponent],
	template: `
		<div class="root">
			<!-- Header -->
			<div class="header">
				<app-page-header
					heading="Manage topics"
					subtitle="Rename, reassign to a category, merge duplicates, remove topics, or add one by hand. Edits restructure the network graph immediately."
				>
					<app-search-input [(value)]="searchFilter" placeholder="Filter topics…" />
					<app-button variant="primary" (pressed)="openCreateModal()">
						<app-icon name="plus" [size]="14" />
					</app-button>
				</app-page-header>
			</div>

			<!-- Tab strip -->
			<app-tabs [tabs]="topicsTabs()" [(active)]="tab" />

			@if (tab() === 'records') {
				<!-- Toolbar -->
				<div class="toolbar">
					<!-- Category filter popover -->
					<div class="cat-filter-wrap">
						<button class="cat-filter-btn" [class.active]="categoryFilter() !== ''" type="button"
							(click)="catFilterOpen.set(!catFilterOpen())">
							@if (categoryFilter()) {
								<span class="cf-dot" [style.background]="catFilterColor()"></span>
							}
							<span>{{ catFilterLabel() }}</span>
							<app-icon name="chevron-down" [size]="13" color="#475569" />
						</button>
						<app-popover [open]="catFilterOpen()" (close)="catFilterOpen.set(false)"
							style="top: 40px; left: 0; width: 200px; padding: 6px;">
							<button class="cf-option" [class.cf-all]="categoryFilter() === ''" type="button"
								(click)="setCategoryFilter(''); catFilterOpen.set(false)">
								<app-icon name="layers" [size]="13" [color]="categoryFilter() === '' ? '#FBBF24' : '#475569'" />
								<span>All categories</span>
							</button>
							@for (c of store.clusters(); track c.id) {
								<button class="cf-option" [class.cf-active]="c.id === categoryFilter()" type="button"
									(click)="setCategoryFilter(c.id); catFilterOpen.set(false)">
									<span class="cf-dot" [style.background]="c.color"></span>
									<span>{{ c.label }}</span>
									@if (c.id === categoryFilter()) {
										<span class="cf-current">active</span>
									}
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
					<span class="toolbar-count">{{ visibleRows().length }} of {{ rows().length }} topics</span>
				</div>

				<!-- Filter panel -->
				@if (filterOpen()) {
					<div class="filter-panel">
						<div class="fp-head">Filter</div>
						@for (col of ['title', 'cluster', 'docCount', 'linkCount', 'sentiment']; track col) {
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
							<app-checkbox [checked]="allSelected()"
								[indeterminate]="selectedIds().size > 0 && !allSelected()"
								(toggle)="toggleSelectAll()" />
							<div class="th-cell th-label">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('title', $event)">
									@let si = sortIndicator('title');
									Topic
									<app-icon [name]="si.icon" [size]="17" [color]="si.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-cat">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('cluster', $event)">
									@let si2 = sortIndicator('cluster');
									Category
									<app-icon [name]="si2.icon" [size]="17" [color]="si2.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-num">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('docCount', $event)">
									@let si3 = sortIndicator('docCount');
									Sources
									<app-icon [name]="si3.icon" [size]="17" [color]="si3.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-num">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('linkCount', $event)">
									@let si4 = sortIndicator('linkCount');
									Links
									<app-icon [name]="si4.icon" [size]="17" [color]="si4.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<div class="th-cell th-num">
								<button class="th th-sort" type="button" (click)="toggleColumnSort('sentiment', $event)">
									@let si5 = sortIndicator('sentiment');
									Sentiment
									<app-icon [name]="si5.icon" [size]="17" [color]="si5.active ? '#FBBF24' : '#475569'" />
								</button>
							</div>
							<span class="th th-menu"></span>
						</div>

						@for (r of visibleRows(); track r.id) {
							@let on = selectedIds().has(r.id);
							<div class="tr" [class.sel]="on">
								<app-checkbox [checked]="on" (toggle)="toggleSelect(r.id)" />

								<!-- Topic label -->
								<div class="td td-main">
									<span class="dot" [style.background]="r.color" [style.boxShadow]="'0 0 7px ' + r.color + '90'"></span>
									@if (editingId() === r.id) {
										<input class="editor" type="text" [ngModel]="editingLabel()"
											(ngModelChange)="editingLabel.set($event)"
											(keydown.enter)="commitRename(r)" (keydown.escape)="cancelRename()"
											(blur)="commitRename(r)" autofocus />
									} @else {
										<span class="cat-label" (click)="startRename(r)" title="Click to rename">{{ r.title }}</span>
									}
								</div>

								<!-- Category badge -->
								<div class="td td-cat">
									<button class="cat-badge" type="button"
										[style.background]="r.color + '14'" [style.borderColor]="r.color + '33'"
										[style.color]="r.color" (click)="toggleCategoryPicker(r.id)">
										<span class="cat-dot" [style.background]="r.color" [style.boxShadow]="'0 0 5px ' + r.color + '90'"></span>
										{{ catLabel(r.cluster) }}
										<app-icon name="chevron-down" [size]="11" [color]="r.color" />
									</button>
									@if (categoryPickerId() === r.id) {
										<div class="cat-dropdown">
											@for (c of store.clusters(); track c.id) {
												<button class="cat-option" type="button"
													[class.active]="c.id === r.cluster" (click)="reassignOne(r, c.id)">
													<span class="dot-sm" [style.background]="c.color"></span>
													<span>{{ c.label }}</span>
												</button>
											}
										</div>
									}
								</div>

								<div class="td td-num">{{ fmtK(r.docCount) }}</div>
								<div class="td td-num">{{ r.linkCount }}</div>
								<div class="td td-num"
									[class.sent-neg]="isNeg(r.sentiment)" [class.sent-pos]="isPos(r.sentiment)">{{ fmtSentiment(r.sentiment) }}</div>
								<div class="td td-menu">
									<div class="menu-wrap">
										<button class="menu-trigger" type="button" (click)="toggleRowMenu(r.id)">
											<app-icon name="more-horizontal" [size]="15" />
										</button>
										<app-popover [open]="rowMenuId() === r.id" (close)="rowMenuId.set(null)"
											style="top: 32px; right: 0;"
											[style.width.px]="rowMenuReassign() === r.id ? 200 : 168"
											[style.padding.px]="rowMenuReassign() === r.id ? 0 : 6">
											@if (rowMenuReassign() === r.id) {
												<div class="menu-reassign-head">Reassign to</div>
												@for (c of store.clusters(); track c.id) {
													<button class="menu-reassign-item" type="button"
														(click)="reassignOne(r, c.id); rowMenuId.set(null); rowMenuReassign.set(null)">
														<span class="dot-sm" [style.background]="c.color"></span>
														<span>{{ c.label }}</span>
														@if (c.id === r.cluster) {
															<span class="cf-current">current</span>
														}
													</button>
												}
											} @else {
												<button class="menu-item" type="button" (click)="rowMenuReassign.set(r.id)">
													<app-icon name="circle-dot" [size]="14" color="#94a3b8" />
													<span>Reassign category</span>
													<app-icon name="chevron-right" [size]="13" color="#475569" />
												</button>
												<div class="menu-sep"></div>
												<button class="menu-item danger" type="button"
													(click)="onDeleteOne(r.id); rowMenuId.set(null)">
													<app-icon name="trash-2" [size]="14" color="#FB7185" />
													<span>Remove from graph</span>
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
									No topics yet. Add a source or create one manually.
								} @else {
									No topics match this filter.
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
							<span class="bulk-label">{{ selectedIds().size === 1 ? 'topic selected' : 'topics selected' }}</span>
						</div>
						<button class="btn-secondary" type="button" (click)="startBulkReassign()">Reassign</button>
						<button class="btn-secondary" type="button" [disabled]="selectedIds().size < 2"
							(click)="onBulkMerge()">Merge</button>
						<button class="btn-secondary" type="button" (click)="startNewCatFromSelection()">New Category</button>
						<button class="btn-danger" type="button" (click)="onBulkDelete()">Remove</button>
						<button class="btn-clear" type="button" (click)="clearSelection()">Clear</button>
					</div>
				}
			}

			@if (tab() === 'analytics') {
				@if (rows().length === 0) {
					<div class="empty">No topics to analyze.</div>
				} @else {
					<div class="analytics-scroll">
						<!-- Stat strip -->
						<div class="stat-strip">
							<app-stat-card [value]="'' + rows().length" label="Nodes" />
							<app-stat-card [value]="avgDegree().toFixed(1)" label="Avg connections" />
							<app-stat-card [value]="fmtK(avgDocs())" label="Avg docs / node" color="#22D3EE" />
							<app-stat-card [value]="fmtSentiment(avgSentiment())" label="Avg sentiment"
								[color]="avgSentiment() >= 0 ? '#34D399' : '#FB7185'" />
						</div>

						<!-- Charts grid -->
						<div class="charts-row">
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Category distribution</span>
									<span class="panel-meta">{{ categoryDistribution().length }} categories</span>
								</div>
								<app-hbar-list [rows]="categoryDistRows()" [emptyText]="'No topics yet'" />
							</div>
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Sentiment distribution</span>
									<span class="panel-meta">by node count</span>
								</div>
								<app-hbar-list [rows]="sentimentDistRows()" [emptyText]="'No sentiment data'" />
							</div>
						</div>

						<div class="charts-row">
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Most connected nodes</span>
									<span class="panel-meta">top 7</span>
								</div>
								<app-hbar-list [rows]="topByLinksRows()" [emptyText]="'No connections yet'" />
							</div>
							<div class="panel">
								<div class="panel-head">
									<span class="panel-title">Top nodes by documents</span>
									<span class="panel-meta">top 7</span>
								</div>
								<app-hbar-list [rows]="topByDocsRows()" [emptyText]="'No documents yet'" />
							</div>
						</div>
					</div>
				}
			}
		</div>

		<!-- ═══ Bulk-reassign modal ═══ -->
		<app-modal [open]="bulkReassignOpen()" [title]="'Reassign ' + selectedIds().size + ' topic(s)'"
			(close)="bulkReassignOpen.set(false)">
			<div class="dissolve-list">
				@for (c of store.clusters(); track c.id) {
					<button class="dissolve-option" type="button" (click)="commitBulkReassign(c.id)">
						<span class="dot-sm" [style.background]="c.color"></span>
						<span class="dissolve-label">{{ c.label }}</span>
					</button>
				}
			</div>
			<div footer>
				<button class="btn-ghost" type="button" (click)="bulkReassignOpen.set(false)">Cancel</button>
			</div>
		</app-modal>

		<!-- ═══ New Topic modal ═══ -->
		<app-modal [open]="creating()" title="New Topic" subtitle="Add a new node to the graph."
			(close)="cancelCreate()">
			<div class="field">
				<div class="field-label">Name</div>
				<input class="field-input" type="text" [ngModel]="newLabel()" (ngModelChange)="newLabel.set($event)"
					placeholder="e.g. Neural Networks" (keydown.enter)="commitCreate()" autofocus />
			</div>
			<div class="field">
				<div class="field-label">Category</div>
				<select class="field-input" [(ngModel)]="newClusterSlug">
					<option value="">Select a category…</option>
					@for (c of store.clusters(); track c.id) {
						<option [value]="c.id">{{ c.label }}</option>
					}
				</select>
			</div>
			<div class="field">
				<div class="field-label">Description (optional)</div>
				<input class="field-input" type="text" [ngModel]="newDesc()" (ngModelChange)="newDesc.set($event)"
					placeholder="Brief description of this topic" />
			</div>
			<div footer>
				<button class="btn-ghost" type="button" (click)="cancelCreate()">Cancel</button>
				<button class="btn-primary" type="button"
					[disabled]="!newLabel().trim() || !newClusterSlug().trim()"
					(click)="commitCreate()">Create</button>
			</div>
		</app-modal>

		<!-- ═══ New Category from Selection modal ═══ -->
		<app-modal [open]="newCatOpen()" title="New Category from Selection"
			subtitle="Create a new category and move {{ selectedIds().size }} selected topic(s) into it."
			(close)="newCatOpen.set(false)">
			<div class="field">
				<div class="field-label">Name</div>
				<input class="field-input" type="text" [ngModel]="newCatLabel()" (ngModelChange)="newCatLabel.set($event)"
					placeholder="e.g. Machine Learning" (keydown.enter)="commitNewCatFromSelection()" autofocus />
			</div>
			<div footer>
				<button class="btn-ghost" type="button" (click)="newCatOpen.set(false)">Cancel</button>
				<button class="btn-primary" type="button" [disabled]="!newCatLabel().trim()"
					(click)="commitNewCatFromSelection()">Create &amp; Move</button>
			</div>
		</app-modal>
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
			.tab-badge {
				display: inline-flex; align-items: center; justify-content: center;
				min-width: 18px; height: 18px; padding: 0 5px;
				border-radius: 0; background: rgba(255,255,255,0.07);
				font-size: 11px; font-weight: 600; color: #94a3b8;
				font-family: 'JetBrains Mono', monospace; line-height: 1;
			}

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
				display: flex; gap: 12px; align-items: center;
				padding: 0 32px 8px; flex-shrink: 0;
			}
			.toolbar-count { font-size: 12px; color: #475569; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

			/* ── category filter popover ── */
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
			.cf-option.cf-all { color: #f1f5f9; }
			.cf-active { background: rgba(251,191,36,0.08); }
			.cf-current { font-size: 10px; color: #fbbf24; margin-left: auto; }

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
			.th-label { flex: 1; min-width: 0; }
			.th-cat { width: 132px; }
			.th-num { width: 90px; text-align: right; }
			.th-menu { width: 40px; }

			/* sortable headers */
			.th-cell {
				display: flex; align-items: center; gap: 12px;
			}
			.th-cell.th-label { flex: 1; min-width: 0; }
			.th-cell.th-cat { width: 132px; }
			.th-cell.th-num { width: 90px; justify-content: flex-end; }
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
			.td-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; }
			.td-cat { width: 132px; position: relative; }
			.td-num {
				width: 90px; justify-content: flex-end;
				font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #94a3b8;
			}
			.td-menu { width: 40px; justify-content: flex-end; }

			.cat-label {
				font-size: 13.5px; font-weight: 500; color: #f1f5f9;
				cursor: text; border-radius: 0; padding: 2px 5px; margin: -2px -5px;
				transition: background 120ms ease-out;
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.cat-label:hover { background: rgba(255,255,255,0.04); }
			.editor {
				background: #0b1120; border: 1px solid rgba(251,191,36,0.35);
				color: #f1f5f9; border-radius: 0;
				padding: 5px 9px; font-size: 13.5px; font-family: inherit;
				outline: none; width: 100%; max-width: 280px; letter-spacing: -0.01em;
			}

			.dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
			.dot-sm { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

			/* ── category badge ── */
			.cat-badge {
				display: inline-flex; align-items: center; gap: 6px;
				padding: 3px 8px 3px 9px; border-radius: 0; cursor: pointer;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 11.5px; font-weight: 500; border: 1px solid;
				white-space: nowrap;
			}
			.cat-badge:hover { opacity: 0.85; }
			.cat-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
			.cat-dropdown {
				position: absolute; top: 100%; left: 0; z-index: 10;
				background: #0f1828; border: 1px solid rgba(255,255,255,0.09);
				border-radius: 0; padding: 4px; min-width: 140px;
				display: flex; flex-direction: column; gap: 2px;
			}
			.cat-option {
				display: flex; align-items: center; gap: 8px;
				padding: 6px 10px; background: transparent; border: none;
				border-radius: 0; cursor: pointer; color: #94a3b8;
				font-family: inherit; font-size: 12px; text-align: left;
			}
			.cat-option:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; }
			.cat-option.active { color: #fbbf24; }

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
			.menu-sep { height: 1px; background: rgba(255,255,255,0.05); margin: 5px 4px; }
			.menu-reassign-head {
				padding: 4px 8px 7px; font-size: 10px; font-weight: 600;
				letter-spacing: 0.06em; text-transform: uppercase;
				color: #2a3d66;
			}
			.menu-reassign-item {
				display: flex; align-items: center; gap: 9px;
				width: 100%; padding: 7px 8px; border-radius: 0;
				background: transparent; border: none; cursor: pointer;
				font-family: inherit; font-size: 12.5px; color: #f1f5f9;
				text-align: left;
			}
			.menu-reassign-item:hover { background: rgba(255,255,255,0.04); }

			.sent-neg { color: #FB7185; }
			.sent-pos { color: #34d399; }

			/* ── bulk bar ── */
			.bulk-bar {
				position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 50;
				display: flex; align-items: center; gap: 8px;
				padding: 9px 11px; border-radius: 0;
				background: rgba(15,24,40,0.97);
				border: 1px solid rgba(251,191,36,0.35);
				box-shadow: 0 10px 36px rgba(0,0,0,0.55);
				backdrop-filter: blur(8px);
				animation: tnPop 160ms ease-out;
			}
			.bulk-left { display: flex; align-items: center; gap: 8px; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.09); }
			.bulk-badge {
				min-width: 22px; height: 22px; padding: 0 6px; border-radius: 0;
				background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.35);
				display: flex; align-items: center; justify-content: center;
				font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #fbbf24;
			}
			.bulk-label { font-size: 12.5px; color: #f1f5f9; }

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
			.btn-ghost {
				display: flex; align-items: center; gap: 6px;
				padding: 8px 14px; background: transparent;
				border: 1px solid rgba(255,255,255,0.09);
				color: #94a3b8; border-radius: 0; font-size: 13px;
				font-family: inherit; font-weight: 500; cursor: pointer; flex-shrink: 0; text-decoration: none;
			}
			.btn-ghost:hover { color: #f1f5f9; border-color: rgba(255,255,255,0.18); }
			.btn-secondary {
				display: flex; align-items: center; gap: 6px;
				padding: 7px 12px; background: transparent;
				border: 1px solid rgba(255,255,255,0.09);
				color: #f1f5f9; border-radius: 0; font-size: 12px;
				font-family: inherit; font-weight: 500; cursor: pointer;
			}
			.btn-secondary:hover:not(:disabled) { border-color: rgba(251,191,36,0.35); }
			.btn-secondary:disabled { opacity: 0.4; cursor: default; }
			.btn-clear {
				margin-left: 2px; padding: 6px 9px; border-radius: 0;
				background: transparent; border: none; cursor: pointer;
				color: #475569; font-family: inherit; font-size: 11.5px;
			}
			.btn-danger {
				padding: 7px 14px; background: #fb7185; color: #06090f;
				border: none; border-radius: 0; font-size: 12px;
				font-family: inherit; font-weight: 600; cursor: pointer;
			}
			.btn-danger:hover { background: #f87171; }

			/* ── modal fields ── */
			.field { margin-bottom: 14px; }
			.field-label {
				font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
				text-transform: uppercase; color: #2a3d66; margin-bottom: 8px; display: block;
			}
			.field-input {
				width: 100%; font: 500 14px 'Space Grotesk', system-ui, sans-serif;
				color: #f1f5f9; background: #0f1828;
				border: 1px solid rgba(255,255,255,0.09); border-radius: 0;
				padding: 9px 12px; outline: none; letter-spacing: -0.01em;
			}
			.field-input:focus { border-color: rgba(251,191,36,0.35); }
			select.field-input { appearance: none; cursor: pointer; }

			.dissolve-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
			.dissolve-option {
				display: flex; align-items: center; gap: 10px;
				padding: 10px 12px; background: #0b1120;
				border: 1px solid rgba(255,255,255,0.05);
				border-radius: 0; cursor: pointer; color: inherit;
				font-family: inherit; font-size: 13px; text-align: left;
			}
			.dissolve-option:hover { border-color: rgba(251,191,36,0.3); }
			.dissolve-label { flex: 1; color: #f1f5f9; }

			.empty { font-size: 13px; color: #475569; padding: 32px; text-align: center; }

			@keyframes tnPop {
				from { opacity: 0; transform: scale(0.94); }
				to { opacity: 1; transform: scale(1); }
			}
		`,
	],
})
export class TopicsScreenComponent {
	protected readonly store = inject(AppStore);

	// ── tabs ──
	protected readonly tab = signal<string>('records');
	protected readonly topicsTabs = computed(() => [
		{ id: 'records', label: 'Topics', icon: 'list', badge: this.rows().length },
		{ id: 'analytics', label: 'Analytics', icon: 'bar-chart-3' },
	]);

	// ── filters ──
	protected readonly searchFilter = signal('');
	protected readonly categoryFilter = signal('');
	protected readonly catFilterOpen = signal(false);

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
		const labels: Record<string, string> = { title: 'Topic', cluster: 'Category', docCount: 'Sources', linkCount: 'Links', sentiment: 'Sentiment' };
		return labels[column] ?? column;
	}

	// ── selection ──
	protected readonly selectedIds = signal<Set<string>>(new Set());

	// ── inline rename ──
	protected readonly editingId = signal<string | null>(null);
	protected readonly editingLabel = signal('');

	// ── category picker ──
	protected readonly categoryPickerId = signal<string | null>(null);

	// ── row menu ──
	protected readonly rowMenuId = signal<string | null>(null);
	protected readonly rowMenuReassign = signal<string | null>(null);

	// ── bulk reassign ──
	protected readonly bulkReassignOpen = signal(false);

	// ── create topic ──
	protected readonly creating = signal(false);
	protected readonly newLabel = signal('');
	protected readonly newClusterSlug = signal('');
	protected readonly newDesc = signal('');

	// ── new category from selection ──
	protected readonly newCatOpen = signal(false);
	protected readonly newCatLabel = signal('');

	// ── Escape clears selection ──
	@HostListener('document:keydown.escape')
	protected clearSelection(): void { this.selectedIds.set(new Set()); }

	// ── rows ──

	protected readonly rows = computed<TopicRow[]>(() => {
		const store = this.store;
		const clusterMap = new Map(store.clusters().map((c) => [c.id, c]));
		const docCounts = store.nodeDocCount();
		const linkCounts = store.nodeLinkCount();

		return store.nodes().map((n) => {
			const cluster = clusterMap.get(n.cluster);
			return {
				id: n.id,
				title: n.label,
				cluster: n.cluster,
				color: cluster?.color ?? '#475569',
				docCount: docCounts.get(n.id) ?? 0,
				linkCount: linkCounts.get(n.id) ?? 0,
				sentiment: n.sentiment ?? null,
				node: n,
			};
		});
	});

	protected readonly visibleRows = computed(() => {
		const search = this.searchFilter().trim().toLowerCase();
		const cat = this.categoryFilter().trim();
		let filtered = this.rows();
		if (search) {
			filtered = filtered.filter(
				(r) =>
					r.title.toLowerCase().includes(search) ||
					r.id.toLowerCase().includes(search),
			);
		}
		if (cat) {
			filtered = filtered.filter((r) => r.cluster === cat);
		}
		const colAcc = {
			title: (r: TopicRow) => r.title,
			cluster: (r: TopicRow) => r.cluster,
			docCount: (r: TopicRow) => r.docCount,
			linkCount: (r: TopicRow) => r.linkCount,
			sentiment: (r: TopicRow) => r.sentiment,
		};
		filtered = applyColumnFilters(filtered, this.columnFilters(), colAcc);
		return applySorts(filtered, this.sortBy(), colAcc);
	});

	// ── selection helpers ──

	protected readonly allSelected = computed(() => {
		const v = this.visibleRows();
		const s = this.selectedIds();
		return v.length > 0 && v.every((r) => s.has(r.id));
	});

	protected toggleSelect(id: string): void {
		this.selectedIds.update((s) => {
			const next = new Set(s);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	protected toggleSelectAll(): void {
		const v = this.visibleRows();
		if (this.allSelected()) {
			this.selectedIds.set(new Set());
		} else {
			this.selectedIds.set(new Set(v.map((r) => r.id)));
		}
	}

	// ── category helpers ──

	protected catLabel(slug: string): string {
		return this.store.clusters().find((c) => c.id === slug)?.label ?? slug;
	}

	protected catFilterLabel(): string {
		const cat = this.categoryFilter();
		return cat ? this.catLabel(cat) : 'All categories';
	}

	protected catFilterColor(): string {
		const cat = this.categoryFilter();
		return cat ? (this.store.clusters().find((c) => c.id === cat)?.color ?? '#475569') : '#475569';
	}

	protected setCategoryFilter(slug: string): void {
		this.categoryFilter.set(slug);
	}

	protected toggleCategoryPicker(id: string): void {
		this.categoryPickerId.update((cur) => (cur === id ? null : id));
	}

	protected toggleRowMenu(id: string): void {
		this.rowMenuId.update((cur) => (cur === id ? null : id));
		// Reset reassign submenu when opening a new row menu
		if (this.rowMenuId() === id) {
			this.rowMenuReassign.set(null);
		}
	}

	protected readonly fmtK = formatCount;

	protected async reassignOne(r: TopicRow, newCluster: string): Promise<void> {
		if (newCluster === r.cluster) { this.categoryPickerId.set(null); return; }
		await this.store.reassignNode(r.id, r.title, newCluster);
		this.categoryPickerId.set(null);
	}

	// ── inline rename ──

	protected startRename(r: TopicRow): void {
		this.editingId.set(r.id);
		this.editingLabel.set(r.title);
	}

	protected cancelRename(): void {
		this.editingId.set(null);
		this.editingLabel.set('');
	}

	protected async commitRename(r: TopicRow): Promise<void> {
		const label = this.editingLabel().trim();
		if (!label || label === r.title) { this.cancelRename(); return; }
		await this.store.renameNode(r.id, label);
		this.cancelRename();
	}

	// ── single delete ──

	protected async onDeleteOne(id: string): Promise<void> {
		const node = this.rows().find((r) => r.id === id);
		if (!confirm(`Delete topic "${node?.title ?? id}"? This will also drop all its connections.`)) return;
		await this.store.deleteNode(id);
		this.selectedIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
	}

	// ── bulk actions ──

	protected async onBulkMerge(): Promise<void> {
		const slugs = [...this.selectedIds()];
		if (slugs.length < 2) return;
		const targetSlug = slugs[0];
		const sourceSlugs = slugs.slice(1);
		const targetNode = this.rows().find((r) => r.id === targetSlug);
		if (!confirm(`Merge ${sourceSlugs.length} topic(s) into "${targetNode?.title ?? targetSlug}"?`)) return;
		await this.store.mergeNodes(targetSlug, sourceSlugs);
		this.selectedIds.set(new Set());
	}

	protected startBulkReassign(): void {
		this.bulkReassignOpen.set(true);
	}

	protected async commitBulkReassign(clusterSlug: string): Promise<void> {
		const slugs = [...this.selectedIds()];
		await this.store.bulkReassignNodes(slugs, clusterSlug);
		this.bulkReassignOpen.set(false);
		this.selectedIds.set(new Set());
	}

	protected async onBulkDelete(): Promise<void> {
		const slugs = [...this.selectedIds()];
		if (!confirm(`Delete ${slugs.length} topic(s)? These will also be removed from the graph.`)) return;
		await this.store.bulkDeleteNodes(slugs);
		this.selectedIds.set(new Set());
	}

	protected async startNewCatFromSelection(): Promise<void> {
		this.newCatLabel.set('');
		this.newCatOpen.set(true);
	}

	protected async commitNewCatFromSelection(): Promise<void> {
		const label = this.newCatLabel().trim();
		if (!label) return;
		// Create the category, then reassign selected nodes into it.
		await this.store.createCluster(label);
		// The new cluster's slug is derived from the label.
		const slug = label.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
		const slugs = [...this.selectedIds()];
		await this.store.bulkReassignNodes(slugs, slug);
		this.newCatOpen.set(false);
		this.selectedIds.set(new Set());
	}

	// ── create topic ──

	protected openCreateModal(): void {
		this.newLabel.set('');
		this.newClusterSlug.set('');
		this.newDesc.set('');
		this.creating.set(true);
	}

	protected cancelCreate(): void {
		this.creating.set(false);
	}

	protected async commitCreate(): Promise<void> {
		const label = this.newLabel().trim();
		const cluster = this.newClusterSlug().trim();
		if (!label || !cluster) return;
		const desc = this.newDesc().trim() || undefined;
		await this.store.createNode(label, cluster, desc);
		this.creating.set(false);
	}

	// ── sentiment helpers ──

	protected fmtSentiment(v: number | null): string {
		if (v == null) return '—';
		return (v > 0 ? '+' : '') + v.toFixed(2);
	}

	protected isNeg(v: number | null): boolean {
		return v != null && v < 0;
	}

	protected isPos(v: number | null): boolean {
		return v != null && v > 0;
	}

	// ── analytics ──

	protected readonly avgDegree = computed(() => {
		const rows = this.rows();
		if (rows.length === 0) return 0;
		return rows.reduce((s, r) => s + r.linkCount, 0) / rows.length;
	});

	protected readonly avgDocs = computed(() => {
		const rows = this.rows();
		if (rows.length === 0) return 0;
		return rows.reduce((s, r) => s + r.docCount, 0) / rows.length;
	});

	protected readonly avgSentiment = computed(() => {
		const rows = this.rows().filter((r) => r.sentiment != null);
		if (rows.length === 0) return 0;
		return rows.reduce((s, r) => s + r.sentiment!, 0) / rows.length;
	});

	protected readonly categoryDistribution = computed(() => {
		const rows = this.rows();
		const map = new Map<string, { id: string; label: string; color: string; count: number }>();
		for (const r of rows) {
			const entry = map.get(r.cluster) ?? {
				id: r.cluster,
				label: this.catLabel(r.cluster),
				color: r.color,
				count: 0,
			};
			entry.count += 1;
			map.set(r.cluster, entry);
		}
		const arr = [...map.values()].sort((a, b) => b.count - a.count);
		const max = Math.max(1, ...arr.map((d) => d.count));
		return arr.map((d) => ({ ...d, pct: (d.count / max) * 100 }));
	});

	protected readonly sentimentBands = computed(() => {
		const rows = this.rows().filter((r) => r.sentiment != null);
		const bands = [
			{ label: 'Negative', min: -Infinity, max: -0.3, color: '#f87171', count: 0 },
			{ label: 'Slightly Neg', min: -0.3, max: -0.05, color: '#fca5a5', count: 0 },
			{ label: 'Neutral', min: -0.05, max: 0.05, color: '#94a3b8', count: 0 },
			{ label: 'Slightly Pos', min: 0.05, max: 0.3, color: '#86efac', count: 0 },
			{ label: 'Positive', min: 0.3, max: Infinity, color: '#34d399', count: 0 },
		];
		for (const r of rows) {
			for (const b of bands) {
				if (r.sentiment! >= b.min && r.sentiment! < b.max) { b.count += 1; break; }
			}
		}
		const max = Math.max(1, ...bands.map((b) => b.count));
		return bands.map((b) => ({ ...b, pct: (b.count / max) * 100 }));
	});

	protected readonly topByLinks = computed(() => {
		const rows = [...this.rows()].sort((a, b) => b.linkCount - a.linkCount).slice(0, 7);
		const max = Math.max(1, ...rows.map((r) => r.linkCount));
		return rows.map((r) => ({ ...r, linkPct: (r.linkCount / max) * 100 }));
	});

	protected readonly topByDocs = computed(() => {
		const rows = [...this.rows()].sort((a, b) => b.docCount - a.docCount).slice(0, 7);
		const max = Math.max(1, ...rows.map((r) => r.docCount));
		return rows.map((r) => ({ ...r, docPct: (r.docCount / max) * 100 }));
	});

	// ── chart data for shared components ──

	protected readonly categoryDistRows = computed<readonly HBarRow[]>(() =>
		this.categoryDistribution().map((d) => ({ label: d.label, value: d.count, color: d.color })),
	);

	protected readonly sentimentDistRows = computed<readonly HBarRow[]>(() =>
		this.sentimentBands().map((b) => ({ label: b.label, value: b.count, color: b.color })),
	);

	protected readonly topByLinksRows = computed<readonly HBarRow[]>(() =>
		this.topByLinks().map((t) => ({ label: t.title, value: t.linkCount, color: t.color })),
	);

	protected readonly topByDocsRows = computed<readonly HBarRow[]>(() =>
		this.topByDocs().map((t) => ({ label: t.title, value: t.docCount, color: t.color })),
	);
}
