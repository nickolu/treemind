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

  useMindMapKeyboardEvents();

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = transformTreeToFlow(treeData);
    setNodes(newNodes);
    setEdges(newEdges);
    // Center the view after nodes are updated
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
    </Box>
  );
}