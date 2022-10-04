import {ReactNode} from 'react';
import {v4 as uuidv4} from 'uuid';

export function createNewNode(parentId: string, htmlContent: string) {
  return new Node({
    parentId,
    htmlContent,
    id: uuidv4(),
    children: [],
  });
}

export type NodeJson = {
  id: string;
  parentId: string | null;
  children: Node[];
  htmlContent: string;
};

export default class Node {
  id: string;
  parentId: string | null;
  children: Node[];
  content: ReactNode;
  htmlContent: string;

  constructor({id, children, parentId, htmlContent}: NodeJson) {
    this.id = id;
    this.parentId = parentId;
    this.children = children;
    this.htmlContent = htmlContent ?? '';
  }

  insertChild(child: Node) {
    if (this.children.every((node) => node.id !== child.id)) {
      this.children.push(child);
    }
  }
}
