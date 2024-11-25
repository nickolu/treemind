import { memo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Position,
  NodeProps,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import useTreeServiceContext from '@/components/Tree/useTreeServiceContext';
import MindMapNode from '@/components/Node/MindMapNode';

interface MindMapNodeData {
  id: string;
  htmlContent: string;
  children?: MindMapNodeData[];
}

interface ReactFlowMindMapProps {
  treeData: MindMapNodeData;
}


const transformTreeToFlow = (
  node: MindMapNodeData,
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

const ReactFlowMindMapNode = ({ data }: NodeProps) => {
  const treeService = useTreeServiceContext();
  return (
    <Box
      sx={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        width: 150,
        minHeight: 50,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#555' }}
      />
      <MindMapNode treeService={treeService} node={data} />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#555' }}
      />
    </Box>
  );
};

const nodeTypes = {
  mindMapNode: memo(ReactFlowMindMapNode),
};

export default function ReactFlowMindMap({ treeData }: ReactFlowMindMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = transformTreeToFlow(treeData);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const stringifiedTreeData = JSON.stringify(treeData);

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