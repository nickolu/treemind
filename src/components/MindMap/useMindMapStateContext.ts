import {createContext, useContext} from 'react';

interface MindMapState {
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
}

export const mindMapStateContext = createContext<MindMapState | null>(null);

export default function useMindMapStateContext() {
  const context = useContext(mindMapStateContext);
  if (context === null) {
    throw new Error(
      'useMindMapStateContext must be used within a MindMapStateProvider',
    );
  }
  return context;
}
