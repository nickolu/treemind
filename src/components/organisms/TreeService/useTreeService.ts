import {useCallback, useReducer} from 'react';
import {TreeService} from '@/types/tree';
import {TreeNode} from '@/components/molecules/TreeNode';

enum TreeAction {
  INSERT = 'INSERT',
  EDIT_HTML = 'EDIT_HTML',
  DELETE = 'DELETE',
}

interface TreeState {
  root: TreeNode;
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

      const insertIntoNode = (node: TreeNode): boolean => {
        if (node.id === parentId) {
          node.insertChild(newNode);
          return true;
        }

        for (const child of node.children) {
          if (insertIntoNode(child)) {
            return true;
          }
        }

        return false;
      };

      insertIntoNode(state.root);
      return {...state};
    }

    case TreeAction.EDIT_HTML: {
      const {id, html} = action.payload;

      const editNode = (node: TreeNode): boolean => {
        if (node.id === id) {
          node.html = html;
          return true;
        }

        for (const child of node.children) {
          if (editNode(child)) {
            return true;
          }
        }

        return false;
      };

      editNode(state.root);
      return {...state};
    }

    case TreeAction.DELETE: {
      const {id} = action.payload;

      const deleteFromNode = (node: TreeNode): boolean => {
        const index = node.children.findIndex((child) => child.id === id);

        if (index !== -1) {
          node.children.splice(index, 1);
          return true;
        }

        for (const child of node.children) {
          if (deleteFromNode(child)) {
            return true;
          }
        }

        return false;
      };

      deleteFromNode(state.root);
      return {...state};
    }

    default:
      return state;
  }
}

const initialState: TreeState = {
  root: new TreeNode({
    children: [],
    parentId: null,
    html: '<div>Root Node</div>',
  }),
};

export function useTreeService(): TreeService {
  const [state, dispatch] = useReducer(treeReducer, initialState);

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

  const findNodeIndex = useCallback((node: TreeNode): number => {
    const parent = getNodeById(node.parentId ?? '');

    if (parent) {
      return parent.children.findIndex((n) => n.id === node.id);
    }
    return -1;
  }, [getNodeById]);

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

  return {
    tree: state,
    getNodeById,
    findNodeIndex,
    insertNode,
    editNodeHtml,
    deleteNode,
  };
}
