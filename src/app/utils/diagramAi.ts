import {v4 as uuidv4} from 'uuid';
import {MindNode, UmlClass} from '@/domain/MindMap/tree';
import {LinkKind, MindLink} from '@/domain/MindMap/links';
import {Generation} from '@/domain/MindMap/generation';
import {htmlToText} from '@/domain/MindMap/html';

/**
 * Contract between the client and /api/expandDiagram. The map is sent as
 * text with short refs (n1, n2… for nodes, L1, L2… for links) so the model
 * can point at things reliably; the client maps them back to real ids.
 */
export interface ExpandDiagramRequest {
  map: string;
  /** Refs of the nodes to add detail to. */
  targets: string[];
  mode: 'node' | 'all';
  context: string;
  /** Only use facts from `context` (ignored when there is none). */
  strict: boolean;
  model: string;
}

export interface ExpandDiagramResponse {
  nodes: {
    ref: string;
    parent: string;
    text: string;
    isClass: boolean;
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

/** Placeholder root names the AI may replace with a real subject. */
const PLACEHOLDER_ROOTS = new Set(['', 'central idea']);

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

function describeNode(node: MindNode): string {
  const name = oneLine(htmlToText(node.html)) || '(empty)';
  const uml = node.umlClass;
  if (!uml) return name;
  const stereotype = uml.stereotype ? ` «${oneLine(uml.stereotype)}»` : '';
  const members = [
    uml.attributes.map(oneLine).join('; '),
    uml.operations.map(oneLine).join('; '),
  ];
  return `class ${name}${stereotype} { ${members[0]} | ${members[1]} }`;
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

/** Appends new members, skipping ones the class already has. */
function mergeMembers(existing: string[], added: string[]) {
  const seen = new Set(existing.map((m) => oneLine(m).toLowerCase()));
  const result = [...existing];
  for (const member of added.map(oneLine)) {
    const key = member.toLowerCase();
    if (!member || seen.has(key)) continue;
    seen.add(key);
    result.push(member);
  }
  return result;
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
