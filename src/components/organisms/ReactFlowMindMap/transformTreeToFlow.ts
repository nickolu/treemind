import {Node, Edge} from 'reactflow';
import {TreeNode} from '@/components/molecules/TreeNode';

export const transformTreeToFlow = (
  node: TreeNode,
  parentX = 0,
  parentY = 0,
  level = 0,
  nodes: Node[] = [],
  edges: Edge[] = [],
): {nodes: Node[]; edges: Edge[]} => {
  const currentX = parentX + (level === 0 ? 0 : 250);
  const currentY = parentY;

  const flowNode: Node = {
    id: node.id,
    position: {x: currentX, y: currentY},
    data: {...node},
    type: 'mindMapNode',
  };
  nodes.push(flowNode);

  if (node.children) {
    const spacing = 100;
    const totalHeight = (node.children.length - 1) * spacing;
    let childY = currentY - totalHeight / 2;

    node.children.forEach((child) => {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        sourceHandle: 'right',
        targetHandle: 'left',
        style: {stroke: '#333'},
      });

      transformTreeToFlow(child, currentX, childY, level + 1, nodes, edges);

      childY += spacing;
    });
  }

  return {nodes, edges};
};
