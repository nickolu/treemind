'use client';
import {useMindMapStateContext} from '@/components/organisms/MindMapState/useMindMapStateContext';
import {useTreeServiceContext} from '@/components/organisms/TreeService/useTreeServiceContext';
import {useEffect} from 'react';
import {TreeNode} from '@/components/molecules/TreeNode';

type KeyboardHandlerProps = {
  selectedNode: TreeNode | null;
  parentNode: TreeNode | null;
  nodeIndex: number;
  selectedParentNodeId: string;
  setSelectedNodeId: (id: string) => void;
  setIsNodeBeingEdited: (isEditing: boolean) => void;
  treeService: ReturnType<typeof useTreeServiceContext>;
};

export function useMindMapKeyboardEvents() {
  const treeService = useTreeServiceContext();
  const {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    areKeyboardEventsEnabled,
  } = useMindMapStateContext();

  const selectedNode = treeService.getNodeById(selectedNodeId ?? '');
  const selectedParentNodeId =
    selectedNode?.parentId ?? treeService.tree.root.id;

  // Handle node editing events (Enter, Tab, Escape)
  const handleEditingEvents = (e: KeyboardEvent) => {
    if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') {
      setIsNodeBeingEdited(false);
    }
  };

  // Handle node creation events (Enter, Tab)
  const handleNodeCreation = (
    e: KeyboardEvent,
    {
      selectedNode,
      selectedParentNodeId,
      setSelectedNodeId,
      treeService,
    }: KeyboardHandlerProps,
  ) => {
    e.preventDefault();
    if (e.key === 'Enter' && selectedParentNodeId) {
      const newNode = treeService.insertNode(selectedParentNodeId, '');
      setSelectedNodeId(newNode.id);
    } else if (e.key === 'Tab' && selectedNode) {
      const newNode = treeService.insertNode(selectedNode.id, '');
      setSelectedNodeId(newNode.id);
    }
  };

  // Handle node deletion (Delete, Backspace)
  const handleNodeDeletion = (
    e: KeyboardEvent,
    {
      selectedNode,
      parentNode,
      nodeIndex,
      setSelectedNodeId,
      treeService,
    }: KeyboardHandlerProps,
  ) => {
    e.preventDefault();
    if (!selectedNode) return;

    treeService.deleteNode(selectedNode.id);

    // Select the appropriate node after deletion
    if (parentNode?.children.length === 1) {
      setSelectedNodeId(parentNode?.id ?? treeService.tree.root.id);
    } else if (nodeIndex === 0) {
      setSelectedNodeId(
        parentNode?.children[1]?.id ?? treeService.tree.root.id,
      );
    } else {
      setSelectedNodeId(
        parentNode?.children[nodeIndex - 1]?.id ?? treeService.tree.root.id,
      );
    }
  };

  // Handle navigation events (Arrow keys)
  const handleNavigation = (
    e: KeyboardEvent,
    {
      selectedNode,
      parentNode,
      nodeIndex,
      setSelectedNodeId,
      treeService,
    }: KeyboardHandlerProps,
  ) => {
    e.preventDefault();
    if (!selectedNode || !parentNode) return;

    switch (e.key) {
      case 'ArrowUp':
        if (nodeIndex > 0) {
          setSelectedNodeId(parentNode.children[nodeIndex - 1].id);
        }
        break;
      case 'ArrowDown':
        if (nodeIndex < parentNode.children.length - 1) {
          setSelectedNodeId(parentNode.children[nodeIndex + 1].id);
        }
        break;
      case 'ArrowLeft':
        setSelectedNodeId(selectedNode.parentId ?? treeService.tree.root.id);
        break;
      case 'ArrowRight':
        if (selectedNode.children.length > 0) {
          setSelectedNodeId(selectedNode.children[0].id);
        }
        break;
    }
  };

  useEffect(() => {
    if (!areKeyboardEventsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isNodeBeingEdited) {
        handleEditingEvents(e);
        return;
      }

      if (!selectedNode) return;

      const nodeIndex = treeService.findNodeIndex(selectedNode);
      const parentNode = treeService.getParentNode(selectedNode);
      const handlerProps: KeyboardHandlerProps = {
        selectedNode,
        parentNode,
        nodeIndex,
        selectedParentNodeId,
        setSelectedNodeId,
        setIsNodeBeingEdited,
        treeService,
      };

      // Handle different keyboard events
      if (e.key === 'Enter' || e.key === 'Tab') {
        handleNodeCreation(e, handlerProps);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleNodeDeletion(e, handlerProps);
      } else if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        handleNavigation(e, handlerProps);
      } else {
        setIsNodeBeingEdited(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedNode,
    selectedParentNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    setSelectedNodeId,
    treeService,
    areKeyboardEventsEnabled,
  ]);
}
