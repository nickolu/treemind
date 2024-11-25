import './App.css';
import { Box } from '@mui/material';

import Node from '@/components/Node';
import ReactFlowMindMap from '@/app/ReactFlowMindMap';
import useTreeService from '@/components/Tree/useTreeService';
import TreeServiceContext from '@/components/Tree/TreeServiceContext';

function App() {
  const { treeService } = useTreeService();
  const tree = treeService.tree;

  return (
    <TreeServiceContext.Provider value={treeService}>
      <Box sx={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
        <ReactFlowMindMap treeData={tree.root} />
      </Box>
    </TreeServiceContext.Provider>
  );
}

type ReadOnlyTreeProps = {
  root: Node;
};

function ReadOnlyTree({ root }: ReadOnlyTreeProps) {
  return (
    <ul>
      <div>id: {root.id}</div>
      <div>parentId: {root.parentId}</div>
      <div>html content: {root.htmlContent}</div>
      {root.children.map((node: Node) => {
        return (
          <li key={node.id}>
            <ReadOnlyTree root={node} />
          </li>
        );
      })}
    </ul>
  );
}

export default App;
