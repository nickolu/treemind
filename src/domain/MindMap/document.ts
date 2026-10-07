import {MindNode, MindNodeJson, normalizeTree, serializeTree} from './tree';
import {MindLink, normalizeLinks} from './links';

export type LayoutKind = 'mindmap' | 'tree' | 'radial' | 'diagram' | 'freeform';

export const LAYOUTS: Record<LayoutKind, {name: string; description: string}> =
  {
    mindmap: {name: 'Mind map', description: 'Branches grow left to right'},
    tree: {name: 'Top-down tree', description: 'Hierarchy, root at the top'},
    radial: {name: 'Radial', description: 'Branches around the centre'},
    diagram: {
      name: 'Auto diagram',
      description: 'Arranged by links; groups become containers',
    },
    freeform: {
      name: 'Freeform',
      description: 'Drag anything anywhere; positions are kept',
    },
  };

export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutKind[];

const isLayoutKind = (value: unknown): value is LayoutKind =>
  typeof value === 'string' && value in LAYOUTS;

/** Layouts that draw parents as containers around their children. */
export const usesContainers = (layout: LayoutKind) =>
  layout === 'diagram' || layout === 'freeform';

/**
 * Everything saved for one map: the tree, the links between its nodes and
 * the optional source text ("context") the AI builds the diagram from.
 */
export interface MindMapDocument {
  root: MindNode;
  links: MindLink[];
  context: string;
  layout: LayoutKind;
}

interface MindMapDocumentJson {
  version: 2;
  root: MindNodeJson;
  links: MindLink[];
  context?: string;
  layout?: LayoutKind;
}

export function createDocument(root: MindNode): MindMapDocument {
  return {root, links: [], context: '', layout: 'mindmap'};
}

export function serializeDocument(doc: MindMapDocument): MindMapDocumentJson {
  return {
    version: 2,
    root: serializeTree(doc.root),
    links: doc.links,
    ...(doc.context ? {context: doc.context} : {}),
    ...(doc.layout !== 'mindmap' ? {layout: doc.layout} : {}),
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
      layout: isLayoutKind(value.layout) ? value.layout : 'mindmap',
    };
  }
  return createDocument(normalizeTree(json));
}
