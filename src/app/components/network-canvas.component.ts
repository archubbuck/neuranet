import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { CLUSTER_DEFS, ClusterDef, TN, TopicEdge, TOPICS, TopicNode, clusterColor } from '../topicnet-data';

@Component({
  selector: 'app-network-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="tn-canvas-wrap">
      <svg #svgRoot class="tn-svg"></svg>
      <div class="tn-stats">
        <span><strong>{{ topicsLength }}</strong> nodes</span>
        <span><strong>{{ edgeLength }}</strong> edges</span>
        <span><strong>{{ docsCount }}</strong> documents</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1 1 0%;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }
    .tn-canvas-wrap {
      flex: 1 1 0%;
      display: flex;
      position: relative;
      overflow: hidden;
      background: ${TN.bg};
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }
    .tn-svg {
      width: 100%;
      height: 100%;
      display: block;
      min-width: 0;
      min-height: 0;
    }
    .tn-stats {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: ${TN.panel};
      border: 1px solid ${TN.border2};
      border-radius: 10px;
      padding: 8px 14px;
      display: flex;
      gap: 16px;
      z-index: 5;
      font-size: 12px;
      color: ${TN.dim};
    }
    .tn-stats strong {
      font-weight: 600;
      color: ${TN.mid};
    }
  `,
})
export class NetworkCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('svgRoot', { static: true }) svgRoot?: ElementRef<SVGSVGElement>;

  @Input() nodes: TopicNode[] = TOPICS;
  @Input() edges: TopicEdge[] = [];
  @Input() clusters: ClusterDef[] = CLUSTER_DEFS;
  @Input() selectedNode: TopicNode | null = null;
  @Input() activeCluster: string | null = null;
  @Input() docsCount = 0;

  @Output() nodeClick = new EventEmitter<TopicNode | null>();

  private simulation: d3.Simulation<any, undefined> | null = null;
  private zoomGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private nodeSelection: d3.Selection<SVGGElement, any, SVGGElement, unknown> | null = null;
  private linkSelection: d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null = null;

  get topicsLength(): number {
    return this.nodes.length;
  }

  get edgeLength(): number {
    return this.edges.length;
  }

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['nodes'] || changes['edges'] || changes['clusters']) && this.svgRoot) {
      this.initGraph();
      return;
    }
    if (changes['selectedNode']) {
      this.updateSelectionStyles();
    }
    if (changes['activeCluster']) {
      this.updateClusterStyles();
    }
  }

  ngOnDestroy(): void {
    this.simulation?.stop();
  }

  private initGraph(): void {
    const svgElement = this.svgRoot?.nativeElement;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);
    const width = svgElement.clientWidth || svgElement.parentElement?.clientWidth || 1200;
    const height = svgElement.clientHeight || svgElement.parentElement?.clientHeight || 800;

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'dot-grid')
      .attr('width', 28)
      .attr('height', 28)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern
      .append('circle')
      .attr('cx', 1)
      .attr('cy', 1)
      .attr('r', 0.8)
      .attr('fill', 'rgba(255,255,255,0.04)');

    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#dot-grid)');

    const nodes = this.nodes.map((topic) => ({ ...topic }));
    const edges = this.edges.map((edge) => ({ source: edge.source, target: edge.target, kind: edge.kind ?? 'related' }));
    const colorMap = new Map(this.clusters.map((cluster) => [cluster.id, cluster.color]));
    const resolveColor = (clusterId: string) => colorMap.get(clusterId) ?? clusterColor(clusterId);

    const zoomGroup = svg.append('g').attr('class', 'zoom-g');
    this.zoomGroup = zoomGroup;

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          zoomGroup.attr('transform', event.transform);
        }),
    );

    const linkGroup = zoomGroup.append('g').attr('class', 'links');
    const linkSelection = linkGroup
      .selectAll<SVGLineElement, any>('line')
      .data(edges)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1.2);

    const nodeGroup = zoomGroup.append('g').attr('class', 'nodes');
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, any>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer');

    nodeSelection
      .append('circle')
      .attr('class', 'sel-ring')
      .attr('r', (d: any) => d.r + 6)
      .attr('fill', 'none')
      .attr('stroke', TN.amber)
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    nodeSelection
      .append('circle')
      .attr('class', 'halo')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => resolveColor(d.cluster))
      .attr('opacity', 0.15);

    nodeSelection
      .append('circle')
      .attr('class', 'body')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => `${resolveColor(d.cluster)}bb`)
      .attr('stroke', (d: any) => resolveColor(d.cluster))
      .attr('stroke-width', 1.5);

    nodeSelection
      .filter((d: any) => d.r >= 16)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .attr('font-size', (d: any) => Math.max(9, Math.min(13, d.r * 0.32)))
      .text((d: any) => d.label);

    nodeSelection.on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      this.nodeClick.emit(d as TopicNode);
    });

    svg.on('click', () => {
      this.nodeClick.emit(null);
    });

    this.simulation = d3
      .forceSimulation<any>(nodes as any)
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d: any) => d.id)
          .distance((d: any) => Math.max(d.source.r ?? 10, d.target.r ?? 10) * 2.8)
          .strength(0.6),
      )
      .force('charge', d3.forceManyBody().strength((d: any) => -d.r * 18))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide((d: any) => d.r + 8))
      .alphaDecay(0.02);

    this.simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.source.x + (dx / dist) * d.source.r;
        })
        .attr('y1', (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.source.y + (dy / dist) * d.source.r;
        })
        .attr('x2', (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.x - (dx / dist) * d.target.r;
        })
        .attr('y2', (d: any) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.y - (dy / dist) * d.target.r;
        });

      nodeSelection.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    this.nodeSelection = nodeSelection;
    this.linkSelection = linkSelection;

    nodeSelection.call(
      d3
        .drag<SVGGElement, any>()
        .on('start', (event, d: any) => {
          if (!event.active) {
            this.simulation?.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) {
            this.simulation?.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        }),
    );

    this.updateSelectionStyles();
    this.updateClusterStyles();
  }

  private updateSelectionStyles(): void {
    if (!this.nodeSelection) {
      return;
    }

    this.nodeSelection.each((d, index, groups) => {
      const isSelected = !!this.selectedNode && d.id === this.selectedNode.id;
      const group = d3.select(groups[index]);

      group.select('.sel-ring').transition().duration(200).attr('opacity', isSelected ? 1 : 0);
      group.select('.halo').transition().duration(200).attr('opacity', isSelected ? 0.4 : 0.15);
    });
  }

  private updateClusterStyles(): void {
    if (!this.nodeSelection || !this.linkSelection) {
      return;
    }

    this.nodeSelection.each((d, index, groups) => {
      const dim = this.activeCluster !== null && d.cluster !== this.activeCluster;
      d3.select(groups[index]).transition().duration(200).attr('opacity', dim ? 0.15 : 1);
    });

    this.linkSelection.each((d: any, index, groups) => {
      const dimmed =
        this.activeCluster !== null &&
        d.source.cluster !== this.activeCluster &&
        d.target.cluster !== this.activeCluster;
      d3.select(groups[index]).transition().duration(200).attr('opacity', dimmed ? 0.03 : 1);
    });
  }
}
