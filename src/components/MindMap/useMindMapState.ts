import {useState} from 'react';

export interface MindMapState {
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
  isNodeBeingEdited: boolean;
  setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void;
}

export default function useMindMapState(): MindMapState {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeBeingEdited, setIsNodeBeingEdited] = useState<boolean>(false);

  return {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited,
    setIsNodeBeingEdited,
  };
}
