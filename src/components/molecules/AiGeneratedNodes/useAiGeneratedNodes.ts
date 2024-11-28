import {TreeService} from '@/types/tree';
import {TreeNode} from '../TreeNode';
import {useEffect, useState} from 'react';
import {getMindMapContextForNode} from '@/app/utils/getMindMapContextForNode';

export function useAiGeneratedNodes(treeService: TreeService, node?: TreeNode) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodesText, setNodesText] = useState<string[]>([]);

  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (node && nodesText && nodesText.length > 0) {
      nodesText.forEach((text: string) => {
        treeService.insertNode(node.id, text);
      });
    }
  }, [nodesText]);

  useEffect(() => {
    if (isLoading && node) {
      const loadingNode = treeService.insertNode(node.id, 'Loading...');
      setLoadingNodeId(loadingNode.id);
    } else {
      if (loadingNodeId) {
        treeService.deleteNode(loadingNodeId);
        setLoadingNodeId(null);
      }
    }
    return () => {
      if (loadingNodeId) {
        treeService.deleteNode(loadingNodeId);
        setLoadingNodeId(null);
      }
    };
  }, [isLoading]);

  async function generateNodes() {
    if (!node) return;
    const mindMapContext = getMindMapContextForNode(treeService.tree, node);
    setError(null);
    try {
      setIsLoading(true);

      const res = await fetch('/api/generateContextualNodes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({input: mindMapContext}),
      });
      const data = await res.json();
      console.log('data', data);
      if (data.nodes) {
        console.log('data.nodes', data.nodes);
        setNodesText(data.nodes);
      } else {
        setError('Unable to generate recommendations');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Unable to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    nodesText,
    generateNodes,
  };
}
