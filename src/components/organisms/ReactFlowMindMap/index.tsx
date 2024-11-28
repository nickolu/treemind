"use client";
import { memo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowMindMapNode } from '@/components/molecules/ReactFlowMindMapNode';
import { TreeNode } from '@/components/molecules/TreeNode';
import { useMindMapKeyboardEvents } from '@/components/molecules/MindMapKeyboardEvents/useMindMapKeyboardEvents';
import { transformTreeToFlow } from './transformTreeToFlow';
import { Box } from '@mui/material';
import { MindMapLegend } from '@/components/molecules/MindMapLegend';

interface ReactFlowMindMapProps {
  treeData: TreeNode;
}

const nodeTypes = {
  mindMapNode: memo(ReactFlowMindMapNode),
};

export function ReactFlowMindMap({ treeData }: ReactFlowMindMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = transformTreeToFlow(treeData);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const stringifiedTreeData = JSON.stringify(treeData);

  // Function to get all descendant node IDs for a given node
  const getDescendantIds = useCallback((nodeId: string): string[] => {
    const childEdges = edges.filter(edge => edge.source === nodeId);
    const childIds = childEdges.map(edge => edge.target);
    const descendantIds = [...childIds];

    childIds.forEach(childId => {
      descendantIds.push(...getDescendantIds(childId));
    });

    return descendantIds;
  }, [edges]);

  // Handle node movement to include subtree
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: TreeNode) => {
    const descendantIds = getDescendantIds(node.id);
    const draggedNode = nodes.find(n => n.id === node.id);
    if (!draggedNode) return;

    // Calculate the change in position
    const dx = draggedNode.position.x - initialNodes.find(n => n.id === node.id)!.position.x;
    const dy = draggedNode.position.y - initialNodes.find(n => n.id === node.id)!.position.y;

    // Update positions of all descendant nodes
    setNodes(nds =>
      nds.map(n => {
        if (descendantIds.includes(n.id)) {
          return {
            ...n,
            position: {
              x: n.position.x + dx,
              y: n.position.y + dy,
            },
          };
        }
        return n;
      })
    );
  }, [nodes, edges, initialNodes, getDescendantIds, setNodes]);

  useMindMapKeyboardEvents();

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = transformTreeToFlow(treeData);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.2 });
    }, 0);
  }, [stringifiedTreeData, setNodes, setEdges, treeData, reactFlowInstance]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', border: '1px solid #ddd' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
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
        <MindMapLegend />
      </ReactFlow>
    </Box>
  );
}