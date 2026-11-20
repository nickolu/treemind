import {
  MindNode,
  UmlClass,
  createNode,
  findNode,
  insertChildren,
  isAncestorOf,
  moveNode,
  updateNode,
} from './tree';
import {LinkKind, MindLink, createLink, hasLink, isLinkKind} from './links';
import {htmlToText, textToHtml} from './html';
import {NodeShape, isNodeShape} from './shapes';

/**
 * The AI's "design as diagram" output, already mapped from prompt refs to
 * real ids. It is untrusted: applyDesign re-checks every rule against the
 * tree it is applied to.
 */
export interface DesignGeneration {
  shapes: {id: string; shape: NodeShape}[];
  classes: {
    id: string;
    stereotype: string;
    attributes: string[];
    operations: string[];
  }[];
  linkUpdates: {id: string; kind: LinkKind; label: string}[];
  addLinks: {from: string; to: string; kind: LinkKind; label: string}[];
  moves: {id: string; parentId: string}[];
  /** `id` is the new container node's id; members are existing node ids. */
  groups: {id: string; parentId: string; text: string; memberIds: string[]}[];
}

export interface DesignCounts {
  shapes: number;
  classes: number;
  /** Link kinds / labels set, plus links added. */
  links: number;
  groups: number;
  moves: number;
}

export const MIN_GROUP_MEMBERS = 2;

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const normalize = (text: string) => text.trim().toLowerCase();

/** Appends new members, skipping ones the class already has. */
export function mergeMembers(existing: string[], added: string[]) {
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

/**
 * Applies a design to a tree and its links. Nothing is ever deleted: the
 * AI may only add classes / members, set shapes on plain nodes, fill in
 * default links, add links, reparent nodes and wrap nodes in group
 * containers. Returns null when nothing changed.
 */
export function applyDesign(
  root: MindNode,
  links: MindLink[],
  design: DesignGeneration,
): {root: MindNode; links: MindLink[]; counts: DesignCounts} | null {
  let tree = root;
  const counts: DesignCounts = {
    shapes: 0,
    classes: 0,
    links: 0,
    groups: 0,
    moves: 0,
  };

  // 1. Classes: add-only.
  for (const spec of design.classes) {
    const node = findNode(tree, spec.id);
    // The root stays a topic; a node the user gave a shape keeps it.
    if (!node || node.id === tree.id || node.shape) continue;
    const current = node.umlClass;
    const next: UmlClass = {
      stereotype: current?.stereotype || spec.stereotype,
      attributes: mergeMembers(current?.attributes ?? [], spec.attributes),
      operations: mergeMembers(current?.operations ?? [], spec.operations),
    };
    if (
      current &&
      next.stereotype === current.stereotype &&
      next.attributes.length === current.attributes.length &&
      next.operations.length === current.operations.length
    ) {
      continue;
    }
    tree = updateNode(tree, node.id, (n) => ({...n, umlClass: next}));
    counts.classes++;
  }

  // 2. Shapes: only on plain nodes that have none.
  for (const spec of design.shapes) {
    const node = findNode(tree, spec.id);
    if (!node || node.id === tree.id || node.shape || node.umlClass) continue;
    if (!isNodeShape(spec.shape)) continue;
    tree = updateNode(tree, node.id, (n) => ({...n, shape: spec.shape}));
    counts.shapes++;
  }

  // 3. Groups: a new container under the parent, then the members into it.
  for (const spec of design.groups) {
    const parent = findNode(tree, spec.parentId);
    const name = spec.text.trim();
    if (!parent || !name || findNode(tree, spec.id)) continue;
    // No two siblings with the same name, and no nesting of groups in v1.
    if (
      parent.children.some(
        (c) => normalize(htmlToText(c.html)) === normalize(name),
      )
    ) {
      continue;
    }
    const members = [...new Set(spec.memberIds)].filter((id) => {
      const node = findNode(tree, id);
      return (
        !!node &&
        !!node.parentId &&
        id !== parent.id &&
        isAncestorOf(parent, id) && // already inside the parent's subtree
        !isAncestorOf(node, parent.id)
      );
    });
    if (members.length < MIN_GROUP_MEMBERS) continue;

    // Built on a copy so a group that can't be completed leaves no trace.
    let trial = insertChildren(tree, parent.id, [
      createNode(parent.id, textToHtml(name), spec.id),
    ]);
    let moved = 0;
    for (const id of members) {
      const next = moveInto(trial, id, spec.id);
      if (next !== trial) moved++;
      trial = next;
    }
    if (moved < MIN_GROUP_MEMBERS) continue;
    tree = trial;
    counts.groups++;
  }

  // 4. Moves, each validated against the tree as it is now.
  for (const spec of design.moves) {
    const node = findNode(tree, spec.id);
    const parent = findNode(tree, spec.parentId);
    if (!node || !parent || !node.parentId) continue; // missing, or the root
    if (node.parentId === parent.id || node.id === parent.id) continue;
    if (isAncestorOf(node, parent.id)) continue; // would create a cycle
    const next = moveInto(tree, node.id, parent.id);
    if (next === tree) continue;
    tree = next;
    counts.moves++;
  }

  // 5 + 6. Links.
  let nextLinks = links;
  for (const spec of design.linkUpdates) {
    const link = nextLinks.find((l) => l.id === spec.id);
    if (!link || link.kind !== 'relation' || !isLinkKind(spec.kind)) continue;
    const kind =
      spec.kind !== link.kind &&
      !hasLink(nextLinks, link.from, link.to, spec.kind)
        ? spec.kind
        : link.kind;
    const label = !link.label.trim() ? spec.label.trim() : link.label;
    if (kind === link.kind && label === link.label) continue;
    const updated = {...link, kind, label};
    nextLinks = nextLinks.map((l) => (l === link ? updated : l));
    counts.links++;
  }
  for (const spec of design.addLinks) {
    if (
      spec.from === spec.to ||
      !isLinkKind(spec.kind) ||
      !findNode(tree, spec.from) ||
      !findNode(tree, spec.to) ||
      hasLink(nextLinks, spec.from, spec.to, spec.kind)
    ) {
      continue;
    }
    nextLinks = [
      ...nextLinks,
      createLink(spec.from, spec.to, spec.kind, spec.label.trim()),
    ];
    counts.links++;
  }

  const changed =
    counts.shapes +
    counts.classes +
    counts.links +
    counts.groups +
    counts.moves;
  return changed === 0 ? null : {root: tree, links: nextLinks, counts};
}

/** Moves a node, and stops it floating when it lands directly under the root. */
function moveInto(tree: MindNode, id: string, parentId: string): MindNode {
  const moved = moveNode(tree, id, parentId);
  if (moved === tree || parentId !== moved.id) return moved;
  return updateNode(moved, id, (node) => {
    const {floating, ...rest} = node;
    void floating;
    return rest;
  });
}
