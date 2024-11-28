import {Node, Edge} from 'reactflow';
import {TreeNode} from '@/components/molecules/TreeNode';

// Calculate the height needed for a subtree
const calculateSubtreeHeight = (node: TreeNode): number => {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  // Include the current node in the height calculation
  return Math.max(
    1,
    node.children.reduce(
      (sum, child) => sum + calculateSubtreeHeight(child),
      0,
    ),
  );
};

const MIN_VERTICAL_SPACING = 70; // Increased minimum spacing between sibling nodes
const DEFAULT_NODE_HEIGHT = 50; // Default height if we can't measure the actual height

const getNodeHeight = (nodeId: string): number => {
  const element = document.querySelector(`[data-id="${nodeId}"]`);
  if (element) {
    const height = element.getAttribute('data-node-height');
    return height ? parseFloat(height) : DEFAULT_NODE_HEIGHT;
  }
  return DEFAULT_NODE_HEIGHT;
};

export const transformTreeToFlow = (
  node: TreeNode,
  parentX = 0,
  parentY = 0,
  level = 0,
  nodes: Node[] = [],
  edges: Edge[] = [],
): {nodes: Node[]; edges: Edge[]} => {
  // Increase horizontal spacing for deeper levels
  const levelSpacing = Math.min(250 + level * 30, 400);
  const currentX = parentX + (level === 0 ? 0 : levelSpacing);
  const currentY = parentY;

  const flowNode: Node = {
    id: node.id,
    position: {x: currentX, y: currentY},
    data: {...node},
    type: 'mindMapNode',
  };
  nodes.push(flowNode);

  if (node.children && node.children.length > 0) {
    // Calculate the total height needed for all children
    const childrenHeights = node.children.map(calculateSubtreeHeight);
    const totalHeight = childrenHeights.reduce(
      (sum, height) => sum + height,
      0,
    );

    // Get the actual node heights or use defaults
    const currentNodeHeight = getNodeHeight(node.id);
    const childNodeHeights = node.children.map((child) =>
      getNodeHeight(child.id),
    );

    // Calculate spacing between nodes based on actual heights
    const spacing = Math.max(
      MIN_VERTICAL_SPACING,
      Math.max(...childNodeHeights) * 1.5, // Increased spacing factor
    );

    // Calculate total vertical space needed for all children
    const totalVerticalSpace = (node.children.length - 1) * spacing;

    // Start position for first child, centered relative to parent
    let childY = currentY - totalVerticalSpace / 2;

    node.children.forEach((child, index) => {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        sourceHandle: 'right',
        targetHandle: 'left',
        style: {stroke: '#333'},
      });

      // Position the child and its subtree
      transformTreeToFlow(child, currentX, childY, level + 1, nodes, edges);

      // Move to the next child's starting position
      childY += spacing;
    });
  }

  return {nodes, edges};
};
