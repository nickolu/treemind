'use client';
import {memo, useCallback} from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  Node,
  ReactFlowState,
  useStore,
} from 'reactflow';
import {LINK_KINDS, LinkKind, LinkMarker} from '@/domain/MindMap/links';

/**
 * How links avoid the nodes they'd otherwise cross: in a mind map nodes are
 * stacked in columns (loop out to the right), in a top-down tree they sit in
 * rows (loop out below); elsewhere links go straight.
 */
export type LinkRoute = 'right' | 'below' | 'direct';

export interface LinkEdgeData {
  /** Links drawn by this edge (several when both ends are collapsed away). */
  linkIds: string[];
  /** Kind and label of the link, when the edge stands for exactly one. */
  kind: LinkKind | null;
  label: string;
  /** True when at least one end is hidden inside a collapsed branch. */
  summarized: boolean;
  /** Bends the edge sideways so parallel links don't overlap. */
  offset: number;
  route: LinkRoute;
}

const markerUrl = (marker: LinkMarker) =>
  marker ? `url(#mm-marker-${marker})` : undefined;

/** Where the line from the node's centre towards (dx, dy) leaves its box. */
export function borderPoint(node: Node, dx: number, dy: number, gap: number) {
  const w = (node.width ?? 0) / 2;
  const h = (node.height ?? 0) / 2;
  const cx = (node.positionAbsolute?.x ?? 0) + w;
  const cy = (node.positionAbsolute?.y ?? 0) + h;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const t = Math.min(
    ux ? (w + gap) / Math.abs(ux) : Infinity,
    uy ? (h + gap) / Math.abs(uy) : Infinity,
  );
  return {x: cx + ux * t, y: cy + uy * t};
}

export const centre = (node: Node) => ({
  x: (node.positionAbsolute?.x ?? 0) + (node.width ?? 0) / 2,
  y: (node.positionAbsolute?.y ?? 0) + (node.height ?? 0) / 2,
});

const right = (node: Node) =>
  (node.positionAbsolute?.x ?? 0) + (node.width ?? 0);

const bottom = (node: Node) =>
  (node.positionAbsolute?.y ?? 0) + (node.height ?? 0);

/** True when one node is (at least partly) above the other. */
function sameColumn(a: Node, b: Node) {
  const left = Math.max(a.positionAbsolute?.x ?? 0, b.positionAbsolute?.x ?? 0);
  return Math.min(right(a), right(b)) - left > 0;
}

/** True when one node is (at least partly) beside the other. */
function sameRow(a: Node, b: Node) {
  const top = Math.max(a.positionAbsolute?.y ?? 0, b.positionAbsolute?.y ?? 0);
  return Math.min(bottom(a), bottom(b)) - top > 0;
}

interface Route {
  path: string;
  labelX: number;
  labelY: number;
}

/**
 * Nodes lined up in a row of a top-down tree would be joined by a line
 * through everything between them, so those links loop out below instead.
 */
function belowRoute(source: Node, target: Node, offset: number): Route {
  const gap = 2;
  const start = {x: centre(source).x, y: bottom(source) + gap};
  const end = {x: centre(target).x, y: bottom(target) + gap};
  const bulge = 36 + Math.abs(end.x - start.x) * 0.15 + Math.abs(offset);
  const y = Math.max(start.y, end.y) + bulge;
  return {
    path: `M ${start.x},${start.y} C ${start.x},${y} ${end.x},${y} ${end.x},${end.y}`,
    labelX: (start.x + end.x) / 2,
    labelY: (start.y + 6 * y + end.y) / 8,
  };
}

/**
 * Nodes stacked in one column of the tree would be joined by a line through
 * everything between them, so those links loop out to the right instead.
 */
function sideRoute(source: Node, target: Node, offset: number): Route {
  const gap = 2;
  const start = {x: right(source) + gap, y: centre(source).y};
  const end = {x: right(target) + gap, y: centre(target).y};
  const bulge = 36 + Math.abs(end.y - start.y) * 0.2 + Math.abs(offset);
  const x = Math.max(start.x, end.x) + bulge;
  return {
    path: `M ${start.x},${start.y} C ${x},${start.y} ${x},${end.y} ${end.x},${end.y}`,
    // Midpoint of the cubic curve (t = 0.5).
    labelX: (start.x + 6 * x + end.x) / 8,
    labelY: (start.y + 3 * start.y + 3 * end.y + end.y) / 8,
  };
}

/** A straight line between the borders, bent sideways by `offset`. */
function directRoute(source: Node, target: Node, offset: number): Route {
  const a = centre(source);
  const b = centre(target);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / length;
  const ny = (b.x - a.x) / length;
  const control = {
    x: (a.x + b.x) / 2 + nx * offset * 2,
    y: (a.y + b.y) / 2 + ny * offset * 2,
  };
  const start = borderPoint(source, control.x - a.x, control.y - a.y, 2);
  const end = borderPoint(target, control.x - b.x, control.y - b.y, 2);
  return {
    path: offset
      ? `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`
      : `M ${start.x},${start.y} L ${end.x},${end.y}`,
    // Midpoint of the curve (t = 0.5).
    labelX: (start.x + 2 * control.x + end.x) / 4,
    labelY: (start.y + 2 * control.y + end.y) / 4,
  };
}

/**
 * A "floating" edge between the borders of two nodes (rather than fixed
 * handles), since links can connect nodes anywhere in the map.
 */
function LinkEdgeView({id, source, target, data}: EdgeProps<LinkEdgeData>) {
  const sourceNode = useStore(
    useCallback((s: ReactFlowState) => s.nodeInternals.get(source), [source]),
  );
  const targetNode = useStore(
    useCallback((s: ReactFlowState) => s.nodeInternals.get(target), [target]),
  );
  if (!sourceNode?.width || !targetNode?.width || !data) return null;

  const {path, labelX, labelY} =
    data.route === 'right' && sameColumn(sourceNode, targetNode)
      ? sideRoute(sourceNode, targetNode, data.offset)
      : data.route === 'below' && sameRow(sourceNode, targetNode)
        ? belowRoute(sourceNode, targetNode, data.offset)
        : directRoute(sourceNode, targetNode, data.offset);

  const info = data.kind ? LINK_KINDS[data.kind] : null;
  const count = data.linkIds.length;
  const label = count > 1 ? `${count} links` : data.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerUrl(info?.start ?? null)}
        markerEnd={markerUrl(info ? info.end : 'arrow')}
        interactionWidth={16}
        style={{
          stroke: 'var(--link)',
          strokeWidth: 1.5,
          strokeDasharray: info?.dashed || data.summarized ? '6 4' : undefined,
          opacity: data.summarized ? 0.6 : 1,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className={`mm-link-label ${data.summarized ? 'mm-link-label--summary' : ''}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const LinkEdge = memo(LinkEdgeView);

// Inline styles, because CSS variables don't resolve in SVG attributes.
const markerStyle = (fill: string) => ({
  fill,
  stroke: 'var(--link)',
  strokeWidth: 1.5,
  strokeLinejoin: 'round' as const,
});

/** SVG markers for link ends; the tip of each shape touches the node. */
export function LinkMarkers() {
  const common = {
    markerUnits: 'userSpaceOnUse',
    orient: 'auto-start-reverse',
  } as const;
  return (
    <svg className="mm-link-markers" aria-hidden>
      <defs>
        <marker
          id="mm-marker-arrow"
          viewBox="0 0 12 12"
          refX={11}
          refY={6}
          markerWidth={12}
          markerHeight={12}
          {...common}
        >
          <path d="M1,1 L11,6 L1,11" style={markerStyle('none')} />
        </marker>
        <marker
          id="mm-marker-triangle"
          viewBox="0 0 16 16"
          refX={15}
          refY={8}
          markerWidth={16}
          markerHeight={16}
          {...common}
        >
          <path
            d="M1,1 L15,8 L1,15 Z"
            style={markerStyle('var(--link-fill)')}
          />
        </marker>
        {(['open', 'filled'] as const).map((variant) => (
          <marker
            key={variant}
            id={`mm-marker-diamond-${variant}`}
            viewBox="0 0 20 12"
            refX={19}
            refY={6}
            markerWidth={20}
            markerHeight={12}
            {...common}
          >
            <path
              d="M1,6 L10,1 L19,6 L10,11 Z"
              style={markerStyle(
                variant === 'filled' ? 'var(--link)' : 'var(--link-fill)',
              )}
            />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
