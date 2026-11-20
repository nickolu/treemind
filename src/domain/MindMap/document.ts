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

export const isLayoutKind = (value: unknown): value is LayoutKind =>
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
  /** True once the user picked a layout by hand; the AI then never changes it. */
  layoutSetByUser?: boolean;
}

interface MindMapDocumentJson {
  version: 2;
  root: MindNodeJson;
  links: MindLink[];
  context?: string;
  layout?: LayoutKind;
  layoutSetByUser?: boolean;
}

/**
 * Decides whether an AI layout suggestion should be applied. Returns the new
 * layout, or null to keep the current one. Anything unknown, 'keep' or
 * 'freeform' is ignored, and a freeform or user-chosen layout is never changed.
 */
export function pickAiLayout(
  suggestion: unknown,
  current: LayoutKind,
  setByUser: boolean,
): LayoutKind | null {
  if (setByUser || current === 'freeform') return null;
  if (!isLayoutKind(suggestion) || suggestion === 'freeform') return null;
  return suggestion === current ? null : suggestion;
}

export function createDocument(root: MindNode): MindMapDocument {
  return {
    root,
    links: [],
    context: '',
    layout: 'mindmap',
    layoutSetByUser: false,
  };
}

export function serializeDocument(doc: MindMapDocument): MindMapDocumentJson {
  return {
    version: 2,
    root: serializeTree(doc.root),
    links: doc.links,
    ...(doc.context ? {context: doc.context} : {}),
    ...(doc.layout !== 'mindmap' ? {layout: doc.layout} : {}),
    // Written explicitly for non-default layouts: absent means "legacy, set by user".
    ...(doc.layoutSetByUser || doc.layout !== 'mindmap'
      ? {layoutSetByUser: !!doc.layoutSetByUser}
      : {}),
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
    const layout = isLayoutKind(value.layout) ? value.layout : 'mindmap';
    // Before the flag existed only the user could pick a non-default layout.
    const layoutSetByUser =
      typeof value.layoutSetByUser === 'boolean'
        ? value.layoutSetByUser
        : layout !== 'mindmap';
    return {
      root,
      links: normalizeLinks(value.links, root),
      context: typeof value.context === 'string' ? value.context : '',
      layout,
      layoutSetByUser,
    };
  }
  return createDocument(normalizeTree(json));
}
