import { useCallback, useEffect } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MindMapNodeData {
  id: string;
  htmlContent: string;
  children?: MindMapNodeData[];
}

interface ReactFlowMindMapProps {
  treeData: MindMapNodeData;
}

const nodeWidth = 150;
const nodeHeight = 50;

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

const MindMapNode = ({ data }: NodeProps) => {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        width: nodeWidth,
        minHeight: nodeHeight,
        position: 'relative',
      }}
    >
      <div className="react-flow__handle react-flow__handle-left" style={{ left: -8, top: '50%', position: 'absolute' }} data-handleid="left" />
      <div className="react-flow__handle react-flow__handle-right" style={{ right: -8, top: '50%', position: 'absolute' }} data-handleid="right" />
      
      <div dangerouslySetInnerHTML={{ __html: data.htmlContent }} />
    </div>
  );
};

const nodeTypes = {
  mindMapNode: MindMapNode,
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

  const onInit = useCallback(() => {
    console.log('Flow initialized');
  }, []);
    


  return (
    <div style={{ width: '100%', height: '800px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
} 