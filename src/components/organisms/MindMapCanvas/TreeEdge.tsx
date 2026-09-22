'use client';
import {memo, useCallback} from 'react';
import {BaseEdge, EdgeProps, ReactFlowState, useStore} from 'reactflow';
import {TreeEdgeStyle} from './layout';
import {borderPoint, centre} from './LinkEdge';

export interface TreeEdgeData {
  style: Exclude<TreeEdgeStyle, 'curve'>;
  color: string;
  width: number;
}

/**
 * Parent → child line for layouts other than the mind map (which uses React
 * Flow's own curve between the left/right handles): an S-curve from bottom to
 * top in top-down trees, and a straight line between borders otherwise.
 */
function TreeEdgeView({source, target, data}: EdgeProps<TreeEdgeData>) {
  const parent = useStore(
    useCallback((s: ReactFlowState) => s.nodeInternals.get(source), [source]),
  );
  const child = useStore(
    useCallback((s: ReactFlowState) => s.nodeInternals.get(target), [target]),
  );
  if (!parent?.width || !child?.width || !data) return null;

  let path: string;
  if (data.style === 'vertical') {
    const from = {
      x: centre(parent).x,
      y: (parent.positionAbsolute?.y ?? 0) + (parent.height ?? 0),
    };
    const to = {x: centre(child).x, y: child.positionAbsolute?.y ?? 0};
    const midY = (from.y + to.y) / 2;
    path = `M ${from.x},${from.y} C ${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`;
  } else {
    const a = centre(parent);
    const b = centre(child);
    const from = borderPoint(parent, b.x - a.x, b.y - a.y, 0);
    const to = borderPoint(child, a.x - b.x, a.y - b.y, 0);
    path = `M ${from.x},${from.y} L ${to.x},${to.y}`;
  }

  return (
    <BaseEdge
      path={path}
      style={{
        stroke: data.color,
        strokeWidth: data.style === 'dashed' ? 1.5 : data.width,
        strokeDasharray: data.style === 'dashed' ? '4 4' : undefined,
        opacity: data.style === 'dashed' ? 0.7 : 1,
      }}
    />
  );
}

export const TreeEdge = memo(TreeEdgeView);
