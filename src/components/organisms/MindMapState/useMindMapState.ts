'use client';
import {useState} from 'react';

export interface MindMapState {
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
  isNodeBeingEdited: boolean;
  setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void;
  areKeyboardEventsEnabled: boolean;
  setAreKeyboardEventsEnabled: (areKeyboardEventsEnabled: boolean) => void;
}

export function useMindMapState(): MindMapState {
  const [areKeyboardEventsEnabled, setAreKeyboardEventsEnabled] =
    useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeBeingEdited, setIsNodeBeingEdited] = useState<boolean>(false);

  return {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
    areKeyboardEventsEnabled,
    setAreKeyboardEventsEnabled,
  };
}
