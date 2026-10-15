import {v4 as uuidv4} from 'uuid';
import {MindNode, collectIds} from './tree';

/**
 * Cross-links connect any two nodes, independent of the tree. The tree shows
 * decomposition (a child is part of its parent); links show every other kind
 * of relationship. `relation` is the everyday, labelled arrow; the rest are
 * the UML relationships used in class diagrams.
 */
export type LinkKind =
  | 'relation'
  | 'association'
  | 'dependency'
  | 'aggregation'
  | 'composition'
  | 'inheritance'
  | 'realization';

export interface MindLink {
  id: string;
  from: string;
  to: string;
  kind: LinkKind;
  label: string;
}

export type LinkMarker =
  'arrow' | 'triangle' | 'diamond-open' | 'diamond-filled' | null;

export interface LinkKindInfo {
  name: string;
  /** How `from` relates to `to`, for menus and the AI prompt. */
  description: string;
  dashed: boolean;
  /** Marker drawn at the `from` end. */
  start: LinkMarker;
  /** Marker drawn at the `to` end. */
  end: LinkMarker;
  uml: boolean;
}

export const LINK_KINDS: Record<LinkKind, LinkKindInfo> = {
  relation: {
    name: 'Connection',
    description: 'A general, labelled relationship',
    dashed: false,
    start: null,
    end: 'arrow',
    uml: false,
  },
  association: {
    name: 'Association',
    description: 'Knows about / holds a reference to',
    dashed: false,
    start: null,
    end: 'arrow',
    uml: true,
  },
  dependency: {
    name: 'Dependency',
    description: 'Uses, calls or depends on',
    dashed: true,
    start: null,
    end: 'arrow',
    uml: true,
  },
  aggregation: {
    name: 'Aggregation',
    description: 'Has parts that can exist on their own',
    dashed: false,
    start: 'diamond-open',
    end: null,
    uml: true,
  },
  composition: {
    name: 'Composition',
    description: 'Owns parts that live and die with it',
    dashed: false,
    start: 'diamond-filled',
    end: null,
    uml: true,
  },
  inheritance: {
    name: 'Inheritance',
    description: 'Is a kind of',
    dashed: false,
    start: null,
    end: 'triangle',
    uml: true,
  },
  realization: {
    name: 'Realization',
    description: 'Implements',
    dashed: true,
    start: null,
    end: 'triangle',
    uml: true,
  },
};

export const LINK_KIND_IDS = Object.keys(LINK_KINDS) as LinkKind[];

export const isLinkKind = (value: unknown): value is LinkKind =>
  typeof value === 'string' && value in LINK_KINDS;

export function createLink(
  from: string,
  to: string,
  kind: LinkKind = 'relation',
  label = '',
): MindLink {
  return {id: uuidv4(), from, to, kind, label};
}

/** True when an equivalent link (same ends, direction and kind) exists. */
export function hasLink(
  links: readonly MindLink[],
  from: string,
  to: string,
  kind: LinkKind,
) {
  return links.some((l) => l.from === from && l.to === to && l.kind === kind);
}

/** Drops links whose ends no longer exist. Returns `links` if none were dropped. */
export function pruneLinks(links: MindLink[], root: MindNode): MindLink[] {
  if (links.length === 0) return links;
  const ids = collectIds(root);
  const kept = links.filter((l) => ids.has(l.from) && ids.has(l.to));
  return kept.length === links.length ? links : kept;
}

/** Validates untrusted JSON into links between nodes of `root`. */
export function normalizeLinks(json: unknown, root: MindNode): MindLink[] {
  if (!Array.isArray(json)) return [];
  const ids = collectIds(root);
  const seen = new Set<string>();
  return json.flatMap((value): MindLink[] => {
    if (!value || typeof value !== 'object') return [];
    const link = value as Partial<MindLink>;
    if (
      typeof link.from !== 'string' ||
      typeof link.to !== 'string' ||
      link.from === link.to ||
      !ids.has(link.from) ||
      !ids.has(link.to)
    ) {
      return [];
    }
    const id =
      typeof link.id === 'string' && link.id && !seen.has(link.id)
        ? link.id
        : uuidv4();
    seen.add(id);
    return [
      {
        id,
        from: link.from,
        to: link.to,
        kind: isLinkKind(link.kind) ? link.kind : 'relation',
        label: typeof link.label === 'string' ? link.label : '',
      },
    ];
  });
}
