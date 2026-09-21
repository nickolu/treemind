import {MindNode, MindNodeJson, normalizeTree, serializeTree} from './tree';
import {MindLink, normalizeLinks} from './links';

/**
 * Everything saved for one map: the tree, the links between its nodes and
 * the optional source text ("context") the AI builds the diagram from.
 */
export interface MindMapDocument {
  root: MindNode;
  links: MindLink[];
  context: string;
}

interface MindMapDocumentJson {
  version: 2;
  root: MindNodeJson;
  links: MindLink[];
  context?: string;
}

export function createDocument(root: MindNode): MindMapDocument {
  return {root, links: [], context: ''};
}

export function serializeDocument(doc: MindMapDocument): MindMapDocumentJson {
  return {
    version: 2,
    root: serializeTree(doc.root),
    links: doc.links,
    ...(doc.context ? {context: doc.context} : {}),
  };
}

/**
 * Accepts the current format or a bare tree (files and localStorage written
 * before links existed). Throws if the shape is wrong.
 */
export function normalizeDocument(json: unknown): MindMapDocument {
  const value = json as Partial<MindMapDocumentJson> | null;
  if (value && typeof value === 'object' && value.root) {
    const root = normalizeTree(value.root);
    return {
      root,
      links: normalizeLinks(value.links, root),
      context: typeof value.context === 'string' ? value.context : '',
    };
  }
  return createDocument(normalizeTree(json));
}
