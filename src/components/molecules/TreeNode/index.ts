import {parseTextFromHtml} from '@/components/atoms/parseTextFromHtml';
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
    return parseTextFromHtml(this._html);
  }

  set text(text: string) {
    this._html = `<div>${text}</div>`;
  }
}
