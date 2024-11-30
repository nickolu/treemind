import {parseTextFromHtml} from '@/app/utils/parseTextFromHtml';
import {v4 as uuidv4} from 'uuid';

export type TreeNodeJson = {
  id?: string;
  parentId: string | null;
  children: TreeNodeJson[];
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
    this.children = children.map((child) => new TreeNode(child));
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

  json(): TreeNodeJson {
    return {
      id: this.id,
      parentId: this.parentId,
      children: this.children.map((child) => child.json()),
      html: this._html,
    };
  }
}
