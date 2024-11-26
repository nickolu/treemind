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
      if (isNodeBeingEdited) {
        if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') {
          setIsNodeBeingEdited(false);
        }
      } else if (selectedNode) {
        const nodeIndex = treeService.findNodeIndex(selectedNode);
        const parentNode = treeService.getNodeById(selectedParentNodeId);
        if (e.key === 'Enter') {
          if (selectedParentNodeId) {
            e.preventDefault();
            const newNode = treeService.insertNode(
              selectedParentNodeId,
              '<div>hello world</div>',
            );
            setSelectedNodeId(newNode.id);
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const newNode = treeService.insertNode(
            selectedNode.id,
            '<div>hello world</div>',
          );
          setSelectedNodeId(newNode.id);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();

          treeService.deleteNode(selectedNode.id);

          if (parentNode?.children.length === 1) {
            setSelectedNodeId(parentNode?.id ?? treeService.tree.root.id);
          } else if (nodeIndex === 0) {
            console.log('remaining children', parentNode?.children);
            setSelectedNodeId(
              parentNode?.children[1]?.id ?? treeService.tree.root.id,
            );
          } else {
            setSelectedNodeId(
              parentNode?.children[nodeIndex - 1]?.id ??
                treeService.tree.root.id,
            );
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (parentNode && nodeIndex > 0) {
            setSelectedNodeId(parentNode.children[nodeIndex - 1].id);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (parentNode && nodeIndex < parentNode.children.length - 1) {
            setSelectedNodeId(parentNode.children[nodeIndex + 1].id);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedNodeId(selectedNode.parentId ?? treeService.tree.root.id);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (selectedNode.children.length > 0) {
            setSelectedNodeId(selectedNode.children[0].id);
            return;
          }
        } else {
          setIsNodeBeingEdited(true);
        }
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
