'use client';
import {useState} from 'react';

export interface MindMapState {
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
  isNodeBeingEdited: boolean;
  setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void;
  areKeyboardEventsEnabled: boolean;
  setAreKeyboardEventsEnabled: (areKeyboardEventsEnabled: boolean) => void;
  isEditorModalOpen: boolean;
  setIsEditorModalOpen: (isEditorModalOpen: boolean) => void;
  useAutoLayout: boolean;
  setUseAutoLayout: (useAutoLayout: boolean) => void;
}

export function useMindMapState(): MindMapState {
  const [areKeyboardEventsEnabled, setAreKeyboardEventsEnabled] =
    useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeBeingEdited, setIsNodeBeingEdited] = useState<boolean>(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [useAutoLayout, setUseAutoLayout] = useState<boolean>(true);

  return {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    areKeyboardEventsEnabled,
    setAreKeyboardEventsEnabled,
    isEditorModalOpen,
    setIsEditorModalOpen,
    useAutoLayout,
    setUseAutoLayout,
  };
}
