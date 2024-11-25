import {ReactNode, useMemo, useReducer, useCallback} from 'react';
import Tree from '.';
import {createNewNode} from '../Node';

enum TreeAction {
  insert = 'INSERT',
  editNodeHtml = 'EDIT_HTML',
  deleteNode = 'DELETE_NODE',
}

type treeReducerValue = {
  parentId?: string;
  id?: string;
  content?: ReactNode;
  htmlContent?: string;
};

type reducerAction = (value: treeReducerValue) => void;

interface TreeReducerTypes {
  action: TreeAction;
  value: treeReducerValue;
}

function treeReducer(tree: Tree, {action, value}: TreeReducerTypes): Tree {
  // Create a new tree only if the structure changes
  if (action === TreeAction.insert || action === TreeAction.deleteNode) {
    if (action === TreeAction.insert && value.parentId) {
      const parentNode = tree.findNodeById(value.parentId);
      parentNode?.insertChild(createNewNode(value.parentId, value.htmlContent ?? ''));
    }

    if (action === TreeAction.deleteNode) {
      tree.deleteChild(value.id ?? '');
    }
    
    return new Tree(tree.state);
  }

  // For content edits, create a new tree with the same state to trigger rerender
  if (action === TreeAction.editNodeHtml) {
    const node = tree.findNodeById(value.id ?? '');
    if (node) {
      node.htmlContent = value.htmlContent ?? '';
      // Create new tree instance but keep the same state structure
      return new Tree({...tree.state});
    }
  }

  return tree;
}

export class TreeService {
  tree: Tree;
  insertNode: reducerAction;
  editNodeHtml: reducerAction;
  deleteNode: reducerAction;

  constructor(tree: Tree) {
    this.tree = tree;
  }
}

export default function useTreeService() {
  const initialTree = new Tree();
  const [tree, dispatch] = useReducer(treeReducer, initialTree);

  const insertNode = useCallback((value: treeReducerValue) => 
    dispatch({action: TreeAction.insert, value}), [dispatch]);
    
  const editNodeHtml = useCallback((value: treeReducerValue) => 
    dispatch({action: TreeAction.editNodeHtml, value}), [dispatch]);
    
  const deleteNode = useCallback((value: treeReducerValue) => 
    dispatch({action: TreeAction.deleteNode, value}), [dispatch]);

  const treeService = useMemo(() => {
    const service = new TreeService(tree);
    service.insertNode = insertNode;
    service.editNodeHtml = editNodeHtml;
    service.deleteNode = deleteNode;
    return service;
  }, [tree, insertNode, editNodeHtml, deleteNode]);

  return {
    treeService
  };
}
