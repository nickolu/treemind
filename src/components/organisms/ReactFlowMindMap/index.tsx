"use client";
import { KeyboardEvent, memo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  ReactFlowInstance,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowMindMapNode } from '@/components/molecules/ReactFlowMindMapNode';
import { TreeNode } from '@/domain/TreeNode';
import { useMindMapKeyboardEvents } from '@/components/molecules/MindMapKeyboardEvents/useMindMapKeyboardEvents';
import { transformTreeToFlow } from './transformTreeToFlow';
import { Box, Button, Stack } from '@mui/material';
import { MindMapLegend } from '@/components/molecules/MindMapLegend';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { saveMindMapToFile, loadMindMapFromFile } from '@/app/utils/fileOperations';
import { saveMindMapToLocalStorage, loadMindMapFromLocalStorage } from '@/app/utils/localStorageOperations';

interface ReactFlowMindMapProps {
  treeData: TreeNode;
}

const nodeTypes = {
  mindMapNode: memo(ReactFlowMindMapNode),
};

export function ReactFlowMindMap({ treeData }: ReactFlowMindMapProps) {
  const { useAutoLayout, selectedNodeId } = useMindMapStateContext();
  const { nodes: initialNodes, edges: initialEdges } = transformTreeToFlow(treeData, 0, 0, 0, [], [], useAutoLayout);

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
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    const descendantIds = getDescendantIds(node.id);
    const draggedNode = nodes.find(n => n.id === node.id);
    if (!draggedNode) return;

    // Calculate the change in position
    const initialNode = initialNodes.find(n => n.id === node.id);
    const dx = draggedNode.position.x - (initialNode?.position.x ?? 0);
    const dy = draggedNode.position.y - (initialNode?.position.y ?? 0);

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
    const { nodes: newNodes, edges: newEdges } = transformTreeToFlow(
      treeData,
      0,
      0,
      0,
      [],
      [],
      useAutoLayout,
      nodes
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [stringifiedTreeData, setNodes, setEdges, treeData, useAutoLayout]);

  useEffect(() => {
    if (!reactFlowInstance) return;
    reactFlowInstance.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  useEffect(() => {
    saveMindMapToLocalStorage(treeData);
  }, [stringifiedTreeData]);

  useEffect(() => {
    if (!reactFlowInstance || !selectedNodeId) return;

    const selectedNode = nodes.find(node => node.id === selectedNodeId);
    if (!selectedNode) return;

    // Get the current viewport
    const viewport = reactFlowInstance.getViewport();
    const { x: viewX, y: viewY, zoom } = viewport;

    // Get the dimensions of the viewport from the container
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const viewportWidth = reactFlowBounds.width;
    const viewportHeight = reactFlowBounds.height;

    // Convert node position to screen coordinates
    const nodeX = selectedNode.position.x * zoom + viewX;
    const nodeY = selectedNode.position.y * zoom + viewY;

    // Add padding (in pixels) to create a margin around the edges
    const padding = 50;

    // Check if the node is outside the viewport (accounting for padding)
    const isOutsideX = nodeX < padding || nodeX > viewportWidth - padding;
    const isOutsideY = nodeY < padding || nodeY > viewportHeight - padding;

    if (isOutsideX || isOutsideY) {
      // Only adjust the view if the node is outside the viewport
      reactFlowInstance.setCenter(
        selectedNode.position.x,
        selectedNode.position.y,
        { zoom }
      );
    }
  }, [selectedNodeId, nodes, reactFlowInstance]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const handleSave = useCallback(() => {
    saveMindMapToFile(treeData);
  }, [treeData]);

  const handleLoad = useCallback(async () => {
    const loadedTree = await loadMindMapFromFile();
    if (loadedTree) {
      // Update the tree state through the service
      // This will trigger a re-render with the new tree data
      const { nodes: newNodes, edges: newEdges } = transformTreeToFlow(
        loadedTree,
        0,
        0,
        0,
        [],
        [],
        useAutoLayout
      );
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [useAutoLayout, setNodes, setEdges]);

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', position: 'relative' }}>
      <Stack direction="row" spacing={2} sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
        <Button variant="contained" onClick={handleSave}>
          Save Mindmap
        </Button>
        <Button variant="contained" onClick={handleLoad}>
          Load Mindmap
        </Button>
      </Stack>
      <ReactFlow
        disableKeyboardA11y={true}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#333', strokeWidth: 2 }
        }}
        connectionMode={ConnectionMode.Strict}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.stopPropagation();
          }
        }}
      >
        <Background />
        <Controls />
        <MindMapLegend />
      </ReactFlow>
    </Box>
  );
}