import {TreeNode} from '@/domain/TreeNode';
import {TreeState} from '@/domain/Tree';

export function getMindMapContextForNode(
  tree: TreeState,
  node: TreeNode,
): string {
  const getPrefix = (depth: number, isLast: boolean): string => {
    if (depth === 0) return '';
    const indent = '│   '.repeat(depth - 1);
    return indent + (isLast ? '└── ' : '├── ');
  };

  const buildTreeText = (
    currentNode: TreeNode,
    depth = 0,
    parentStack: boolean[] = [],
  ): string => {
    let result = '';

    // Add the current node
    const prefix = getPrefix(depth, true);
    result += `${prefix}${currentNode.text}\n`;

    // If we've reached our target node, add an indicator line for child insertion
    if (currentNode.id === node.id) {
      const childPrefix = getPrefix(depth + 1, true);
      result += `${childPrefix}[New nodes will be added here]\n`;
    }

    // Process children
    const children = currentNode.children;
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const newParentStack = [...parentStack, !isLast];

      // Add vertical lines for non-last items
      result += buildTreeText(child, depth + 1, newParentStack);
    });
    console.log(result);
    return result;
  };

  return buildTreeText(tree.root).trimEnd();
}
