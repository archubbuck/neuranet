import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	signal,
} from '@angular/core';
import { Router } from '@angular/router';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface LNode {
	id: number;
	x: number;
	y: number;
	opacity: number;
	radius: number;
	filled: boolean;
}

interface LConnection {
	sourceIdx: number;
	targetIdx: number;
}

interface ShrinkState {
	x1: number; y1: number;
	x2: number; y2: number;
	opacity: number;
}

type Phase = 'idle' | 'travel';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const VIEW_W = 800;
const VIEW_H = 600;
const NODE_R = 22;
const MIN_NODE_DIST = NODE_R * 3;
const TRAVEL_SPEED = 0.012;
const FADE_SPEED = 0.006;
const LINE_SHRINK_SPEED = 0.008;
const LINE_COLOR = '#60A5FA';
const NODE_COLOR = '#FBBF24';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

@Component({
	selector: 'app-landing-screen',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [],
	template: `
		<div class="landing-wrap">
			<svg #svgEl viewBox="0 0 800 600" class="canvas" (click)="onSvgClick()">

				<!-- frozen connections -->
				@for (conn of frozenConns(); track $index) {
					<line
						[attr.x1]="nodes()[conn.sourceIdx].x"
						[attr.y1]="nodes()[conn.sourceIdx].y"
						[attr.x2]="nodes()[conn.targetIdx].x"
						[attr.y2]="nodes()[conn.targetIdx].y"
						[attr.stroke]="LINE_COLOR"
						stroke-width="2"
						[style.opacity]="getLineOpacity(conn)"
					/>
				}

				<!-- shrinking line -->
				@if (shrinkSt(); as sl) {
					<line
						[attr.x1]="sl.x1"
						[attr.y1]="sl.y1"
						[attr.x2]="sl.x2"
						[attr.y2]="sl.y2"
						[attr.stroke]="LINE_COLOR"
						stroke-width="2"
						stroke-linecap="round"
						[style.opacity]="sl.opacity"
					/>
				}

				<!-- travel line -->
				@if (phase() === 'travel' && activeTargetIdx() !== null) {
					<line
						[attr.x1]="travelLn().x1"
						[attr.y1]="travelLn().y1"
						[attr.x2]="travelLn().x2"
						[attr.y2]="travelLn().y2"
						[attr.stroke]="LINE_COLOR"
						stroke-width="2"
						stroke-linecap="round"
					/>
				}

				<!-- nodes -->
				@for (n of nodes(); track n.id) {
					<circle
						[attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.radius"
						[attr.fill]="n.filled ? NODE_COLOR : 'none'"
						[attr.stroke]="NODE_COLOR"
						stroke-width="2.5"
						[style.opacity]="n.opacity"
						style="transition: opacity 0.3s, fill 0.4s"
					/>
				}
			</svg>

			@if (phase() === 'idle') {
				<button class="enter-btn" (click)="startAnimation()">Enter</button>
			}

		</div>
	`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				min-height: 0;
				background: #090e1c;
				position: relative;
			}
			.landing-wrap {
				position: relative;
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				overflow: hidden;
			}
			.canvas {
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				cursor: pointer;
			}
			.enter-btn {
				position: relative;
				z-index: 10;
				padding: 14px 48px;
				font-size: 18px;
				font-weight: 600;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				color: #0b1120;
				background: #FBBF24;
				border: none;
				border-radius: 0;
				cursor: pointer;
				transition: transform 0.15s, box-shadow 0.15s;
				box-shadow: 0 0 24px rgba(251, 191, 36, 0.3);
			}
			.enter-btn:hover {
				transform: scale(1.06);
				box-shadow: 0 0 40px rgba(251, 191, 36, 0.5);
			}
		`,
	],
})
export class LandingScreenComponent {
	protected readonly LINE_COLOR = LINE_COLOR;
	protected readonly NODE_COLOR = NODE_COLOR;

	private readonly router = inject(Router);
	protected readonly nodes = signal<LNode[]>([]);
	protected readonly frozenConns = signal<LConnection[]>([]);
	protected readonly phase = signal<Phase>('idle');
	protected readonly activeTargetIdx = signal<number | null>(null);
	protected readonly travelLn = signal<ShrinkState>({ x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 });
	protected readonly shrinkSt = signal<ShrinkState | null>(null);

	/* ---- internal ---- */
	private animId: number | null = null;
	private startTimerId: ReturnType<typeof setTimeout> | null = null;
	private destroyed = false;
	private travelProgress = 0;
	private nodeCounter = 0;
	private lastReachedIdx = -1;           // index of the last node reached
	private fadeTargets: number[] = [];
	private shrinkData: { sourceIdx: number; targetIdx: number; progress: number; fromX: number; fromY: number; toX: number; toY: number } | null = null;

	constructor() {
		inject(DestroyRef).onDestroy(() => {
			this.destroyed = true;
			if (this.startTimerId !== null) clearTimeout(this.startTimerId);
			if (this.animId !== null) cancelAnimationFrame(this.animId);
		});
	}

	/* ---- helpers ---- */
	private rand(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	private addNode(x?: number, y?: number): number {
		const existing = this.nodes();
		let nx: number, ny: number;
		let attempts = 0;
		do {
			nx = x ?? this.rand(NODE_R * 2, VIEW_W - NODE_R * 2);
			ny = y ?? this.rand(NODE_R * 2, VIEW_H - NODE_R * 2);
			attempts++;
		} while (
			attempts < 200 &&
			existing.some(n => Math.hypot(n.x - nx, n.y - ny) < MIN_NODE_DIST)
		);
		const idx = existing.length;
		const n: LNode = {
			id: ++this.nodeCounter,
			x: nx,
			y: ny,
			opacity: 1,
			radius: NODE_R,
			filled: false,
		};
		this.nodes.update(list => [...list, n]);
		return idx;
	}

	/* ---- start ---- */
	startAnimation() {
		this.reset();
		this.phase.set('travel');

		// first node at random position, immediately "reached"
		const firstIdx = this.addNode();
		const first = this.nodes()[firstIdx];
		this.lastReachedIdx = firstIdx;
		first.filled = true;
		this.nodes.set([...this.nodes()]);

		// second node is the first target
		const secondIdx = this.addNode();
		this.activeTargetIdx.set(secondIdx);
		this.travelProgress = 0;

		this.startTimerId = setTimeout(() => this.runLoop());
	}

	private reset() {
		this.nodes.set([]);
		this.frozenConns.set([]);
		this.phase.set('idle');
		this.activeTargetIdx.set(null);
		this.travelProgress = 0;
		this.nodeCounter = 0;
		this.lastReachedIdx = -1;
		this.fadeTargets = [];
		this.shrinkData = null;
		this.shrinkSt.set(null);
		if (this.animId !== null) cancelAnimationFrame(this.animId);
	}

	/* ---- main loop ---- */
	private runLoop() {
		if (this.destroyed || this.phase() === 'idle') return;

		if (this.phase() === 'travel') this.tickTravel();

		this.tickFade();
		this.tickShrink();

		this.animId = requestAnimationFrame(() => this.runLoop());
	}

	/* ---- travel tick ---- */
	private tickTravel() {
		const targetIdx = this.activeTargetIdx();
		if (targetIdx === null) return;
		const target = this.nodes()[targetIdx];
		if (!target) return;

		const src = this.lastReachedIdx >= 0 ? this.nodes()[this.lastReachedIdx] : null;

		// Total distance from source (or entry) to target center
		const totalDist = src
			? Math.hypot(target.x - src.x, target.y - src.y)
			: Math.hypot(target.x - this.travelLn().x1, target.y - this.travelLn().y1);

		/* Stop at the circle's outer border */
		const stopDist = totalDist - target.radius;
		const maxProgress = stopDist / totalDist;

		this.travelProgress += TRAVEL_SPEED;
		if (this.travelProgress >= maxProgress) {
			this.travelProgress = maxProgress;

			// final travel line position at the node's border
			if (src) {
				const dx = target.x - src.x;
				const dy = target.y - src.y;
				const d = Math.hypot(dx, dy);
				const borderX = target.x - (dx / d) * target.radius;
				const borderY = target.y - (dy / d) * target.radius;
				this.travelLn.set({ x1: src.x, y1: src.y, x2: borderX, y2: borderY, opacity: 0 });
			} else {
				const start = this.travelLn();
				this.travelLn.set({ x1: start.x1, y1: start.y1, x2: target.x, y2: target.y, opacity: 0 });
			}

			// freeze connection from last reached node to this one
			if (this.lastReachedIdx >= 0) {
				this.frozenConns.update(c => [...c, { sourceIdx: this.lastReachedIdx, targetIdx }]);
			}

			// mark node as reached
			this.lastReachedIdx = targetIdx;
			target.filled = true;
			this.nodes.set([...this.nodes()]);

			// spawn next node
			const nextIdx = this.addNode();
			this.activeTargetIdx.set(nextIdx);

			// fade old nodes when 4th+ node is being drawn
			const nodeCount = this.nodes().length;
			if (nodeCount >= 4) {
				const fadeIdx = nodeCount - 4;
				if (!this.fadeTargets.includes(fadeIdx)) {
					this.fadeTargets.push(fadeIdx);
				}
			}

			// keep next line immediately visible
			this.travelProgress = TRAVEL_SPEED;
			return;
		}

		const frac = this.travelProgress;

		if (src) {
			const endX = src.x + (target.x - src.x) * frac;
			const endY = src.y + (target.y - src.y) * frac;
			this.travelLn.set({ x1: src.x, y1: src.y, x2: endX, y2: endY, opacity: 0 });
		} else {
			const start = this.travelLn();
			const endX = start.x1 + (target.x - start.x1) * frac;
			const endY = start.y1 + (target.y - start.y1) * frac;
			this.travelLn.set({ x1: start.x1, y1: start.y1, x2: endX, y2: endY, opacity: 0 });
		}
	}



	/* ---- fade logic ---- */
	private tickFade() {
		for (const idx of this.fadeTargets) {
			const n = this.nodes()[idx];
			if (!n) continue;
			n.opacity = Math.max(0, n.opacity - FADE_SPEED);
		}

		// check if any node fully faded
		for (const idx of this.fadeTargets) {
			const n = this.nodes()[idx];
			if (!n || n.opacity > 0) continue;
			if (this.shrinkData) continue;

			const connIdx = this.frozenConns().findIndex(c => c.sourceIdx === idx);
			if (connIdx < 0) continue;

			const conn = this.frozenConns()[connIdx];
			const targetNode = this.nodes()[conn.targetIdx];
			if (!targetNode) continue;

			this.shrinkData = {
				sourceIdx: conn.sourceIdx,
				targetIdx: conn.targetIdx,
				progress: 0,
				fromX: n.x,
				fromY: n.y,
				toX: targetNode.x,
				toY: targetNode.y,
			};
			this.shrinkSt.set({
				x1: n.x, y1: n.y,
				x2: targetNode.x, y2: targetNode.y,
				opacity: Math.min(1, targetNode.opacity * 2),
			});
		}

		if (this.fadeTargets.length > 0) {
			this.nodes.set([...this.nodes()]);
		}
	}

	/* ---- shrink logic ---- */
	private tickShrink() {
		if (!this.shrinkData) return;

		this.shrinkData.progress += LINE_SHRINK_SPEED;
		if (this.shrinkData.progress >= 1) {
			this.shrinkData = null;
			this.shrinkSt.set(null);
			return;
		}

		const t = this.shrinkData.progress;
		const x1 = this.shrinkData.fromX + (this.shrinkData.toX - this.shrinkData.fromX) * t;
		const y1 = this.shrinkData.fromY + (this.shrinkData.toY - this.shrinkData.fromY) * t;
		// fade the shrink line as the target node itself fades
		const targetNode = this.nodes()[this.shrinkData.targetIdx];
		const targetOpacity = targetNode ? targetNode.opacity : 0;
		const fadeDuringShrink = 1 - t;
		this.shrinkSt.set({
			x1, y1,
			x2: this.shrinkData.toX, y2: this.shrinkData.toY,
			opacity: Math.min(targetOpacity * 2, fadeDuringShrink),
		});
	}

	/* ---- helpers ---- */
	protected getLineOpacity(conn: LConnection): number {
		const src = this.nodes()[conn.sourceIdx];
		if (!src) return 0;
		return Math.max(0, src.opacity);
	}

	protected onSvgClick() {
		if (this.phase() === 'idle') return;
		this.router.navigate(['/network']);
	}
}
