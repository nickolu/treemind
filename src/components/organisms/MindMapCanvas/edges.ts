import {Edge} from 'reactflow';
import {MindNode} from '@/domain/MindMap/tree';
import {MindLink} from '@/domain/MindMap/links';
import {Layout} from './layout';
import {LinkEdgeData, LinkRoute} from './LinkEdge';
import {TreeEdgeData} from './TreeEdge';

/**
 * Stacking order: container boxes lie at the bottom (by depth), then edges,
 * then ordinary nodes, so links stay visible and clickable inside containers.
 */
export const Z_EDGE = 500;
export const Z_NODE = 1000;

function parentIds(node: MindNode, map = new Map<string, string>()) {
  node.children.forEach((child) => {
    map.set(child.id, node.id);
    parentIds(child, map);
  });
  return map;
}

/** Layouts where nodes line up and straight links would cross neighbours. */
const ROUTES: Partial<Record<Layout['kind'], LinkRoute>> = {
  mindmap: 'right',
  tree: 'below',
};

/** Parent → child lines, drawn per the layout's style. */
export function treeEdges(layout: Layout): Edge<TreeEdgeData>[] {
  return layout.treeEdges.map((e) =>
    e.style === 'curve'
      ? {
          id: `${e.parentId}->${e.childId}`,
          source: e.parentId,
          sourceHandle: 'tree',
          target: e.childId,
          type: 'default',
          style: {stroke: e.color, strokeWidth: e.depth === 1 ? 3 : 2},
          className: 'mm-edge',
          focusable: false,
        }
      : {
          id: `${e.parentId}->${e.childId}`,
          source: e.parentId,
          sourceHandle: 'tree',
          target: e.childId,
          type: 'tree',
          zIndex: e.style === 'dashed' ? Z_EDGE : undefined,
          focusable: false,
          data: {
            style: e.style,
            color: e.color,
            width: e.depth === 1 ? 3 : 2,
          },
        },
  );
}

/**
 * One edge per pair of visible nodes. A link whose end is inside a collapsed
 * branch is drawn to that branch's visible ancestor instead, and several such
 * links are summarized as one, so collapsing and expanding shows the links at
 * the level of detail on screen.
 */
export function linkEdges(
  root: MindNode,
  links: MindLink[],
  layout: Layout,
): Edge<LinkEdgeData>[] {
  if (links.length === 0) return [];
  const parents = parentIds(root);
  const visible = (id: string) => {
    let current: string | undefined = id;
    while (current && !layout.byId.has(current)) current = parents.get(current);
    return current;
  };

  const groups = new Map<
    string,
    {from: string; to: string; links: MindLink[]}
  >();
  links.forEach((link) => {
    const from = visible(link.from);
    const to = visible(link.to);
    if (!from || !to || from === to) return;
    const key = `${from}->${to}`;
    const group = groups.get(key) ?? {from, to, links: []};
    group.links.push(link);
    groups.set(key, group);
  });

  // Spread links between the same two nodes (either direction) apart.
  const perPair = new Map<string, number>();
  const route = ROUTES[layout.kind] ?? 'direct';
  return [...groups.values()].map(({from, to, links: group}) => {
    const pair = from < to ? `${from}|${to}` : `${to}|${from}`;
    const index = perPair.get(pair) ?? 0;
    perPair.set(pair, index + 1);
    const magnitude = Math.ceil(index / 2) * 24;
    // Opposite directions have opposite normals, so the sign keeps them apart.
    const offset = (index % 2 ? 1 : -1) * magnitude * (from < to ? 1 : -1);

    const single = group.length === 1 ? group[0] : null;
    const summarized = group.some((l) => l.from !== from || l.to !== to);
    return {
      id: `link:${from}->${to}`,
      source: from,
      target: to,
      sourceHandle: 'tree',
      type: 'link',
      zIndex: Z_EDGE,
      data: {
        linkIds: group.map((l) => l.id),
        kind: single?.kind ?? null,
        label: single?.label ?? '',
        summarized,
        offset,
        route,
      },
    };
  });
}
