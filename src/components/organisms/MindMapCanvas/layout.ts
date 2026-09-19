import {MindNode} from '@/domain/MindMap/tree';

export interface Size {
  width: number;
  height: number;
}

export interface XY {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  parentId: string | null;
  position: XY;
  size: Size;
  depth: number;
  color: string;
}

export interface Layout {
  /** Visible nodes in depth-first order. */
  nodes: LayoutNode[];
  byId: Map<string, LayoutNode>;
}

export const HORIZONTAL_GAP = 64;
export const VERTICAL_GAP = 12;
/** Used until React Flow has measured a node. */
export const DEFAULT_SIZE: Size = {width: 160, height: 42};

// One colour per first-level branch; chosen to stay readable on white.
export const BRANCH_COLORS = [
  '#4f6bed',
  '#e0662f',
  '#16a34a',
  '#9333ea',
  '#0891b2',
  '#db2777',
  '#ca8a04',
  '#0d9488',
];
export const ROOT_COLOR = '#1e293b';

/**
 * Classic left-to-right tree layout driven by *measured* node sizes.
 *
 * Every subtree gets its own vertical band (tall enough for the node itself or
 * all of its visible children, whichever is taller) and bands never overlap,
 * so nodes can't collide no matter how much text they contain. The root stays
 * anchored at the origin so the map doesn't drift as it grows.
 */
export function computeLayout(
  root: MindNode,
  sizes: ReadonlyMap<string, Size>,
): Layout {
  const sizeOf = (id: string) => sizes.get(id) ?? DEFAULT_SIZE;
  const bandHeights = new Map<string, number>();

  const visibleChildren = (node: MindNode) =>
    node.collapsed ? [] : node.children;

  const childrenBlockHeight = (node: MindNode) => {
    const children = visibleChildren(node);
    return children.length === 0
      ? 0
      : children.reduce((sum, child) => sum + bandHeights.get(child.id)!, 0) +
          VERTICAL_GAP * (children.length - 1);
  };

  const measureBand = (node: MindNode): number => {
    visibleChildren(node).forEach(measureBand);
    const height = Math.max(sizeOf(node.id).height, childrenBlockHeight(node));
    bandHeights.set(node.id, height);
    return height;
  };
  measureBand(root);

  const nodes: LayoutNode[] = [];
  const place = (
    node: MindNode,
    x: number,
    bandTop: number,
    depth: number,
    color: string,
  ) => {
    const size = sizeOf(node.id);
    const band = bandHeights.get(node.id)!;
    nodes.push({
      id: node.id,
      parentId: node.parentId,
      position: {x, y: bandTop + (band - size.height) / 2},
      size,
      depth,
      color,
    });

    const children = visibleChildren(node);
    let childTop = bandTop + (band - childrenBlockHeight(node)) / 2;
    children.forEach((child, index) => {
      const childColor =
        depth === 0 ? BRANCH_COLORS[index % BRANCH_COLORS.length] : color;
      place(
        child,
        x + size.width + HORIZONTAL_GAP,
        childTop,
        depth + 1,
        childColor,
      );
      childTop += bandHeights.get(child.id)! + VERTICAL_GAP;
    });
  };
  place(root, 0, 0, 0, ROOT_COLOR);

  // Anchor the root's vertical centre at y = 0.
  const offsetY = -(nodes[0].position.y + nodes[0].size.height / 2);
  nodes.forEach((node) => (node.position.y += offsetY));

  return {nodes, byId: new Map(nodes.map((node) => [node.id, node]))};
}
