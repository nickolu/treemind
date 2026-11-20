import {v4 as uuidv4} from 'uuid';
import {MindNode, UmlClass, collectIds} from '@/domain/MindMap/tree';
import {LinkKind, MindLink} from '@/domain/MindMap/links';
import {Generation} from '@/domain/MindMap/generation';
import {DesignGeneration, mergeMembers} from '@/domain/MindMap/design';
import {htmlToText} from '@/domain/MindMap/html';
import {NodeShape, isNodeShape} from '@/domain/MindMap/shapes';
import type {LayoutKind} from '@/domain/MindMap/document';

/** Layouts the AI may answer with. 'freeform' is deliberately absent. */
export const AI_LAYOUT_CHOICES = [
  'keep',
  'mindmap',
  'tree',
  'radial',
  'diagram',
] as const;
export type AiLayoutChoice = (typeof AI_LAYOUT_CHOICES)[number];

/**
 * Contract between the client and /api/expandDiagram. The map is sent as
 * text with short refs (n1, n2… for nodes, L1, L2… for links) so the model
 * can point at things reliably; the client maps them back to real ids.
 */
export interface ExpandDiagramRequest {
  map: string;
  /** Refs of the nodes to diagram. */
  targets: string[];
  mode: 'node' | 'all';
  context: string;
  /** Only use facts from `context` (ignored when there is none). */
  strict: boolean;
  model: string;
  /** The layout the map is currently shown in. */
  layout: LayoutKind;
}

export interface ExpandDiagramResponse {
  /** Suggested layout; the client treats anything unexpected as 'keep'. */
  layout: AiLayoutChoice;
  nodes: {
    ref: string;
    parent: string;
    text: string;
    isClass: boolean;
    /** A NodeShape id, or '' for a plain topic. */
    shape: string;
    stereotype: string;
    attributes: string[];
    operations: string[];
    fromContext: boolean;
  }[];
  updates: {
    ref: string;
    text: string;
    isClass: boolean;
    stereotype: string;
    attributes: string[];
    operations: string[];
  }[];
  removeLinks: string[];
  addLinks: {from: string; to: string; kind: LinkKind; label: string}[];
}

/**
 * Contract between the client and /api/designDiagram: the whole map as text
 * (same refs as above); the model answers with changes to what is there.
 */
export interface DesignDiagramRequest {
  map: string;
  model: string;
}

export interface DesignDiagramResponse {
  layout: AiLayoutChoice;
  setShapes: {ref: string; shape: NodeShape}[];
  makeClasses: {
    ref: string;
    stereotype: string;
    attributes: string[];
    operations: string[];
  }[];
  linkUpdates: {link: string; kind: LinkKind; label: string}[];
  addLinks: {from: string; to: string; kind: LinkKind; label: string}[];
  moves: {ref: string; parent: string}[];
  /** `ref` is a local name (g1, g2…); members and parent are node refs. */
  groups: {ref: string; parent: string; text: string; members: string[]}[];
}

/** Placeholder root names the AI may replace with a real subject. */
const PLACEHOLDER_ROOTS = new Set(['', 'central idea']);

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

function describeNode(node: MindNode): string {
  const name = oneLine(htmlToText(node.html)) || '(empty)';
  const floating = node.floating ? ' (floating: not part of n1)' : '';
  const uml = node.umlClass;
  if (!uml) {
    const shape = node.shape ? `[${node.shape}] ` : '';
    return `${shape}${name}${floating}`;
  }
  const stereotype = uml.stereotype ? ` «${oneLine(uml.stereotype)}»` : '';
  const members = [
    uml.attributes.map(oneLine).join('; '),
    uml.operations.map(oneLine).join('; '),
  ];
  return `class ${name}${stereotype} { ${members[0]} | ${members[1]} }${floating}`;
}

export interface DiagramPrompt {
  map: string;
  targets: string[];
  nodeIds: Map<string, string>;
  linkIds: Map<string, string>;
}

/** Renders the tree and links as text, marking the target nodes. */
export function describeDiagram(
  root: MindNode,
  links: MindLink[],
  targetIds: string[],
): DiagramPrompt {
  const refs = new Map<string, string>();
  const nodeIds = new Map<string, string>();
  const targets = new Set(targetIds);
  const lines: string[] = [];

  const walk = (node: MindNode, prefix: string, childPrefix: string) => {
    const ref = `n${refs.size + 1}`;
    refs.set(node.id, ref);
    nodeIds.set(ref, node.id);
    const marker = targets.has(node.id) ? '   ◀ TARGET' : '';
    lines.push(`${prefix}${ref}: ${describeNode(node)}${marker}`);
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1;
      walk(
        child,
        childPrefix + (isLast ? '└── ' : '├── '),
        childPrefix + (isLast ? '    ' : '│   '),
      );
    });
  };
  walk(root, '', '');

  const linkIds = new Map<string, string>();
  const linkLines = links.flatMap((link) => {
    const from = refs.get(link.from);
    const to = refs.get(link.to);
    if (!from || !to) return [];
    const ref = `L${linkIds.size + 1}`;
    linkIds.set(ref, link.id);
    const label = link.label ? ` "${oneLine(link.label)}"` : '';
    return [`${ref}: ${from} --${link.kind}${label}--> ${to}`];
  });

  const map = [
    ...lines,
    '',
    'LINKS:',
    ...(linkLines.length ? linkLines : ['(none)']),
  ].join('\n');

  return {
    map,
    targets: targetIds.map((id) => refs.get(id)!).filter(Boolean),
    nodeIds,
    linkIds,
  };
}

/** Maps the model's refs back to ids, producing something the store can apply. */
export function toGeneration(
  response: ExpandDiagramResponse,
  prompt: DiagramPrompt,
  root: MindNode,
  findNode: (id: string) => MindNode | undefined,
  markOrigin: boolean,
): Generation {
  const newIds = new Map<string, string>();
  const idFor = (ref: string) => prompt.nodeIds.get(ref) ?? newIds.get(ref);

  const nodes: Generation['nodes'] = [];
  for (const spec of response.nodes) {
    const parentId = idFor(spec.parent);
    if (!parentId || prompt.nodeIds.has(spec.ref) || newIds.has(spec.ref)) {
      continue;
    }
    const id = uuidv4();
    newIds.set(spec.ref, id);
    nodes.push({
      id,
      parentId,
      text: spec.text,
      shape: !spec.isClass && isNodeShape(spec.shape) ? spec.shape : undefined,
      umlClass: spec.isClass
        ? {
            stereotype: spec.stereotype,
            attributes: spec.attributes,
            operations: spec.operations,
          }
        : undefined,
      origin: markOrigin
        ? spec.fromContext
          ? 'context'
          : 'inferred'
        : undefined,
    });
  }

  const rootName = oneLine(htmlToText(root.html)).toLowerCase();
  const updates: Generation['updates'] = response.updates.flatMap((spec) => {
    const id = prompt.nodeIds.get(spec.ref);
    const node = id && findNode(id);
    if (!id || !node) return [];
    let umlClass: UmlClass | undefined;
    const current = node.umlClass;
    const addsMembers = spec.attributes.length + spec.operations.length > 0;
    const canBeClass = id !== root.id; // the central topic stays a topic
    if (
      canBeClass &&
      ((spec.isClass && !current) || ((spec.isClass || current) && addsMembers))
    ) {
      umlClass = {
        stereotype: current?.stereotype || spec.stereotype,
        attributes: mergeMembers(current?.attributes ?? [], spec.attributes),
        operations: mergeMembers(current?.operations ?? [], spec.operations),
      };
    }
    // Only a placeholder root may be renamed; user text is never overwritten.
    const text =
      id === root.id && PLACEHOLDER_ROOTS.has(rootName) && spec.text.trim()
        ? spec.text
        : undefined;
    return umlClass || text ? [{id, umlClass, text}] : [];
  });

  return {
    nodes,
    updates,
    removeLinkIds: response.removeLinks.flatMap((ref) => {
      const id = prompt.linkIds.get(ref);
      return id ? [id] : [];
    }),
    addLinks: response.addLinks.flatMap((spec) => {
      const from = idFor(spec.from);
      const to = idFor(spec.to);
      return from && to ? [{from, to, kind: spec.kind, label: spec.label}] : [];
    }),
  };
}

/**
 * Maps a design response to ids against the LATEST tree and links: refs that
 * are unknown, or whose node / link has been deleted since the request was
 * made, are dropped. Groups are local to the response and never nest.
 */
export function toDesign(
  response: DesignDiagramResponse,
  prompt: Pick<DiagramPrompt, 'nodeIds' | 'linkIds'>,
  root: MindNode,
  links: MindLink[],
): DesignGeneration {
  const live = collectIds(root);
  const liveLinks = new Set(links.map((l) => l.id));
  const nodeId = (ref: string) => {
    const id = prompt.nodeIds.get(ref);
    return id && live.has(id) ? id : undefined;
  };

  const groupRefs = new Set<string>();
  return {
    shapes: response.setShapes.flatMap((s) => {
      const id = nodeId(s.ref);
      return id && isNodeShape(s.shape) ? [{id, shape: s.shape}] : [];
    }),
    classes: response.makeClasses.flatMap((c) => {
      const id = nodeId(c.ref);
      return id
        ? [
            {
              id,
              stereotype: c.stereotype,
              attributes: c.attributes,
              operations: c.operations,
            },
          ]
        : [];
    }),
    linkUpdates: response.linkUpdates.flatMap((u) => {
      const id = prompt.linkIds.get(u.link);
      return id && liveLinks.has(id)
        ? [{id, kind: u.kind, label: u.label}]
        : [];
    }),
    addLinks: response.addLinks.flatMap((l) => {
      const from = nodeId(l.from);
      const to = nodeId(l.to);
      return from && to ? [{from, to, kind: l.kind, label: l.label}] : [];
    }),
    moves: response.moves.flatMap((m) => {
      const id = nodeId(m.ref);
      const parentId = nodeId(m.parent);
      return id && parentId ? [{id, parentId}] : [];
    }),
    groups: response.groups.flatMap((g) => {
      const parentId = nodeId(g.parent);
      if (!parentId || !g.ref || groupRefs.has(g.ref)) return [];
      groupRefs.add(g.ref);
      const memberIds = [...new Set(g.members.flatMap((m) => nodeId(m) ?? []))];
      return [{id: uuidv4(), parentId, text: g.text, memberIds}];
    }),
  };
}
