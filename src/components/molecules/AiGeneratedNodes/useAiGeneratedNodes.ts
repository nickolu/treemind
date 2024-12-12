import {TreeService} from '@/components/organisms/TreeService/useTreeService';
import {TreeNode} from '@/domain/TreeNode';
import {useEffect, useState, useRef, useCallback} from 'react';
import {getMindMapContextForNode} from '@/app/utils/getMindMapContextForNode';

const LOADING_NODE_HTML = `
<div style="
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
  padding: 4px 8px;
">
  <span style="color: #333;">Generating ideas</span>
  <div class="loading-dots" style="display: flex; align-items: center;">
    <span class="dot" style="width: 4px; height: 4px; border-radius: 50%; background: #666; margin: 0 1px;"></span>
    <span class="dot" style="width: 4px; height: 4px; border-radius: 50%; background: #666; margin: 0 1px;"></span>
    <span class="dot" style="width: 4px; height: 4px; border-radius: 50%; background: #666; margin: 0 1px;"></span>
  </div>
  <style>
    @keyframes pulse {
      0%, 100% { transform: scale(0.5); opacity: 0.5; }
      50% { transform: scale(1); opacity: 1; }
    }
    .loading-dots .dot {
      animation: pulse 1.4s ease-in-out infinite;
      animation-fill-mode: both;
    }
    .loading-dots .dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dots .dot:nth-child(3) { animation-delay: 0.4s; }
  </style>
</div>`;

export function useAiGeneratedNodes(treeService: TreeService, node?: TreeNode) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingNodeRef = useRef<TreeNode | null>(null);
  const isGeneratingRef = useRef(false);

  const generateNodes = useCallback(async () => {
    if (!node || isGeneratingRef.current) {
      console.log('Early return - node:', node, 'isGenerating:', isGeneratingRef.current);
      return;
    }
    
    const mindMapContext = getMindMapContextForNode(treeService.tree, node);
    setError(null);
    
    try {
      isGeneratingRef.current = true;
      setIsLoading(true);
      console.log('Creating loading node...');

      // Create loading node
      loadingNodeRef.current = treeService.insertNode(node.id, LOADING_NODE_HTML);
      console.log('Loading node created:', loadingNodeRef.current);

      const res = await fetch('/api/generateContextualNodes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({input: mindMapContext}),
      });
      const data = await res.json();
      
      if (data.nodes) {
        console.log('Got generated nodes:', data.nodes);
        // Delete loading node before adding new nodes
        if (loadingNodeRef.current) {
          console.log('Removing loading node:', loadingNodeRef.current.id);
          treeService.deleteNode(loadingNodeRef.current.id);
          loadingNodeRef.current = null;
        }

        // Batch insert all nodes
        data.nodes.forEach((text: string) => {
          const html = `<div>${text}</div>`;
          treeService.insertNode(node.id, html);
        });
      } else {
        setError('Unable to generate recommendations');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Unable to generate recommendations');
    } finally {
      // Ensure loading node is cleaned up
      if (loadingNodeRef.current) {
        console.log('Cleanup: removing loading node:', loadingNodeRef.current.id);
        treeService.deleteNode(loadingNodeRef.current.id);
        loadingNodeRef.current = null;
      }
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  }, [node, treeService]);

  // Only cleanup on actual unmount
  useEffect(() => {
    // This effect should only run on unmount
    const currentTreeService = treeService;
    const loadingNode = loadingNodeRef.current;

    return () => {
      if (loadingNode) {
        console.log('Unmount cleanup: removing loading node:', loadingNode.id);
        currentTreeService.deleteNode(loadingNode.id);
        loadingNodeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return {
    isLoading,
    error,
    generateNodes,
  };
}
