import Node from '../Node';

export interface TreeState {
  root: Node;
}

export default class Tree {
  treeState: TreeState;

  constructor(treeState?: TreeState) {
    this.treeState = treeState ?? {
      root: new Node({
        id: 'root',
        children: [],
        parentId: null,
        htmlContent: '<div>Root Node</div>',
      }),
    };
  }

  findNodeById(id: string, root = this.root) {
    if (root.id === id) {
      return root;
    }

    if (root.children.length === 0) {
      return null;
    }

    let resolvedNode: null | Node = null;

    root.children.forEach((child) => {
      if (resolvedNode === null) {
        if (child.id === id) {
          resolvedNode = child;
        } else {
          resolvedNode = this.findNodeById(id, child);
        }
      }
    });

    return resolvedNode;
  }

  deleteChild(id: string) {
    const node = this.findNodeById(id);
    if (node) {
      const nodeParent = this.findNodeById(node.parentId ?? '');
      if (nodeParent) {
        const nodeIndex = nodeParent.children.findIndex(
          (node: Node) => node.id === id
        );
        
        if (nodeIndex !== -1) {
          nodeParent.children.splice(nodeIndex, 1); 
        }
      }
    }
  }

  get children() {
    return this.root.children;
  }

  get root() {
    return this.state.root;
  }

  get state() {
    return this.treeState;
  }
}
