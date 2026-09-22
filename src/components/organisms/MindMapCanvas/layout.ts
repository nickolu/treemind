import {MindNode} from '@/domain/MindMap/tree';
import {LayoutKind} from '@/domain/MindMap/document';

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
  /** Drawn as a box around its children (diagram layouts). */
  container?: boolean;
}

/** How a parent → child line is drawn. */
export type TreeEdgeStyle = 'curve' | 'vertical' | 'straight' | 'dashed';

export interface TreeEdge {
  parentId: string;
  childId: string;
  color: string;
  depth: number;
  style: TreeEdgeStyle;
}

export interface Layout {
  kind: LayoutKind;
  /** Visible nodes; a container always comes before what it contains. */
  nodes: LayoutNode[];
  byId: Map<string, LayoutNode>;
  treeEdges: TreeEdge[];
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
export const FLOATING_COLOR = '#64748b';

/** Container geometry (diagram layouts). */
export const CONTAINER_HEADER = 36;
export const CONTAINER_PADDING = 16;
const CONTAINER_MIN_WIDTH = 180;
const FREEFORM_GAP = 16;
/** Space between separate trees (the main one and floating ones). */
const TREE_GAP = 80;

type Sizes = ReadonlyMap<string, Size>;

/** Children that are drawn; floating nodes are laid out on their own. */
export const visibleChildren = (node: MindNode) =>
  node.collapsed ? [] : node.children.filter((c) => !c.floating);

export const floatingNodes = (root: MindNode) =>
  root.children.filter((c) => c.floating);

/** Parents drawn as boxes around their children (classes never are). */
export const isContainer = (node: MindNode) =>
  !node.umlClass && visibleChildren(node).length > 0;

interface Style {
  depth: number;
  color: string;
}

/** Depth and branch colour of every node that can be drawn. */
function nodeStyles(root: MindNode): Map<string, Style> {
  const styles = new Map<string, Style>();
  const walk = (node: MindNode, depth: number, color: string) => {
    styles.set(node.id, {depth, color});
    visibleChildren(node).forEach((child) => walk(child, depth + 1, color));
  };
  styles.set(root.id, {depth: 0, color: ROOT_COLOR});
  visibleChildren(root).forEach((child, index) =>
    walk(child, 1, BRANCH_COLORS[index % BRANCH_COLORS.length]),
  );
  floatingNodes(root).forEach((node) => walk(node, 1, FLOATING_COLOR));
  return styles;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return {x, y, width: right - x, height: bottom - y};
}

const boxOf = (nodes: LayoutNode[]): Box =>
  union(nodes.map((n) => ({...n.position, ...n.size})));

function shift(nodes: LayoutNode[], dx: number, dy: number) {
  nodes.forEach((n) => {
    n.position = {x: n.position.x + dx, y: n.position.y + dy};
  });
}

/** Builder shared by the layouts: collects nodes and tree edges. */
class LayoutBuilder {
  nodes: LayoutNode[] = [];
  treeEdges: TreeEdge[] = [];

  constructor(
    private readonly styles: Map<string, Style>,
    private readonly sizes: Sizes,
  ) {}

  size(id: string) {
    return this.sizes.get(id) ?? DEFAULT_SIZE;
  }

  add(node: MindNode, position: XY, extra: Partial<LayoutNode> = {}) {
    const style = this.styles.get(node.id) ?? {depth: 0, color: ROOT_COLOR};
    const layoutNode: LayoutNode = {
      id: node.id,
      parentId: node.parentId,
      position,
      size: this.size(node.id),
      ...style,
      ...extra,
    };
    this.nodes.push(layoutNode);
    return layoutNode;
  }

  edge(parent: MindNode, child: MindNode, style: TreeEdgeStyle) {
    const s = this.styles.get(child.id) ?? {depth: 1, color: FLOATING_COLOR};
    this.treeEdges.push({
      parentId: parent.id,
      childId: child.id,
      color: s.color,
      depth: s.depth,
      style,
    });
  }

  build(kind: LayoutKind): Layout {
    return {
      kind,
      nodes: this.nodes,
      byId: new Map(this.nodes.map((n) => [n.id, n])),
      treeEdges: this.treeEdges,
    };
  }
}

/**
 * Tidy tree driven by *measured* node sizes, left-to-right (mind map) or
 * top-down. Every subtree gets its own band across the growth direction (big
 * enough for the node itself or all of its visible children, whichever is
 * bigger) and bands never overlap, so nodes can't collide no matter how much
 * text they contain.
 */
function tidyTree(
  b: LayoutBuilder,
  top: MindNode,
  horizontal: boolean,
): LayoutNode[] {
  const start = b.nodes.length;
  const main = (s: Size) => (horizontal ? s.width : s.height);
  const cross = (s: Size) => (horizontal ? s.height : s.width);
  const mainGap = horizontal ? HORIZONTAL_GAP : 56;
  const crossGap = horizontal ? VERTICAL_GAP : 20;
  const bands = new Map<string, number>();

  const childrenBlock = (node: MindNode) => {
    const children = visibleChildren(node);
    return children.length === 0
      ? 0
      : children.reduce((sum, c) => sum + bands.get(c.id)!, 0) +
          crossGap * (children.length - 1);
  };
  const measure = (node: MindNode) => {
    visibleChildren(node).forEach(measure);
    bands.set(node.id, Math.max(cross(b.size(node.id)), childrenBlock(node)));
  };
  measure(top);

  // Top-down trees line up each level in a row; mind maps stay compact.
  const levelStart: number[] = [];
  if (!horizontal) {
    const levelSize: number[] = [];
    const walk = (node: MindNode, depth: number) => {
      levelSize[depth] = Math.max(levelSize[depth] ?? 0, main(b.size(node.id)));
      visibleChildren(node).forEach((c) => walk(c, depth + 1));
    };
    walk(top, 0);
    levelSize.reduce((offset, size, depth) => {
      levelStart[depth] = offset;
      return offset + size + mainGap;
    }, 0);
  }

  const place = (
    node: MindNode,
    at: number,
    bandTop: number,
    depth: number,
  ) => {
    const size = b.size(node.id);
    const band = bands.get(node.id)!;
    const along = horizontal ? at : levelStart[depth];
    const across = bandTop + (band - cross(size)) / 2;
    b.add(node, horizontal ? {x: along, y: across} : {x: across, y: along});
    let childTop = bandTop + (band - childrenBlock(node)) / 2;
    visibleChildren(node).forEach((child) => {
      b.edge(node, child, horizontal ? 'curve' : 'vertical');
      place(child, along + main(size) + mainGap, childTop, depth + 1);
      childTop += bands.get(child.id)! + crossGap;
    });
  };
  place(top, 0, 0, 0);
  return b.nodes.slice(start);
}

/** Lays out each floating tree after the main one (below or to the right). */
function placeFloating(
  b: LayoutBuilder,
  root: MindNode,
  mainBox: Box,
  below: boolean,
  layoutTree: (node: MindNode) => LayoutNode[],
) {
  let cursor = below
    ? mainBox.y + mainBox.height + TREE_GAP
    : mainBox.x + mainBox.width + TREE_GAP;
  floatingNodes(root).forEach((node) => {
    const placed = layoutTree(node);
    const box = boxOf(placed);
    if (below) {
      shift(placed, mainBox.x - box.x, cursor - box.y);
      cursor += box.height + TREE_GAP / 2;
    } else {
      shift(placed, cursor - box.x, mainBox.y - box.y);
      cursor += box.width + TREE_GAP / 2;
    }
  });
}

function tidyLayout(root: MindNode, sizes: Sizes, horizontal: boolean): Layout {
  const b = new LayoutBuilder(nodeStyles(root), sizes);
  const main = tidyTree(b, root, horizontal);
  // Anchor the root's centre at the origin so the map doesn't drift.
  const rootNode = main[0];
  shift(
    main,
    horizontal ? 0 : -(rootNode.position.x + rootNode.size.width / 2),
    horizontal ? -(rootNode.position.y + rootNode.size.height / 2) : 0,
  );
  placeFloating(b, root, boxOf(main), horizontal, (node) =>
    tidyTree(b, node, horizontal),
  );
  return b.build(horizontal ? 'mindmap' : 'tree');
}

/**
 * Root in the centre, first-level branches spread around it, each subtree
 * getting a wedge in proportion to its number of leaves. Ring radii grow with
 * node sizes so a crowded level gets a bigger ring.
 */
function radialLayout(root: MindNode, sizes: Sizes): Layout {
  const b = new LayoutBuilder(nodeStyles(root), sizes);
  const leaves = new Map<string, number>();
  const countLeaves = (node: MindNode): number => {
    const children = visibleChildren(node);
    const count = children.length
      ? children.reduce((sum, c) => sum + countLeaves(c), 0)
      : 1;
    leaves.set(node.id, count);
    return count;
  };
  countLeaves(root);

  const levels: MindNode[][] = [];
  const collect = (node: MindNode, depth: number) => {
    (levels[depth] ??= []).push(node);
    visibleChildren(node).forEach((c) => collect(c, depth + 1));
  };
  collect(root, 0);

  const extent = (node: MindNode) => {
    const size = b.size(node.id);
    return Math.max(size.width, size.height);
  };
  const radii = [0];
  for (let depth = 1; depth < levels.length; depth++) {
    const inner = Math.max(...levels[depth - 1].map(extent)) / 2;
    const outer = Math.max(...levels[depth].map(extent)) / 2;
    const circumference = levels[depth].reduce(
      (sum, n) => sum + extent(n) * 0.75 + 24,
      0,
    );
    radii[depth] = Math.max(
      radii[depth - 1] + inner + outer + 48,
      circumference / (2 * Math.PI),
    );
  }

  const place = (node: MindNode, from: number, to: number, depth: number) => {
    const size = b.size(node.id);
    const angle = (from + to) / 2;
    const r = radii[depth];
    b.add(node, {
      x: r * Math.cos(angle) - size.width / 2,
      y: r * Math.sin(angle) - size.height / 2,
    });
    let start = from;
    visibleChildren(node).forEach((child) => {
      const span = ((to - from) * leaves.get(child.id)!) / leaves.get(node.id)!;
      b.edge(node, child, 'straight');
      place(child, start, start + span, depth + 1);
      start += span;
    });
  };
  place(root, -Math.PI / 2, (3 * Math.PI) / 2, 0);

  placeFloating(b, root, boxOf(b.nodes), true, (node) =>
    tidyTree(b, node, true),
  );
  return b.build('radial');
}

/**
 * Freeform: nodes sit where they were put (`position`). Parents are drawn as
 * containers fitted around their children. Nodes that were never placed go
 * below their previous sibling (or at the top of their container), so new
 * nodes appear next to related ones instead of on top of them.
 */
function freeformLayout(root: MindNode, sizes: Sizes): Layout {
  const b = new LayoutBuilder(nodeStyles(root), sizes);

  const place = (node: MindNode, anchor: XY): Box => {
    const at = node.position ?? anchor;
    if (isContainer(node)) {
      const container = b.add(node, at, {container: true});
      let cursor = {
        x: at.x + CONTAINER_PADDING,
        y: at.y + CONTAINER_HEADER + CONTAINER_PADDING,
      };
      const boxes = visibleChildren(node).map((child) => {
        const box = place(child, cursor);
        cursor = {x: box.x, y: box.y + box.height + FREEFORM_GAP};
        return box;
      });
      const inner = union(boxes);
      container.position = {
        x: inner.x - CONTAINER_PADDING,
        y: inner.y - CONTAINER_HEADER - CONTAINER_PADDING,
      };
      container.size = {
        width: Math.max(
          inner.width + 2 * CONTAINER_PADDING,
          CONTAINER_MIN_WIDTH,
        ),
        height: inner.height + CONTAINER_HEADER + 2 * CONTAINER_PADDING,
      };
      return {...container.position, ...container.size};
    }

    const placed = b.add(node, at);
    const boxes: Box[] = [{...at, ...placed.size}];
    // A class's child nodes (e.g. nested types) hang off to its right.
    let cursor = {x: at.x + placed.size.width + HORIZONTAL_GAP, y: at.y};
    visibleChildren(node).forEach((child) => {
      b.edge(node, child, 'dashed');
      const box = place(child, cursor);
      boxes.push(box);
      cursor = {x: cursor.x, y: box.y + box.height + FREEFORM_GAP};
    });
    return union(boxes);
  };

  const mainBox = place(root, {x: 0, y: 0});
  let floatY = mainBox.y;
  floatingNodes(root).forEach((node) => {
    const box = place(node, {
      x: mainBox.x + mainBox.width + TREE_GAP,
      y: floatY,
    });
    floatY = Math.max(floatY, box.y + box.height + FREEFORM_GAP * 2);
  });
  return b.build('freeform');
}

/** True when any node that would be drawn has a freeform position. */
export function hasPinnedNodes(root: MindNode): boolean {
  const walk = (node: MindNode): boolean =>
    !!node.position || visibleChildren(node).some(walk);
  return walk(root) || floatingNodes(root).some(walk);
}

/**
 * Layouts that can be computed synchronously. Returns null for the auto
 * diagram (and freeform before anything was placed), which ELK lays out.
 */
export function computeLayout(
  kind: LayoutKind,
  root: MindNode,
  sizes: Sizes,
): Layout | null {
  switch (kind) {
    case 'mindmap':
      return tidyLayout(root, sizes, true);
    case 'tree':
      return tidyLayout(root, sizes, false);
    case 'radial':
      return radialLayout(root, sizes);
    case 'freeform':
      return hasPinnedNodes(root) ? freeformLayout(root, sizes) : null;
    case 'diagram':
      return null;
  }
}

export {nodeStyles, LayoutBuilder};
