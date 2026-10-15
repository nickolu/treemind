import type {ElkExtendedEdge, ElkNode} from 'elkjs/lib/elk-api';
import {MindNode} from '@/domain/MindMap/tree';
import {MindLink} from '@/domain/MindMap/links';
import {
  CONTAINER_HEADER,
  CONTAINER_PADDING,
  Layout,
  LayoutBuilder,
  Size,
  floatingNodes,
  isContainer,
  nodeStyles,
  visibleChildren,
} from './layout';

type Elk = InstanceType<typeof import('elkjs/lib/elk.bundled.js').default>;

let elkPromise: Promise<Elk> | null = null;

/** ELK is large, so it's only loaded once a diagram layout is used. */
function loadElk() {
  elkPromise ??= import('elkjs/lib/elk.bundled.js').then(
    ({default: ELK}) => new ELK(),
  );
  return elkPromise;
}

const CONTAINER_OPTIONS = {
  'elk.padding': `[top=${CONTAINER_HEADER + CONTAINER_PADDING},left=${CONTAINER_PADDING},bottom=${CONTAINER_PADDING},right=${CONTAINER_PADDING}]`,
};

const GRAPH_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.spacing.nodeNode': '32',
  'elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'elk.spacing.componentComponent': '64',
};

/** Nearest ancestor-or-self of each node that is drawn. */
function representatives(root: MindNode) {
  const reps = new Map<string, string>();
  const walk = (node: MindNode, hiddenBy: string | null) => {
    reps.set(node.id, hiddenBy ?? node.id);
    const childRep = hiddenBy ?? (node.collapsed ? node.id : null);
    node.children
      .filter((child) => !child.floating)
      .forEach((child) => walk(child, childRep));
  };
  walk(root, null);
  floatingNodes(root).forEach((node) => walk(node, null));
  return reps;
}

/**
 * Automatic diagram layout with ELK's layered algorithm: nodes are arranged
 * by their links, parents become containers around their children, and
 * floating nodes are laid out beside the main diagram.
 */
export async function computeElkLayout(
  root: MindNode,
  links: MindLink[],
  sizes: ReadonlyMap<string, Size>,
): Promise<Layout> {
  const elk = await loadElk();
  const b = new LayoutBuilder(nodeStyles(root), sizes);
  const byId = new Map<string, MindNode>();
  const edges: ElkExtendedEdge[] = [];

  const toElk = (node: MindNode): ElkNode[] => {
    byId.set(node.id, node);
    const children = visibleChildren(node);
    if (isContainer(node)) {
      return [
        {
          id: node.id,
          layoutOptions: CONTAINER_OPTIONS,
          children: children.flatMap(toElk),
        },
      ];
    }
    // A class's child nodes sit beside it, joined by a (dashed) tree edge.
    children.forEach((child) =>
      edges.push({
        id: `tree:${child.id}`,
        sources: [node.id],
        targets: [child.id],
      }),
    );
    return [{id: node.id, ...b.size(node.id)}, ...children.flatMap(toElk)];
  };
  const graph: ElkNode = {
    id: '__graph',
    layoutOptions: GRAPH_OPTIONS,
    children: [root, ...floatingNodes(root)].flatMap(toElk),
  };

  const reps = representatives(root);
  const seen = new Set<string>();
  links.forEach((link) => {
    let from = reps.get(link.from);
    let to = reps.get(link.to);
    if (!from || !to || from === to) return;
    // Supertypes above subtypes, as class diagrams are usually drawn.
    if (link.kind === 'inheritance' || link.kind === 'realization') {
      [from, to] = [to, from];
    }
    const key = `${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({id: `link:${link.id}`, sources: [from], targets: [to]});
  });
  graph.edges = edges;

  let result: ElkNode;
  try {
    result = await elk.layout(graph);
  } catch {
    // Some link combinations can trip ELK up; lay out the structure alone.
    result = await elk.layout({
      ...graph,
      edges: edges.filter((e) => e.id.startsWith('tree:')),
    });
  }

  // ELK positions are relative to the parent; containers precede children.
  const place = (node: ElkNode, offsetX: number, offsetY: number) => {
    const x = offsetX + (node.x ?? 0);
    const y = offsetY + (node.y ?? 0);
    const treeNode = byId.get(node.id);
    if (treeNode) {
      const container = !!node.children?.length;
      b.add(
        treeNode,
        {x, y},
        {
          ...(container
            ? {
                container: true,
                size: {width: node.width ?? 0, height: node.height ?? 0},
              }
            : {}),
        },
      );
    }
    node.children?.forEach((child) => place(child, x, y));
  };
  result.children?.forEach((child) => place(child, 0, 0));

  // Tree edges only for class children (containers show the rest).
  byId.forEach((node) => {
    if (!isContainer(node)) {
      visibleChildren(node).forEach((child) => b.edge(node, child, 'dashed'));
    }
  });
  return b.build('diagram');
}
