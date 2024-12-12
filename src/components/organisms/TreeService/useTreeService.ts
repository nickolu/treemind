'use client';
import {useCallback, useReducer} from 'react';
import {TreeNode} from '@/domain/TreeNode';
import {TreeState} from '@/domain/Tree';
import {loadMindMapFromLocalStorage} from '@/app/utils/localStorageOperations';

enum TreeAction {
  INSERT = 'INSERT',
  EDIT_HTML = 'EDIT_HTML',
  DELETE = 'DELETE',
}

interface TreeReducerValue {
  id: string;
  parentId: string | null;
  html: string;
}

type TreeActionType = {
  type: TreeAction;
  payload: TreeReducerValue;
};

function treeReducer(state: TreeState, action: TreeActionType): TreeState {
  switch (action.type) {
    case TreeAction.INSERT: {
      const {id, parentId, html} = action.payload;

      const newNode = new TreeNode({
        id,
        parentId,
        html,
        children: [],
      });

      const cloneWithInsert = (node: TreeNode): TreeNode => {
        if (node.id === parentId) {
          return new TreeNode({
            ...node,
            children: [...node.children, newNode],
            html: node.html,
          });
        }

        return new TreeNode({
          ...node,
          children: node.children.map(child => cloneWithInsert(child)),
          html: node.html,
        });
      };

      return {
        ...state,
        root: cloneWithInsert(state.root),
      };
    }

    case TreeAction.EDIT_HTML: {
      const {id, html} = action.payload;

      const cloneWithEdit = (node: TreeNode): TreeNode => {
        if (node.id === id) {
          return new TreeNode({
            ...node,
            html,
            children: [...node.children],
          });
        }

        return new TreeNode({
          ...node,
          children: node.children.map(child => cloneWithEdit(child)),
          html: node.html,
        });
      };

      return {
        ...state,
        root: cloneWithEdit(state.root),
      };
    }

    case TreeAction.DELETE: {
      const {id} = action.payload;

      const cloneWithoutNode = (node: TreeNode): TreeNode => {
        return new TreeNode({
          ...node,
          children: node.children
            .filter(child => child.id !== id)
            .map(child => cloneWithoutNode(child)),
          html: node.html,
        });
      };

      return {
        ...state,
        root: cloneWithoutNode(state.root),
      };
    }

    default:
      return state;
  }
}

const getInitialState = (): TreeState => {
  if (typeof window === 'undefined') {
    return {
      root: new TreeNode({
        id: '1',
        parentId: null,
        html: 'Root Node',
        children: [],
      }),
    };
  }
  
  return {
    root:
      loadMindMapFromLocalStorage() ||
      new TreeNode({
        id: '1',
        parentId: null,
        html: 'Root Node',
        children: [],
      }),
  };
};

export function useTreeService(): TreeService {
  const [state, dispatch] = useReducer(treeReducer, getInitialState());

  const getNodeById = useCallback(
    (id: string): TreeNode | undefined => {
      const findNode = (node: TreeNode): TreeNode | undefined => {
        if (node.id === id) {
          return node;
        }

        for (const child of node.children) {
          const found = findNode(child);
          if (found) {
            return found;
          }
        }

        return undefined;
      };

      return findNode(state.root);
    },
    [state.root],
  );

  const findNodeIndex = useCallback(
    (node: TreeNode): number => {
      const parent = getNodeById(node.parentId ?? '');

      if (parent) {
        return parent.children.findIndex((n) => n.id === node.id);
      }
      return -1;
    },
    [getNodeById],
  );

  const insertNode = useCallback(
    (parentId: string, html: string) => {
      const newNode = new TreeNode({
        parentId,
        html,
        children: [],
      });
      dispatch({
        type: TreeAction.INSERT,
        payload: newNode,
      });
      return newNode;
    },
    [dispatch],
  );

  const editNodeHtml = useCallback(
    (nodeId: string, html: string) => {
      dispatch({
        type: TreeAction.EDIT_HTML,
        payload: {id: nodeId, parentId: null, html},
      });
    },
    [dispatch],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      dispatch({
        type: TreeAction.DELETE,
        payload: {id: nodeId, parentId: null, html: ''},
      });
    },
    [dispatch],
  );

  const getParentNode = useCallback(
    (node: TreeNode) => {
      if (node.parentId) return getNodeById(node.parentId) as TreeNode;
      return state.root;
    },
    [state.root, getNodeById],
  );

  return {
    tree: state,
    getNodeById,
    getParentNode,
    findNodeIndex,
    insertNode,
    editNodeHtml,
    deleteNode,
  };
}
export interface TreeService {
  tree: TreeState;
  insertNode: (parentId: string, html: string) => TreeNode;
  editNodeHtml: (nodeId: string, html: string) => void;
  deleteNode: (nodeId: string) => void;
  getNodeById: (nodeId: string) => TreeNode | undefined;
  getParentNode: (node: TreeNode) => TreeNode;
  findNodeIndex: (node: TreeNode) => number;
}
