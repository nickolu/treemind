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
} from '@/domain/MindMap/tree';
import {
  loadMindMapFromLocalStorage,
  saveMindMapToLocalStorage,
} from '@/app/utils/localStorageOperations';

const HISTORY_LIMIT = 100;

/**
 * Single source of truth for the mind map: the tree (with undo history) plus
 * the UI state that depends on it. React Flow nodes are *derived* from this,
 * never stored separately, so the two can't drift apart.
 */
interface StoreState {
  past: MindNode[];
  root: MindNode;
  future: MindNode[];
  selectedId: string;
  /** Node being edited inline; `initialText` replaces its text when set. */
  editing: {id: string; initialText?: string} | null;
  /** Node open in the rich-text editor modal. */
  richEditorId: string | null;
  generatingIds: string[];
}

/** Result of a tree edit: the new root plus optional selection changes. */
interface Commit {
  root: MindNode;
  selectedId?: string;
  editId?: string;
}

type Action =
  | {type: 'APPLY'; fn: (state: StoreState) => Commit | null}
  | {type: 'REPLACE'; root: MindNode}
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
  };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'APPLY': {
      const commit = action.fn(state);
      if (!commit) return state;
      const changed = commit.root !== state.root;
      if (!changed && !commit.selectedId) return state;
      return reconcile({
        ...state,
        past: changed
          ? [...state.past, state.root].slice(-HISTORY_LIMIT)
          : state.past,
        root: commit.root,
        future: changed ? [] : state.future,
        selectedId: commit.selectedId ?? state.selectedId,
        editing: commit.editId ? {id: commit.editId} : state.editing,
      });
    }
    case 'REPLACE':
      return {
        past: [],
        root: action.root,
        future: [],
        selectedId: action.root.id,
        editing: null,
        richEditorId: null,
        generatingIds: [],
      };
    case 'UNDO': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return reconcile({
        ...state,
        past: state.past.slice(0, -1),
        root: previous,
        future: [state.root, ...state.future],
        editing: null,
      });
    }
    case 'REDO': {
      const [next, ...future] = state.future;
      if (!next) return state;
      return reconcile({
        ...state,
        past: [...state.past, state.root],
        root: next,
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

function init(): StoreState {
  const root = loadMindMapFromLocalStorage() ?? createRoot();
  return {
    past: [],
    root,
    future: [],
    selectedId: root.id,
    editing: null,
    richEditorId: null,
    generatingIds: [],
  };
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
  const {root} = state;

  // Persist (debounced) whenever the tree changes.
  useEffect(() => {
    const timeout = setTimeout(() => saveMindMapToLocalStorage(root), 300);
    return () => clearTimeout(timeout);
  }, [root]);

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
          const sibling = createNode(found.parent.id);
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

      move: (id: string, parentId: string, index?: number) =>
        apply(({root}) => ({
          root: moveNode(root, id, parentId, index),
          selectedId: id,
        })),

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

      replace: (next: MindNode) => dispatch({type: 'REPLACE', root: next}),
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
