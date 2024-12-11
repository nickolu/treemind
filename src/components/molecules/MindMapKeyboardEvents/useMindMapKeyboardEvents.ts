/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import {useMindMapStateContext} from '@/components/organisms/MindMapState/useMindMapStateContext';
import {useTreeServiceContext} from '@/components/organisms/TreeService/useTreeServiceContext';
import {useCallback, useEffect} from 'react';
import {TreeNode} from '@/domain/TreeNode';
import {useAiGeneratedNodes} from '../AiGeneratedNodes/useAiGeneratedNodes';

type KeyboardHandlerProps = {
  selectedNode: TreeNode | null;
  parentNode: TreeNode | null;
  nodeIndex: number;
  selectedParentNodeId: string;
  setSelectedNodeId: (id: string) => void;
  setIsNodeBeingEdited: (isEditing: boolean) => void;
  treeService: ReturnType<typeof useTreeServiceContext>;
};

function isMindMapNodeShortcut(e: KeyboardEvent): {[key: string]: boolean} {
  return {
    generateChildNodes: (e.altKey || e.metaKey) && e.code === 'Tab',
    insertChild: e.key === 'Tab',
    insertSibling: e.key === 'Enter',
    deleteNode: e.key === 'Delete' || e.key === 'Backspace',
    openEditor: e.key === 'e' || e.key === 'E',
    moveUp: e.key === 'ArrowUp',
    moveDown: e.key === 'ArrowDown',
    moveLeft: e.key === 'ArrowLeft',
    moveRight: e.key === 'ArrowRight',
    regularCharacterKey:
      !e.altKey && !e.metaKey && !e.ctrlKey && e.key.length === 1,
  };
}

function isTextEditorShortcut(e: KeyboardEvent): {[key: string]: boolean} {
  return {
    save: e.key === 'Enter',
    cancel: e.key === 'Escape',
    editingEvent: e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter',
  };
}

export function useMindMapKeyboardEvents() {
  const treeService = useTreeServiceContext();
  const {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    areKeyboardEventsEnabled,
    setIsEditorModalOpen,
  } = useMindMapStateContext();

  const selectedNode = treeService.getNodeById(selectedNodeId ?? '');
  const selectedParentNodeId =
    selectedNode?.parentId ?? treeService.tree.root.id;

  const {generateNodes} = useAiGeneratedNodes(treeService, selectedNode);

  // Handle node editing events (Enter, Tab, Escape)
  const handleEditingEvents = useCallback(
    (e: KeyboardEvent) => {
      if (isTextEditorShortcut(e).save) {
        setIsNodeBeingEdited(false);
      }
    },
    [setIsNodeBeingEdited],
  );

  // Handle node creation events (Enter, Tab)
  const handleNodeCreation = useCallback(
    (
      e: KeyboardEvent,
      {
        selectedNode,
        selectedParentNodeId,
        setSelectedNodeId,
        treeService,
      }: KeyboardHandlerProps,
    ) => {
      e.preventDefault();
      if (isMindMapNodeShortcut(e).generateChildNodes) {
        console.log('Triggering AI generation', {
          altKey: e.altKey,
          metaKey: e.metaKey,
          code: e.code,
          key: e.key,
        });
        generateNodes();
      } else if (
        isMindMapNodeShortcut(e).insertSibling &&
        selectedParentNodeId
      ) {
        const newNode = treeService.insertNode(selectedParentNodeId, '');
        setSelectedNodeId(newNode.id);
      } else if (isMindMapNodeShortcut(e).insertChild && selectedNode) {
        const newNode = treeService.insertNode(selectedNode.id, '');
        setSelectedNodeId(newNode.id);
      }
    },
    [generateNodes],
  );

  // Handle node deletion (Delete, Backspace)
  const handleNodeDeletion = useCallback(
    (
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
    },
    [],
  );

  // Handle navigation events (Arrow keys)
  const handleNavigation = useCallback(
    (
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

      switch (true) {
        case isMindMapNodeShortcut(e).moveUp:
          if (nodeIndex > 0) {
            setSelectedNodeId(parentNode.children[nodeIndex - 1].id);
          }
          break;
        case isMindMapNodeShortcut(e).moveDown:
          if (nodeIndex < parentNode.children.length - 1) {
            setSelectedNodeId(parentNode.children[nodeIndex + 1].id);
          }
          break;
        case isMindMapNodeShortcut(e).moveLeft:
          setSelectedNodeId(selectedNode.parentId ?? treeService.tree.root.id);
          break;
        case isMindMapNodeShortcut(e).moveRight:
          if (selectedNode.children.length > 0) {
            setSelectedNodeId(selectedNode.children[0].id);
          }
          break;
      }
    },
    [],
  );

  useEffect(() => {
    if (!areKeyboardEventsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Key event:', {
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        metaKey: e.metaKey,
        isEditing: isNodeBeingEdited,
      });

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

      const isShortcut = isMindMapNodeShortcut(e);
      // Handle different keyboard events
      if (
        isShortcut.insertChild ||
        isShortcut.insertSibling ||
        isShortcut.generateChildNodes
      ) {
        handleNodeCreation(e, handlerProps);
      } else if (isShortcut.deleteNode) {
        handleNodeDeletion(e, handlerProps);
      } else if (
        isShortcut.moveUp ||
        isShortcut.moveDown ||
        isShortcut.moveLeft ||
        isShortcut.moveRight
      ) {
        handleNavigation(e, handlerProps);
      } else if (isShortcut.openEditor) {
        e.preventDefault();
        setIsEditorModalOpen(true);
      } else if (isShortcut.regularCharacterKey) {
        // Only enter edit mode for regular character keys
        setIsNodeBeingEdited(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    areKeyboardEventsEnabled,
    handleEditingEvents,
    handleNavigation,
    handleNodeCreation,
    handleNodeDeletion,
    isNodeBeingEdited,
    selectedNode,
    selectedNodeId,
    selectedParentNodeId,
    setIsNodeBeingEdited,
    setSelectedNodeId,
    treeService,
  ]);
}
