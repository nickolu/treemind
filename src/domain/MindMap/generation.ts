import {
  MindNode,
  NodeOrigin,
  UmlClass,
  createNode,
  findNode,
  insertChildren,
  updateNode,
} from './tree';
import {LinkKind, MindLink, createLink, hasLink} from './links';
import {htmlToText, textToHtml} from './html';

/** AI output, already mapped from prompt refs to real node / link ids. */
export interface Generation {
  /** Parents come before their children. */
  nodes: {
    id: string;
    parentId: string;
    text: string;
    umlClass?: UmlClass;
    origin?: NodeOrigin;
  }[];
  /** Class members for existing nodes, and optionally a new root name. */
  updates: {id: string; umlClass?: UmlClass; text?: string}[];
  removeLinkIds: string[];
  addLinks: {from: string; to: string; kind: LinkKind; label: string}[];
}

const normalize = (text: string) => text.trim().toLowerCase();

/**
 * Applies a generation to a tree and its links in one step. Anything that
 * no longer fits (a parent deleted while the AI was working, a node that
 * duplicates an existing sibling, a link to a missing node) is skipped.
 */
export function applyGeneration(
  root: MindNode,
  links: MindLink[],
  generation: Generation,
): {root: MindNode; links: MindLink[]} {
  let tree = root;

  for (const update of generation.updates) {
    tree = updateNode(tree, update.id, (node) => ({
      ...node,
      ...(update.umlClass ? {umlClass: update.umlClass} : {}),
      ...(update.text ? {html: textToHtml(update.text)} : {}),
    }));
  }

  // Duplicates resolve to the existing node, so their children still land.
  const resolved = new Map<string, string>();
  for (const spec of generation.nodes) {
    const parentId = resolved.get(spec.parentId) ?? spec.parentId;
    const parent = findNode(tree, parentId);
    if (!parent || !spec.text.trim()) continue;
    const duplicate = parent.children.find(
      (c) => normalize(htmlToText(c.html)) === normalize(spec.text),
    );
    if (duplicate) {
      resolved.set(spec.id, duplicate.id);
      continue;
    }
    const node: MindNode = {
      ...createNode(parentId, textToHtml(spec.text), spec.id),
      ...(spec.umlClass ? {umlClass: spec.umlClass} : {}),
      ...(spec.origin ? {origin: spec.origin} : {}),
    };
    tree = insertChildren(tree, parentId, [node]);
    resolved.set(spec.id, spec.id);
  }

  const removed = new Set(generation.removeLinkIds);
  const nextLinks = links.filter((l) => !removed.has(l.id));
  for (const spec of generation.addLinks) {
    const from = resolved.get(spec.from) ?? spec.from;
    const to = resolved.get(spec.to) ?? spec.to;
    if (from === to || !findNode(tree, from) || !findNode(tree, to)) continue;
    if (hasLink(nextLinks, from, to, spec.kind)) continue;
    nextLinks.push(createLink(from, to, spec.kind, spec.label));
  }

  const linksChanged =
    nextLinks.length !== links.length ||
    nextLinks.some((link, index) => link !== links[index]);
  return {root: tree, links: linksChanged ? nextLinks : links};
}
