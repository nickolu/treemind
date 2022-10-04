import './App.css';
import Node from './components/Node';
import NodeComponent from './components/Node/Node';
import useTreeReducer from './components/Tree/useTreeReducer';

function App() {
  const {tree, treeApi} = useTreeReducer();

  return (
    <div>
      <div>
        <h2>editor</h2>
        <ul>
          <NodeComponent node={tree.root} treeApi={treeApi} />
        </ul>
      </div>
      <div>
        <h2>Tree</h2>
        <ReadOnlyTree root={tree.root} />
      </div>
    </div>
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
