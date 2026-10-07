'use client';
import {useEffect, useMemo, useReducer} from 'react';
import {
  MindNode,
  createNode,
  createRoot,
  findNode,
  getParent,
  insertChildren,
  isAncestorOf,
  moveNode,
  removeNode,
  revealNode,
  setAllCollapsed,
  setCollapsed,
  updateNode,
  UmlClass,
  createUmlClass,
  Point,
} from '@/domain/MindMap/tree';
import {NodeShape} from '@/domain/MindMap/shapes';
import {
  LinkKind,
  MindLink,
  createLink,
  hasLink,
  pruneLinks,
} from '@/domain/MindMap/links';
import {
  LayoutKind,
  MindMapDocument,
  createDocument,
} from '@/domain/MindMap/document';
import {Generation, applyGeneration} from '@/domain/MindMap/generation';
import {
  loadMindMapFromLocalStorage,
  saveMindMapToLocalStorage,
} from '@/app/utils/localStorageOperations';

const HISTORY_LIMIT = 100;

/** What undo/redo restores: the tree and the links between its nodes. */
interface Snapshot {
  root: MindNode;
  links: MindLink[];
}

/**
 * Single source of truth for the mind map: the tree and links (with undo
 * history) plus the UI state that depends on them. React Flow nodes are
 * *derived* from this, never stored separately, so the two can't drift apart.
 */
interface StoreState {
  past: Snapshot[];
  root: MindNode;
  links: MindLink[];
  future: Snapshot[];
  /** Source text for AI generation. Saved with the map, but not undoable. */
  context: string;
  /** How the map is arranged. Saved with the map, but not undoable. */
  layout: LayoutKind;
  /** Node a link is being drawn from (link mode), if any. */
  linkingFrom: string | null;
  selectedId: string;
  /** Node being edited inline; `initialText` replaces its text when set. */
  editing: {id: string; initialText?: string} | null;
  /** Node open in the rich-text editor modal. */
  richEditorId: string | null;
  generatingIds: string[];
}

/** Result of an edit: the new root (and links) plus optional selection changes. */
interface Commit {
  root: MindNode;
  links?: MindLink[];
  selectedId?: string;
  editId?: string;
}

type Action =
  | {type: 'APPLY'; fn: (state: StoreState) => Commit | null}
  | {type: 'REPLACE'; doc: MindMapDocument}
  | {type: 'SET_CONTEXT'; context: string}
  | {type: 'SET_LAYOUT'; layout: LayoutKind}
  | {type: 'SET_LINKING'; id: string | null}
  | {type: 'UNDO'}
  | {type: 'REDO'}
  | {type: 'SELECT'; id: string}
  | {type: 'START_EDIT'; id: string; initialText?: string}
  | {type: 'STOP_EDIT'}
  | {type: 'OPEN_RICH_EDITOR'; id: string | null}
  | {type: 'SET_GENERATING'; id: string; generating: boolean};

/** Keeps selection/editing pointing at nodes that still exist. */
function reconcile(state: StoreState): StoreState {
  const exists = (id: string | undefined | null) =>
    !!id && !!findNode(state.root, id);
  return {
    ...state,
    selectedId: exists(state.selectedId) ? state.selectedId : state.root.id,
    editing: exists(state.editing?.id) ? state.editing : null,
    richEditorId: exists(state.richEditorId) ? state.richEditorId : null,
    linkingFrom: exists(state.linkingFrom) ? state.linkingFrom : null,
  };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'APPLY': {
      const commit = action.fn(state);
      if (!commit) return state;
      // Links to deleted nodes go with them.
      const links = pruneLinks(commit.links ?? state.links, commit.root);
      const changed = commit.root !== state.root || links !== state.links;
      if (!changed && !commit.selectedId) return state;
      return reconcile({
        ...state,
        past: changed
          ? [...state.past, snapshot(state)].slice(-HISTORY_LIMIT)
          : state.past,
        root: commit.root,
        links,
        future: changed ? [] : state.future,
        selectedId: commit.selectedId ?? state.selectedId,
        editing: commit.editId ? {id: commit.editId} : state.editing,
      });
    }
    case 'REPLACE':
      return fromDocument(action.doc);
    case 'SET_CONTEXT':
      return {...state, context: action.context};
    case 'SET_LAYOUT':
      return {...state, layout: action.layout};
    case 'SET_LINKING':
      if (action.id && !findNode(state.root, action.id)) return state;
      return {
        ...state,
        linkingFrom: action.id,
        editing: action.id ? null : state.editing,
      };
    case 'UNDO': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return reconcile({
        ...state,
        past: state.past.slice(0, -1),
        ...previous,
        future: [snapshot(state), ...state.future],
        editing: null,
      });
    }
    case 'REDO': {
      const [next, ...future] = state.future;
      if (!next) return state;
      return reconcile({
        ...state,
        past: [...state.past, snapshot(state)],
        ...next,
        future,
        editing: null,
      });
    }
    case 'SELECT':
      if (state.selectedId === action.id || !findNode(state.root, action.id)) {
        return state;
      }
      return {...state, selectedId: action.id, editing: null};
    case 'START_EDIT':
      if (!findNode(state.root, action.id)) return state;
      return {
        ...state,
        selectedId: action.id,
        editing: {id: action.id, initialText: action.initialText},
      };
    case 'STOP_EDIT':
      return state.editing ? {...state, editing: null} : state;
    case 'OPEN_RICH_EDITOR':
      return {...state, richEditorId: action.id, editing: null};
    case 'SET_GENERATING': {
      const without = state.generatingIds.filter((id) => id !== action.id);
      return {
        ...state,
        generatingIds: action.generating ? [...without, action.id] : without,
      };
    }
  }
}

const snapshot = ({root, links}: StoreState): Snapshot => ({root, links});

function fromDocument(doc: MindMapDocument): StoreState {
  return {
    past: [],
    root: doc.root,
    links: doc.links,
    future: [],
    context: doc.context,
    layout: doc.layout,
    linkingFrom: null,
    selectedId: doc.root.id,
    editing: null,
    richEditorId: null,
    generatingIds: [],
  };
}

function init(): StoreState {
  return fromDocument(
    loadMindMapFromLocalStorage() ?? createDocument(createRoot()),
  );
}

/** Sets freeform positions, keeping untouched nodes (and the root) as is. */
function withPositions(root: MindNode, positions?: Map<string, Point>) {
  let next = root;
  positions?.forEach((position, id) => {
    next = updateNode(next, id, (node) =>
      node.position?.x === position.x && node.position?.y === position.y
        ? node
        : {...node, position},
    );
  });
  return next;
}

/** Returns the node and its parent, or null for the root / missing nodes. */
function withParent(root: MindNode, id: string) {
  const node = findNode(root, id);
  const parent = node && getParent(root, node);
  if (!node || !parent) return null;
  const index = parent.children.findIndex((c) => c.id === id);
  return {node, parent, index};
}

export function useMindMapStore() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const {root, links, context, layout} = state;

  // Persist (debounced) whenever the map changes.
  useEffect(() => {
    const timeout = setTimeout(
      () => saveMindMapToLocalStorage({root, links, context, layout}),
      300,
    );
    return () => clearTimeout(timeout);
  }, [root, links, context, layout]);

  // Every action is expressed against the *current* reducer state, so these
  // callbacks are stable and never act on a stale tree.
  const actions = useMemo(() => {
    const apply = (fn: (state: StoreState) => Commit | null) =>
      dispatch({type: 'APPLY', fn});

    const addChild = (parentId: string) =>
      apply(({root}) => {
        if (!findNode(root, parentId)) return null;
        const node = createNode(parentId);
        return {
          root: insertChildren(root, parentId, [node]),
          selectedId: node.id,
          editId: node.id,
        };
      });

    return {
      addChild,

      /** Adds a sibling below `id` (or a child, when `id` is the root). */
      addSibling: (id: string) =>
        apply(({root}) => {
          const found = withParent(root, id);
          if (!found) {
            const node = createNode(id);
            return {
              root: insertChildren(root, id, [node]),
              selectedId: node.id,
              editId: node.id,
            };
          }
          // A sibling looks like its neighbour: Enter on a class adds a class,
          // on a floating node another floating node.
          const {node} = found;
          const sibling: MindNode = {
            ...createNode(found.parent.id),
            ...(node.umlClass ? {umlClass: createUmlClass()} : {}),
            ...(node.shape ? {shape: node.shape} : {}),
            ...(node.floating ? {floating: true} : {}),
            ...(node.position
              ? {position: {x: node.position.x, y: node.position.y + 80}}
              : {}),
          };
          return {
            root: insertChildren(
              root,
              found.parent.id,
              [sibling],
              found.index + 1,
            ),
            selectedId: sibling.id,
            editId: sibling.id,
          };
        }),

      addChildren: (parentId: string, htmls: string[]) =>
        apply(({root}) => {
          if (!findNode(root, parentId) || htmls.length === 0) return null;
          const nodes = htmls.map((html) => createNode(parentId, html));
          return {root: insertChildren(root, parentId, nodes)};
        }),

      setHtml: (id: string, html: string) =>
        apply(({root}) => {
          const node = findNode(root, id);
          if (!node || node.html === html) return null;
          return {root: updateNode(root, id, (n) => ({...n, html}))};
        }),

      /** Deletes a node and selects its next sibling, previous sibling or parent. */
      deleteNode: (id: string) =>
        apply(({root}) => {
          const found = withParent(root, id);
          if (!found) return null;
          const {parent, index} = found;
          const nextSelection =
            parent.children[index + 1] ?? parent.children[index - 1] ?? parent;
          return {root: removeNode(root, id), selectedId: nextSelection.id};
        }),

      /**
       * Moves a node under a new parent. `floating` (only meaningful for the
       * root's children) says whether it then stands on its own. `positions`
       * are freeform positions stored in the same undo step.
       */
      move: (
        id: string,
        parentId: string,
        index?: number,
        floating = false,
        positions?: Map<string, Point>,
      ) =>
        apply(({root}) => {
          const moved = moveNode(root, id, parentId, index);
          if (moved === root) return null; // invalid move
          return {
            root: updateNode(withPositions(moved, positions), id, (node) => {
              const next = {...node};
              if (floating && parentId === root.id) next.floating = true;
              else delete next.floating;
              return next;
            }),
            selectedId: id,
          };
        }),

      /**
       * Adds a node at a spot on the canvas: inside `parentId` (a container),
       * or unconnected when that's null. `position` is its freeform position;
       * `positions` are other freeform positions stored in the same step.
       */
      addNodeAt: (
        parentId: string | null,
        position?: Point,
        positions?: Map<string, Point>,
      ) =>
        apply(({root}) => {
          const parent = parentId ?? root.id;
          if (!findNode(root, parent)) return null;
          const node: MindNode = {
            ...createNode(parent),
            ...(parentId === null ? {floating: true} : {}),
            ...(position ? {position} : {}),
          };
          return {
            root: insertChildren(withPositions(root, positions), parent, [
              node,
            ]),
            selectedId: node.id,
            editId: node.id,
          };
        }),

      /** Detaches a node (and its branch) from its parent so it floats. */
      detach: (id: string) =>
        apply(({root}) => {
          const node = findNode(root, id);
          if (!node?.parentId || node.floating) return null;
          const moved = moveNode(root, id, root.id);
          return {
            root: updateNode(moved, id, (n) => ({...n, floating: true})),
            selectedId: id,
          };
        }),

      /** Stores freeform positions, as one undoable step. */
      setPositions: (positions: Map<string, Point>) =>
        apply(({root}) => ({root: withPositions(root, positions)})),

      /** Forgets all freeform positions, so the map is arranged automatically. */
      clearPositions: () =>
        apply(({root}) => {
          const walk = (node: MindNode): MindNode => {
            const children = node.children.map(walk);
            const changed =
              !!node.position ||
              children.some((c, i) => c !== node.children[i]);
            if (!changed) return node;
            const next = {...node, children};
            delete next.position;
            return next;
          };
          return {root: walk(root)};
        }),

      /** Draws the node as `shape`, as a class, or (null) as a plain topic. */
      setShape: (id: string, shape: NodeShape | 'class' | null) =>
        apply(({root}) => {
          const node = findNode(root, id);
          if (!node) return null;
          return {
            root: updateNode(root, id, (n) => {
              const next = {...n};
              delete next.shape;
              if (shape === 'class') {
                next.umlClass = n.umlClass ?? createUmlClass();
              } else {
                delete next.umlClass;
                if (shape) next.shape = shape;
              }
              return next;
            }),
          };
        }),

      /** Moves a node up (-1) or down (+1) among its siblings. */
      reorder: (id: string, delta: -1 | 1) =>
        apply(({root}) => {
          const found = withParent(root, id);
          if (!found) return null;
          const target = found.index + delta;
          if (target < 0 || target >= found.parent.children.length) return null;
          return {root: moveNode(root, id, found.parent.id, target)};
        }),

      toggleCollapsed: (id: string, collapsed?: boolean) =>
        apply(({root, selectedId}) => {
          const node = findNode(root, id);
          if (!node || node.children.length === 0) return null;
          const next = collapsed ?? !node.collapsed;
          if (next === !!node.collapsed) return null;
          // Don't leave the selection hidden inside a collapsed branch.
          const hidesSelection = next && isAncestorOf(node, selectedId);
          return {
            root: setCollapsed(root, id, next),
            selectedId: hidesSelection ? id : undefined,
          };
        }),

      setAllCollapsed: (collapsed: boolean) =>
        apply(({root, selectedId}) => {
          const next = setAllCollapsed(root, collapsed);
          return collapsed
            ? {root: next, selectedId: root.id}
            : {root: revealNode(next, selectedId)};
        }),

      /**
       * Turns a node into a class box or updates its members (and optionally
       * its name) in one step; `null` turns it back into a plain topic.
       */
      setUmlClass: (id: string, umlClass: UmlClass | null, html?: string) =>
        apply(({root}) => {
          if (!findNode(root, id)) return null;
          return {
            root: updateNode(root, id, (node) => {
              const next = {...node, html: html ?? node.html};
              if (umlClass) next.umlClass = umlClass;
              else delete next.umlClass;
              return next;
            }),
          };
        }),

      /** Expands collapsed branches so all of these nodes are visible. */
      reveal: (ids: string[]) =>
        apply(({root}) => ({
          root: ids.reduce((tree, id) => revealNode(tree, id), root),
        })),

      addLink: (from: string, to: string, kind: LinkKind = 'relation') =>
        apply(({root, links}) => {
          if (from === to || !findNode(root, from) || !findNode(root, to)) {
            return null;
          }
          if (hasLink(links, from, to, kind)) return null;
          return {root, links: [...links, createLink(from, to, kind)]};
        }),

      updateLink: (id: string, patch: Partial<Omit<MindLink, 'id'>>) =>
        apply(({root, links}) => {
          const link = links.find((l) => l.id === id);
          if (!link) return null;
          const next = {...link, ...patch};
          if (
            (Object.keys(patch) as (keyof typeof patch)[]).every(
              (key) => link[key] === next[key],
            )
          ) {
            return null;
          }
          return {root, links: links.map((l) => (l.id === id ? next : l))};
        }),

      removeLink: (id: string) =>
        apply(({root, links}) =>
          links.some((l) => l.id === id)
            ? {root, links: links.filter((l) => l.id !== id)}
            : null,
        ),

      /** Applies AI output as a single undoable step. */
      applyGeneration: (generation: Generation) =>
        apply(({root, links}) => applyGeneration(root, links, generation)),

      setContext: (context: string) => dispatch({type: 'SET_CONTEXT', context}),
      setLayout: (layout: LayoutKind) => dispatch({type: 'SET_LAYOUT', layout}),
      startLinking: (id: string) => dispatch({type: 'SET_LINKING', id}),
      stopLinking: () => dispatch({type: 'SET_LINKING', id: null}),
      replace: (doc: MindMapDocument) => dispatch({type: 'REPLACE', doc}),
      undo: () => dispatch({type: 'UNDO'}),
      redo: () => dispatch({type: 'REDO'}),
      select: (id: string) => dispatch({type: 'SELECT', id}),
      startEditing: (id: string, initialText?: string) =>
        dispatch({type: 'START_EDIT', id, initialText}),
      stopEditing: () => dispatch({type: 'STOP_EDIT'}),
      openRichEditor: (id: string | null) =>
        dispatch({type: 'OPEN_RICH_EDITOR', id}),
      setGenerating: (id: string, generating: boolean) =>
        dispatch({type: 'SET_GENERATING', id, generating}),
    };
  }, []);

  return {
    state: {
      root,
      links,
      context,
      layout,
      linkingFrom: state.linkingFrom,
      selectedId: state.selectedId,
      editing: state.editing,
      richEditorId: state.richEditorId,
      generatingIds: state.generatingIds,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    },
    actions,
  };
}

export type MindMapState = ReturnType<typeof useMindMapStore>['state'];
export type MindMapActions = ReturnType<typeof useMindMapStore>['actions'];
