import {useMindMapStateContext} from '@/components/organisms/MindMapState/useMindMapStateContext';
import {useTreeServiceContext} from '@/components/organisms/TreeService/useTreeServiceContext';
import {useEffect} from 'react';

export function useMindMapKeyboardEvents() {
  const treeService = useTreeServiceContext();
  const {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
  } = useMindMapStateContext();

  const selectedNode = treeService.getNodeById(selectedNodeId ?? '');
  const selectedParentNodeId =
    selectedNode?.parentId ?? treeService.tree.root.id;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (isNodeBeingEdited) {
          setIsNodeBeingEdited(false);
        } else if (selectedNode) {
          const newNode = treeService.insertNode(
            selectedNode.id,
            '<div>hello world</div>',
          );
          setSelectedNodeId(newNode.id);
        }
      } else if (e.key === 'Enter') {
        if (selectedParentNodeId) {
          e.preventDefault();
          const newNode = treeService.insertNode(
            selectedParentNodeId,
            '<div>hello world</div>',
          );
          setSelectedNodeId(newNode.id);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          treeService.deleteNode(selectedNode.id);
          setSelectedNodeId(selectedParentNodeId);
        }
      } else {
        setIsNodeBeingEdited(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedNodeId,
    selectedNode,
    selectedParentNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    setSelectedNodeId,
    treeService,
  ]);
}
