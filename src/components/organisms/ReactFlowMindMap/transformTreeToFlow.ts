import {Node, Edge} from 'reactflow';
import {TreeNode} from '@/domain/TreeNode';

// Calculate the height needed for a subtree
const calculateSubtreeHeight = (node: TreeNode): number => {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  // Count total number of leaf nodes in subtree
  return node.children.reduce(
    (sum, child) => sum + calculateSubtreeHeight(child),
    0,
  );
};

const MIN_VERTICAL_SPACING = 70; // Increased minimum spacing between nodes

// Get the average vertical spacing between siblings
const getAverageSiblingSpacing = (nodes: Node[], parentId: string): number => {
  const siblingNodes = nodes.filter((node) => node.data.parentId === parentId);
  if (siblingNodes.length <= 1) return MIN_VERTICAL_SPACING;

  let totalSpacing = 0;
  let spacingCount = 0;

  for (let i = 1; i < siblingNodes.length; i++) {
    const spacing = Math.abs(
      siblingNodes[i].position.y - siblingNodes[i - 1].position.y,
    );
    totalSpacing += spacing;
    spacingCount++;
  }

  return spacingCount > 0 ? totalSpacing / spacingCount : MIN_VERTICAL_SPACING;
};

export const transformTreeToFlow = (
  node: TreeNode,
  parentX = 0,
  parentY = 0,
  level = 0,
  nodes: Node[] = [],
  edges: Edge[] = [],
  useAutoLayout = true,
  existingNodes: Node[] = [],
): {nodes: Node[]; edges: Edge[]} => {
  if (!node) {
    console.warn('Received undefined node in transformTreeToFlow');
    return {nodes, edges};
  }

  // Increase horizontal spacing for deeper levels
  const levelSpacing = Math.min(180 + level * 20, 300);
  const currentX = parentX + (level === 0 ? 0 : levelSpacing);
  let currentY = parentY;

  // If not using auto-layout and this node exists, preserve its position
  const existingNode = existingNodes.find((n) => n.id === node.id);
  if (!useAutoLayout && existingNode) {
    currentY = existingNode.position.y;
  }

  const flowNode: Node = {
    id: node.id,
    position: {x: currentX, y: currentY},
    data: {...node},
    type: 'mindMapNode',
  };
  nodes.push(flowNode);

  if (node.children && node.children.length > 0) {
    if (useAutoLayout) {
      // Auto-layout mode: Calculate positions for all children
      const totalSubtreeHeight = node.children.reduce(
        (sum, child) => sum + calculateSubtreeHeight(child),
        0,
      );

      // Calculate total vertical space needed
      const spacing = MIN_VERTICAL_SPACING;
      const totalVerticalSpace = (totalSubtreeHeight - 1) * spacing;

      // Start position for first child, centered relative to parent
      let childY = currentY - totalVerticalSpace / 2;

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

        // Position child and its subtree
        transformTreeToFlow(
          child,
          currentX,
          childY,
          level + 1,
          nodes,
          edges,
          useAutoLayout,
          existingNodes,
        );

        // Move to next position based on child's subtree height
        childY += calculateSubtreeHeight(child) * spacing;
      });
    } else {
      // Manual layout mode
      const averageSpacing = getAverageSiblingSpacing(existingNodes, node.id);
      let lastChildY = currentY;

      const existingChildren = existingNodes.filter(
        (n) => n.data.parentId === node.id,
      );
      if (existingChildren.length > 0) {
        lastChildY = Math.max(...existingChildren.map((n) => n.position.y));
      }

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

        const existingChild = existingNodes.find((n) => n.id === child.id);
        const childY = existingChild
          ? existingChild.position.y
          : lastChildY + averageSpacing;

        transformTreeToFlow(
          child,
          currentX,
          childY,
          level + 1,
          nodes,
          edges,
          useAutoLayout,
          existingNodes,
        );

        if (!existingChild) {
          lastChildY = childY;
        }
      });
    }
  }

  return {nodes, edges};
};
