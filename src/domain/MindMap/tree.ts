import {v4 as uuidv4} from 'uuid';

/**
 * A mind map is a plain, immutable tree. Every operation below returns a new
 * root and only clones the path from the root to the changed node, so
 * untouched subtrees keep their identity (which keeps React re-renders cheap).
 */
export interface MindNode {
  id: string;
  parentId: string | null;
  html: string;
  children: MindNode[];
  collapsed?: boolean;
  /** Present when the node is drawn as a class box (name = the node's text). */
  umlClass?: UmlClass;
  /** For AI-generated nodes: whether they came from the user's context. */
  origin?: NodeOrigin;
}

export interface UmlClass {
  /** Free text such as "entity" or "interface"; rendered as «stereotype». */
  stereotype: string;
  attributes: string[];
  operations: string[];
}

export type NodeOrigin = 'context' | 'inferred';

/** Shape of a node in saved files / localStorage (backwards compatible). */
export type MindNodeJson = {
  id?: string;
  parentId?: string | null;
  html?: string;
  children?: MindNodeJson[];
  collapsed?: boolean;
  umlClass?: Partial<UmlClass>;
  origin?: NodeOrigin;
};

export function createUmlClass(stereotype = ''): UmlClass {
  return {stereotype, attributes: [], operations: []};
}

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

function normalizeUmlClass(value: unknown): UmlClass | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const uml = value as Partial<UmlClass>;
  return {
    stereotype: typeof uml.stereotype === 'string' ? uml.stereotype : '',
    attributes: stringList(uml.attributes),
    operations: stringList(uml.operations),
  };
}

export function createNode(
  parentId: string | null,
  html = '',
  id: string = uuidv4(),
): MindNode {
  return {id, parentId, html, children: []};
}

export function createRoot(html = '<div>Central idea</div>'): MindNode {
  return createNode(null, html);
}

export function findNode(root: MindNode, id: string): MindNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Every node id in the tree. */
export function collectIds(node: MindNode, ids = new Set<string>()) {
  ids.add(node.id);
  node.children.forEach((child) => collectIds(child, ids));
  return ids;
}

export function getParent(root: MindNode, node: MindNode) {
  return node.parentId ? findNode(root, node.parentId) : undefined;
}

export function isAncestorOf(ancestor: MindNode, id: string): boolean {
  return ancestor.children.some(
    (child) => child.id === id || isAncestorOf(child, id),
  );
}

export function countNodes(node: MindNode): number {
  return node.children.reduce((sum, child) => sum + countNodes(child), 1);
}

/** Applies `fn` to the node with `id`, cloning only the path to it. */
export function updateNode(
  root: MindNode,
  id: string,
  fn: (node: MindNode) => MindNode,
): MindNode {
  if (root.id === id) return fn(root);
  let changed = false;
  const children = root.children.map((child) => {
    const next = updateNode(child, id, fn);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? {...root, children} : root;
}

export function insertChildren(
  root: MindNode,
  parentId: string,
  nodes: MindNode[],
  index?: number,
): MindNode {
  return updateNode(root, parentId, (parent) => {
    const children = [...parent.children];
    const at = index === undefined ? children.length : index;
    children.splice(
      at,
      0,
      ...nodes.map((node) => ({...node, parentId: parent.id})),
    );
    return {...parent, children, collapsed: false};
  });
}

export function removeNode(root: MindNode, id: string): MindNode {
  const node = findNode(root, id);
  if (!node?.parentId) return root; // the root can't be removed
  return updateNode(root, node.parentId, (parent) => ({
    ...parent,
    children: parent.children.filter((child) => child.id !== id),
  }));
}

/**
 * Moves a node (with its subtree) under `newParentId` at `index`. `index` is
 * interpreted against the new parent's children *after* the node has been
 * removed from its old position. Invalid moves (onto itself or into its own
 * subtree) return the tree unchanged.
 */
export function moveNode(
  root: MindNode,
  id: string,
  newParentId: string,
  index?: number,
): MindNode {
  const node = findNode(root, id);
  if (!node || !node.parentId || id === newParentId) return root;
  if (isAncestorOf(node, newParentId)) return root;
  const without = removeNode(root, id);
  return insertChildren(without, newParentId, [node], index);
}

export function setCollapsed(
  root: MindNode,
  id: string,
  collapsed: boolean,
): MindNode {
  return updateNode(root, id, (node) =>
    node.children.length === 0 && collapsed ? node : {...node, collapsed},
  );
}

export function setAllCollapsed(root: MindNode, collapsed: boolean): MindNode {
  const walk = (node: MindNode, isRoot: boolean): MindNode => ({
    ...node,
    // Collapsing everything still leaves the first level visible.
    collapsed: !isRoot && node.children.length > 0 ? collapsed : false,
    children: node.children.map((child) => walk(child, false)),
  });
  return walk(root, true);
}

/**
 * Returns the ids from the root down to `id` (inclusive), or [] if missing.
 */
export function getPath(root: MindNode, id: string): string[] {
  if (root.id === id) return [id];
  for (const child of root.children) {
    const path = getPath(child, id);
    if (path.length) return [root.id, ...path];
  }
  return [];
}

/** Expands every collapsed ancestor of `id` so it becomes visible. */
export function revealNode(root: MindNode, id: string): MindNode {
  const ancestors = getPath(root, id).slice(0, -1);
  return ancestors.reduce(
    (tree, ancestorId) => setCollapsed(tree, ancestorId, false),
    root,
  );
}

// Older versions persisted a temporary "Generating ideas…" node into the tree.
const LEGACY_LOADING_MARKER = 'loading-dots';

/**
 * Validates and repairs untrusted JSON (files, localStorage) into a MindNode.
 * Missing ids are generated and parentIds are rebuilt from the structure, so
 * a loaded tree is always internally consistent. Throws if the shape is wrong.
 */
export function normalizeTree(
  json: unknown,
  parentId: string | null = null,
): MindNode {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid mind map: expected an object');
  }
  const value = json as MindNodeJson;
  const id = typeof value.id === 'string' && value.id ? value.id : uuidv4();
  const children = Array.isArray(value.children) ? value.children : [];
  const node: MindNode = {
    id,
    parentId,
    html: typeof value.html === 'string' ? value.html : '',
    children: children
      .filter(
        (child) =>
          !(
            typeof child?.html === 'string' &&
            child.html.includes(LEGACY_LOADING_MARKER)
          ),
      )
      .map((child) => normalizeTree(child, id)),
  };
  if (value.collapsed && node.children.length > 0) node.collapsed = true;
  const umlClass = normalizeUmlClass(value.umlClass);
  if (umlClass) node.umlClass = umlClass;
  if (value.origin === 'context' || value.origin === 'inferred') {
    node.origin = value.origin;
  }
  return node;
}

export function serializeTree(node: MindNode): MindNodeJson {
  return {
    id: node.id,
    parentId: node.parentId,
    html: node.html,
    ...(node.collapsed ? {collapsed: true} : {}),
    ...(node.umlClass ? {umlClass: node.umlClass} : {}),
    ...(node.origin ? {origin: node.origin} : {}),
    children: node.children.map(serializeTree),
  };
}
