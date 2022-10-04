import {ReactNode, useReducer} from 'react';
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

interface TreeReducerTypes {
  action: TreeAction;
  value: treeReducerValue;
}

function treeReducer(tree: Tree, {action, value}: TreeReducerTypes): Tree {
  if (action === TreeAction.insert) {
    if (value.parentId) {
      const parentNode = tree.findNodeById(value.parentId);

      parentNode?.insertChild(
        createNewNode(value.parentId, value.htmlContent ?? '')
      );
    }
  }

  if (action === TreeAction.editNodeHtml) {
    const node = tree.findNodeById(value.id ?? '');
    if (node) {
      node.htmlContent = value.htmlContent ?? '';
    }
  }

  if (action === TreeAction.deleteNode) {
    tree.deleteNode(value.id ?? '');
  }

  return new Tree(tree.state);
}

type reducerAction = (value: treeReducerValue) => void;

export type TreeApi = {
  insertNode: reducerAction;
  editNodeHtml: reducerAction;
  deleteNode: reducerAction;
};

export default function useTreeReducer() {
  const initialTree = new Tree();
  const [tree, dispatch] = useReducer(treeReducer, initialTree);

  function insertNode(value: treeReducerValue) {
    console.log('inserting', value);
    dispatch({action: TreeAction.insert, value});
  }

  function editNodeHtml(value: treeReducerValue) {
    dispatch({action: TreeAction.editNodeHtml, value});
  }

  function deleteNode(value: treeReducerValue) {
    dispatch({action: TreeAction.deleteNode, value});
  }

  const treeApi: TreeApi = {
    insertNode,
    editNodeHtml,
    deleteNode,
  };

  return {tree, treeApi};
}
