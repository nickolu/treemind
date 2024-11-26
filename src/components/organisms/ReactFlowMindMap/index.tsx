import { memo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,

} from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowMindMapNode } from '@/components/molecules/ReactFlowMindMapNode';
import { useTreeServiceContext } from '@/components/organisms/TreeService/useTreeServiceContext';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { TreeNode } from '@/components/molecules/TreeNode';

interface ReactFlowMindMapProps {
  treeData: TreeNode;
}

const transformTreeToFlow = (
  node: TreeNode,
  parentX = 0,
  parentY = 0,
  level = 0,
  nodes: Node[] = [],
  edges: Edge[] = []
): { nodes: Node[]; edges: Edge[] } => {
  const currentX = parentX + (level === 0 ? 0 : 250);
  const currentY = parentY;

  const flowNode: Node = {
    id: node.id,
    position: { x: currentX, y: currentY },
    data: { ...node },
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
        style: { stroke: '#333' }
      });

      transformTreeToFlow(
        child,
        currentX,
        childY,
        level + 1,
        nodes,
        edges
      );

      childY += spacing;
    });
  }

  return { nodes, edges };
};

const nodeTypes = {
  mindMapNode: memo(ReactFlowMindMapNode),
};

function useMindMapKeyboardEvents() {
  const treeService = useTreeServiceContext();
  const { selectedNodeId, setSelectedNodeId, isNodeBeingEdited, setIsNodeBeingEdited } = useMindMapStateContext();

  const selectedNode = treeService.getNodeById(selectedNodeId ?? '');
  const selectedParentNodeId = selectedNode?.parentId ?? treeService.tree.root.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isNodeBeingEdited || !selectedNode) {
          setIsNodeBeingEdited(false);
        }
        if (selectedNode) {
          const newNode = treeService.insertNode(selectedNode.id, '<div>hello world</div>');
          setSelectedNodeId(newNode.id);
        }
      }

      else if (e.key === 'Enter') {
        if (selectedParentNodeId) {
          e.preventDefault();
          const newNode = treeService.insertNode(selectedParentNodeId, '<div>hello world</div>');
          setSelectedNodeId(newNode.id);
        }
      }

      else if (e.key === 'Delete') {
        if (selectedNode) {
          e.preventDefault();
          treeService.deleteNode(selectedNode.id);
          setSelectedNodeId(selectedParentNodeId);
        }
      }

      else {
        setIsNodeBeingEdited(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedNode, selectedParentNodeId, isNodeBeingEdited, setIsNodeBeingEdited, setSelectedNodeId, treeService]);
}

export function ReactFlowMindMap({ treeData }: ReactFlowMindMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = transformTreeToFlow(treeData);
  const { selectedNodeId } = useMindMapStateContext();

  console.log('ReactFlowMindMap selectedNodeId', selectedNodeId);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const stringifiedTreeData = JSON.stringify(treeData);

  useMindMapKeyboardEvents();

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = transformTreeToFlow(treeData);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [stringifiedTreeData, setNodes, setEdges, treeData]);

  const onInit = useCallback(() => null, []);

  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid #ddd' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#333', strokeWidth: 2 }
        }}
        connectionMode={ConnectionMode.Strict}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}