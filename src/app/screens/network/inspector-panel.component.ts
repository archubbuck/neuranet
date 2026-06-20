import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '../../data/app.store';
import { ApiService } from '../../data/api.service';
import { C } from '../../ui/tokens';
import { IconComponent } from '../../ui/primitives/icon.component';
import { ChatMessageComponent } from '../../ui/primitives/chat-message.component';
import type { ChatMessageShape } from '../../ui/primitives/chat-message.component';
import type { AiAction, NodeDetail } from '../../data/types';

interface MetricCell {
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

/**
 * Right-side slide-in inspector panel. Opens when a node is selected.
 *
 * Sections:
 *   1. Header — node name, cluster badge, expand/close
 *   2. Community Report — from node's JSONB metadata (if present)
 *   3. Metrics grid — connections, importance, depth, sentiment
 *   4. AI Actions — Summarize, Explain, Best Practices
 *   5. Connected Nodes — clickable list
 *   6. Chat Panel — context-bounded AI chat (collapsible)
 */
@Component({
  selector: 'app-inspector-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ChatMessageComponent],
  template: `
    <aside
      class="absolute top-0 right-0 h-full w-[380px] max-w-full z-30 bg-bg-surface border-l border-border-def shadow-[-12px_0_40px_rgba(0,0,0,0.4)] flex flex-col translate-x-[110%] transition-transform duration-300 ease-out font-display text-fg-2"
      [class.translate-x-0]="open()"
    >
      @if (node(); as n) {
        <!-- Header -->
        <header class="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-border-subtle">
          <span
            class="inline-flex items-center gap-[5px] px-2 py-0.5 text-[11px] font-medium"
            [style.--accent]="clusterColor()"
            [style.background]="'color-mix(in srgb, var(--accent, #fbbf24) 8%, transparent)'"
            [style.borderColor]="'color-mix(in srgb, var(--accent, #fbbf24) 16%, transparent)'"
            [style.border]="'1px solid'"
            [style.color]="'var(--accent, #fbbf24)'"
          >
            <span
              class="w-[5px] h-[5px] rounded-full"
              [style.background]="'var(--accent, #fbbf24)'"
            ></span>
            <span>{{ clusterLabel() }}</span>
          </span>
          <div class="flex-1"></div>
          <button
            type="button"
            class="w-7 h-7 bg-transparent border-none text-fg-2 inline-flex items-center justify-center cursor-pointer hover:bg-bg-hover hover:text-fg-1"
            (click)="store.setDetailView('closed')"
            title="Close"
          >
            <app-icon name="x" [size]="15" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto">
          <!-- Node identity -->
          <div class="px-4 pt-4 pb-2">
            <div class="flex items-center gap-3 mb-2">
              <div
                class="w-10 h-10 rounded-full shrink-0 relative"
                [style.--accent]="clusterColor()"
                [style.background]="'radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--accent) 80%, transparent), color-mix(in srgb, var(--accent) 53%, transparent))'"
                [style.boxShadow]="'0 0 20px color-mix(in srgb, var(--accent) 31%, transparent), 0 0 48px color-mix(in srgb, var(--accent) 10%, transparent)'"
              >
                <div class="absolute top-2 left-[9px] w-3.5 h-3.5 rounded-full bg-white/25"></div>
              </div>
              <h2 class="text-[19px] font-bold text-fg-1 tracking-tight leading-[1.15] m-0">
                {{ n.label }}
              </h2>
            </div>
            @if (n.desc) {
              <p class="text-xs text-fg-3 leading-relaxed mt-0 mb-0">{{ n.desc }}</p>
            }
          </div>

          <!-- Community Report -->
          @if (communityReport(); as report) {
            <div
              class="px-4 py-3 mx-4 mb-3 bg-[color-mix(in_srgb,var(--accent,#fbbf24)_4%,transparent)] border border-[color-mix(in_srgb,var(--accent,#fbbf24)_10%,transparent)]"
              [style.--accent]="clusterColor()"
            >
              <div class="text-[10px] font-semibold text-fg-2 uppercase tracking-wide mb-1.5">
                Community Report
              </div>
              <p class="text-xs text-fg-2 leading-relaxed m-0">{{ report }}</p>
            </div>
          }

          <!-- Metrics -->
          <div class="grid grid-cols-2 gap-2 px-4 mb-4">
            @for (m of metrics(); track m.label) {
              <div class="bg-bg-elevated border border-border-subtle px-3 py-2.5">
                <div
                  class="font-mono text-base font-semibold tracking-tight mb-[3px]"
                  [style.color]="m.color"
                >
                  {{ m.value }}
                </div>
                <div class="text-[10px] text-[#2a3d66] tracking-wide">{{ m.label }}</div>
              </div>
            }
          </div>

          <!-- AI Actions -->
          <div class="px-4 mb-4">
            <div class="text-[10px] font-semibold text-fg-2 uppercase tracking-wide mb-2">
              AI Actions
            </div>
            <div class="flex flex-wrap gap-2">
              @for (action of aiActions; track action) {
                <button
                  type="button"
                  class="px-3 py-1.5 text-[12px] font-medium bg-bg-elevated border border-border-subtle text-fg-2 cursor-pointer hover:bg-bg-hover hover:text-fg-1 hover:border-border-def transition-all duration-150"
                  [class.opacity-50]="aiLoading() === action"
                  [disabled]="aiLoading() != null"
                  (click)="runAiAction(action)"
                >
                  {{ actionLabel(action) }}
                  @if (aiLoading() === action) {
                    <span class="inline-block ml-1.5 animate-spin">⟳</span>
                  }
                </button>
              }
            </div>
            @if (aiResult(); as result) {
              <div
                class="mt-3 p-3 bg-bg-elevated border border-border-subtle text-xs text-fg-2 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap"
              >
                {{ result }}
              </div>
            }
          </div>

          <!-- Connected Nodes -->
          @if (connected().length > 0) {
            <div class="px-4 mb-4">
              <div class="text-[10px] font-semibold text-fg-2 uppercase tracking-wide mb-2">
                Connected ({{ connected().length }})
              </div>
              <div class="flex flex-col gap-1">
                @for (c of connected(); track c.id) {
                  <button
                    type="button"
                    class="flex items-center gap-2 px-2 py-1.5 bg-bg-elevated border border-border-subtle text-inherit cursor-pointer text-left transition-all duration-150 hover:border-border-def"
                    [style.--accent]="c.color"
                    (click)="store.selectNode(c.id)"
                  >
                    <span class="w-2 h-2 rounded-full shrink-0" [style.background]="c.color"></span>
                    <span class="flex-1 text-xs text-fg-1 truncate">{{ c.label }}</span>
                    <span class="text-[11px] font-mono text-fg-3">{{ c.degree }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Chat Panel -->
        <div class="border-t border-border-subtle shrink-0">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-4 py-2.5 bg-transparent border-none text-fg-2 text-xs font-semibold cursor-pointer hover:bg-bg-hover"
            (click)="chatOpen.set(!chatOpen())"
          >
            <app-icon [name]="chatOpen() ? 'chevron-down' : 'chevron-right'" [size]="12" />
            <span>Ask about "{{ n.label }}"</span>
          </button>

          @if (chatOpen()) {
            <div class="h-[240px] flex flex-col">
              <div class="flex-1 overflow-y-auto px-4 py-2" #chatScroll>
                @for (msg of chatMessages(); track $index) {
                  <app-chat-message
                    [message]="msg"
                    [isStreaming]="
                      chatStreaming() &&
                      $index === chatMessages().length - 1 &&
                      msg.role === 'assistant'
                    "
                  />
                }
                @if (chatMessages().length === 0) {
                  <p class="text-xs text-fg-3 text-center mt-8">
                    Ask a question about this topic and its connections.
                  </p>
                }
              </div>
              <div class="flex gap-1.5 px-3 py-2 border-t border-border-subtle">
                <input
                  type="text"
                  class="flex-1 bg-bg-elevated border border-border-subtle text-fg-1 text-xs px-3 py-1.5 outline-none [&:focus]:border-border-def"
                  placeholder="Type a question..."
                  [value]="chatInput()"
                  (input)="chatInput.set($any($event.target).value)"
                  (keydown.enter)="sendChat()"
                  [disabled]="chatStreaming()"
                />
                <button
                  type="button"
                  class="px-3 py-1.5 bg-amber text-[#1a1208] text-xs font-semibold border-none cursor-pointer hover:opacity-90 disabled:opacity-40"
                  [disabled]="chatStreaming() || !chatInput().trim()"
                  (click)="sendChat()"
                >
                  Send
                </button>
              </div>
            </div>
          }
        </div>
      }
    </aside>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class InspectorPanelComponent {
  protected readonly store = inject(AppStore);
  private readonly api = inject(ApiService);

  protected readonly node = this.store.selectedNode;

  protected readonly open = computed(
    () => this.store.detailView() === 'slide' && this.store.selectedNode() != null,
  );

  // ── Chat state ──────────────────────────────────────────────────────

  protected readonly chatOpen = signal(false);
  protected readonly chatInput = signal('');
  protected readonly chatMessages = signal<ChatMessageShape[]>([]);
  protected readonly chatStreaming = signal(false);

  // ── AI action state ─────────────────────────────────────────────────

  protected readonly aiLoading = signal<AiAction | null>(null);
  protected readonly aiResult = signal<string | null>(null);

  protected readonly aiActions: AiAction[] = ['summarize', 'explain', 'best_practices'];

  // ── Node detail ─────────────────────────────────────────────────────

  protected readonly nodeDetail = signal<NodeDetail | null>(null);

  // ── Cluster helpers ─────────────────────────────────────────────────

  private readonly clusterMap = computed(() => {
    const m = new Map<string, { label: string; color: string }>();
    for (const c of this.store.clusters()) m.set(c.id, { label: c.label, color: c.color });
    return m;
  });

  protected clusterColor(): string {
    const n = this.node();
    if (!n) return C.fg3;
    return this.clusterMap().get(n.cluster)?.color ?? C.fg3;
  }

  protected clusterLabel(): string {
    const n = this.node();
    if (!n) return '';
    return this.clusterMap().get(n.cluster)?.label ?? n.cluster;
  }

  // ── Community report from metadata ──────────────────────────────────

  protected communityReport = computed(() => {
    const detail = this.nodeDetail();
    if (!detail?.metadata) return null;
    const report = detail.metadata['communityReport'];
    if (typeof report === 'string') return report;
    if (typeof report === 'object' && report != null) {
      return (
        ((report as Record<string, unknown>)['summary'] as string) ??
        JSON.stringify(report).slice(0, 500)
      );
    }
    return null;
  });

  // ── Metrics ─────────────────────────────────────────────────────────

  protected metrics = computed<readonly MetricCell[]>(() => {
    const n = this.node();
    const d = this.nodeDetail();
    if (!n) return [];
    const cells: MetricCell[] = [
      { label: 'Connections', value: String(d?.degree ?? n.degree), color: C.amber },
      { label: 'Importance', value: String(n.importance), color: this.clusterColor() },
      { label: 'Depth', value: String(n.depth), color: C.fg2 },
    ];
    if (typeof n.sentiment === 'number') {
      const s = n.sentiment;
      cells.push({
        label: 'Sentiment',
        value: (s >= 0 ? '+' : '−') + Math.abs(s).toFixed(2),
        color: s >= 0 ? C.emerald : C.rose,
      });
    }
    if (d?.docCount != null) {
      cells.push({ label: 'Documents', value: String(d.docCount), color: C.fg2 });
    }
    return cells;
  });

  // ── Connected nodes ─────────────────────────────────────────────────

  protected connected = computed(() => {
    const n = this.node();
    if (!n) return [];
    const ids = new Map<string, number>();
    for (const e of this.store.edges()) {
      if (e.source === n.id) ids.set(e.target, (ids.get(e.target) ?? 0) + 1);
      if (e.target === n.id) ids.set(e.source, (ids.get(e.source) ?? 0) + 1);
    }
    const colors = this.clusterMap();
    return this.store
      .nodes()
      .filter((node) => ids.has(node.id))
      .slice(0, 15)
      .map((node) => ({
        id: node.id,
        label: node.label,
        color: colors.get(node.cluster)?.color ?? C.fg3,
        degree: ids.get(node.id) ?? 1,
      }));
  });

  // ── Select node → load detail ───────────────────────────────────────

  constructor() {
    // When selected node changes, load detail
    let lastSlug: string | null = null;
    // Use polling approach — simple and effective
    setInterval(() => {
      const n = this.store.selectedNode();
      if (n && n.id !== lastSlug) {
        lastSlug = n.id;
        this.aiResult.set(null);
        this.chatMessages.set([]);
        this.chatOpen.set(false);
        this.api
          .getNodeDetail(n.id)
          .then((d) => this.nodeDetail.set(d))
          .catch(() => undefined);
      }
      if (!n) lastSlug = null;
    }, 200);
  }

  // ── AI Actions ──────────────────────────────────────────────────────

  protected actionLabel(action: AiAction): string {
    const labels: Record<AiAction, string> = {
      summarize: 'Summarize',
      explain: 'Explain',
      best_practices: 'Best Practices',
      compare: 'Compare',
    };
    return labels[action];
  }

  protected async runAiAction(action: AiAction): Promise<void> {
    const n = this.node();
    if (!n) return;
    this.aiLoading.set(action);
    this.aiResult.set(null);
    try {
      const resp = await this.api.aiAction({ nodeSlug: n.id, action });
      this.aiResult.set(resp.result);
    } catch {
      this.aiResult.set('AI action failed. Please try again.');
    } finally {
      this.aiLoading.set(null);
    }
  }

  // ── Chat ────────────────────────────────────────────────────────────

  protected async sendChat(): Promise<void> {
    const n = this.node();
    const input = this.chatInput().trim();
    if (!n || !input || this.chatStreaming()) return;

    this.chatInput.set('');
    const userMsg: ChatMessageShape = { role: 'user', content: input };
    this.chatMessages.update((msgs) => [...msgs, userMsg]);

    const assistantMsg: ChatMessageShape = { role: 'assistant', content: '' };
    this.chatMessages.update((msgs) => [...msgs, assistantMsg]);
    this.chatStreaming.set(true);

    try {
      const stream = await this.api.aiChat(
        n.id,
        this.chatMessages()
          .filter((m) => m.content.length > 0)
          .slice(0, -1), // exclude empty assistant placeholder
      );

      if (!stream) {
        this.chatMessages.update((msgs) => {
          const copy = [...msgs];
          copy[copy.length - 1] = { role: 'assistant', content: 'AI is not available right now.' };
          return copy;
        });
        this.chatStreaming.set(false);
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const text = decoder.decode(value, { stream: !done });
          this.chatMessages.update((msgs) => {
            const copy = [...msgs];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + text };
            return copy;
          });
        }
      }
    } catch {
      this.chatMessages.update((msgs) => {
        const copy = [...msgs];
        copy[copy.length - 1] = { role: 'assistant', content: 'Chat error. Please try again.' };
        return copy;
      });
    } finally {
      this.chatStreaming.set(false);
    }
  }
}
