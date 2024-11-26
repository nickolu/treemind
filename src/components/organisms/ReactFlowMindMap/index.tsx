import { memo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowMindMapNode } from '@/components/molecules/ReactFlowMindMapNode';
import { TreeNode } from '@/components/molecules/TreeNode';
import { useMindMapKeyboardEvents } from '@/components/molecules/MindMapKeyboardEvents/useMindMapKeyboardEvents';
import { transformTreeToFlow } from './transformTreeToFlow';

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