import './App.css';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Node from './components/Node';
import MindMapNode from './components/Node/MindMapNode';
import useTreeService from './components/Tree/useTreeService';
import ReactFlowMindMap from './components/ReactFlowMindMap/ReactFlowMindMap';
import { treeContext } from './components/Tree/useTreeContext';

function App() {
  const {treeService} = useTreeService();
  const tree = treeService.tree;
  

  return (
    <treeContext.Provider value={treeService}>
      <Box sx={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
      <ReactFlowMindMap treeData={tree.root} />
        {/* <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="editor-content"
            id="editor-header"
          >
            <Typography variant="h6">Editor</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ul>
              <MindMapNode node={tree.root} treeService={treeService} />
            </ul>
          </AccordionDetails>
        </Accordion> */}

        {/* <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="tree-content"
            id="tree-header"
          >
            <Typography variant="h6">Tree</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ReadOnlyTree root={tree.root} />
          </AccordionDetails>
        </Accordion> */}
        
  {/* 
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="mindmap-content"
            id="mindmap-header"
          >
            <Typography variant="h6">D3 MindMap</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <D3MindMap treeData={tree.root} />
          </AccordionDetails>
        </Accordion> */}

        {/* <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="json-content"
            id="json-header"
          >
            <Typography variant="h6">React Flow MindMap</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ReactFlowMindMap treeData={tree.root} />
          </AccordionDetails>
        </Accordion> */}
      </Box>
    </treeContext.Provider>
  );
}

type ReadOnlyTreeProps = {
  root: Node;
};

function ReadOnlyTree({root}: ReadOnlyTreeProps) {
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
