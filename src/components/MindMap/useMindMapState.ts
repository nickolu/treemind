import {useState} from 'react';

export default function useMindMapState() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return {
    selectedNodeId,
    setSelectedNodeId,
  };
}
