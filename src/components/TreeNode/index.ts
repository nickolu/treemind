import {v4 as uuidv4} from 'uuid';

export type TreeNodeJson = {
  id?: string;
  parentId: string | null;
  children: TreeNode[];
  html: string;
};

export class TreeNode {
  id: string;
  parentId: string | null;
  children: TreeNode[];
  _html: string;

  constructor({id, children, parentId, html}: TreeNodeJson) {
    console.log('new node created with args', {id, children, parentId, html});
    this.id = id ?? uuidv4();
    this.parentId = parentId;
    this.children = children;
    this._html = html;
  }

  insertChild(child: TreeNode) {
    if (this.children.every((node) => node.id !== child.id)) {
      this.children.push(child);
    }
  }

  get html() {
    return this._html;
  }

  set html(html: string) {
    this._html = html;
  }

  get text() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this._html, 'text/html');
    return doc.body.textContent || '';
  }

  set text(text: string) {
    this._html = `<div>${text}</div>`;
  }
}
