import {MindNode} from '@/domain/MindMap/tree';
import {htmlToText} from '@/domain/MindMap/html';
import {NEW_NODES_MARKER} from './aiConstants';

/**
 * Renders the whole map as an ASCII tree for the AI prompt, with a marker
 * under the node that new children will be added to.
 */
export function getMindMapContextForNode(root: MindNode, targetId: string) {
  const lines: string[] = [];

  const walk = (node: MindNode, prefix: string, childPrefix: string) => {
    const text = htmlToText(node.html).replace(/\s+/g, ' ') || '(empty)';
    lines.push(`${prefix}${text}`);
    const entries: string[] = node.children.map((c) => c.id);
    if (node.id === targetId) entries.push(NEW_NODES_MARKER);
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const nextChildPrefix = childPrefix + (isLast ? '    ' : '│   ');
      const child = node.children.find((c) => c.id === entry);
      if (child) {
        walk(child, childPrefix + branch, nextChildPrefix);
      } else {
        lines.push(`${childPrefix}${branch}${entry}`);
      }
    });
  };

  walk(root, '', '');
  return lines.join('\n');
}
