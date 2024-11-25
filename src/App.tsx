import './App.css';
import { Box } from '@mui/material';

import ReactFlowMindMap from '@/app/ReactFlowMindMap';
import { useTreeService } from '@/components/Tree/useTreeService';
import TreeServiceContext from '@/components/Tree/TreeServiceContext';
import MindMapStateContext from '@/components/MindMap/MindMapStateContext';
import useMindMapState from '@/components/MindMap/useMindMapState';

function App() {
  const treeService = useTreeService();
  const mindMapState = useMindMapState()

  const tree = treeService.tree;

  return (
    <TreeServiceContext.Provider value={treeService}>
      <MindMapStateContext.Provider value={mindMapState}>
        <Box sx={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
          <ReactFlowMindMap treeData={tree.root} />
        </Box>
      </MindMapStateContext.Provider>
    </TreeServiceContext.Provider>
  );
}


export default App;
