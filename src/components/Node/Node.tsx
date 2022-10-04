import {useState} from 'react';
import NodeType, {NodeJson} from '.';
import {TreeApi} from '../Tree/useTreeReducer';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type NodeComponentProps = {
  node: NodeJson;
  treeApi: TreeApi;
};

interface HtmlEditorProps {
  node: NodeJson;
  treeApi: TreeApi;
}

function HtmlEditor({node, treeApi}: HtmlEditorProps) {
  return (
    <textarea
      onChange={(e) => {
        treeApi.editNodeHtml({id: node.id, htmlContent: e.target.value});
      }}
      value={node.htmlContent}
    />
  );
}

function WysiwygEditor({node, treeApi}: HtmlEditorProps) {
  return (
    <ReactQuill
      theme="snow"
      value={node.htmlContent}
      onChange={(value) => {
        treeApi.editNodeHtml({id: node.id, htmlContent: value});
      }}
    />
  );
}

interface NodeContentProps {
  isHtmlEditable: boolean;
  isEditable: boolean;
  node: NodeJson;
  treeApi: TreeApi;
}

function NodeContent({
  isHtmlEditable,
  isEditable,
  node,
  treeApi,
}: NodeContentProps) {
  if (isHtmlEditable) {
    return <HtmlEditor node={node} treeApi={treeApi} />;
  }
  if (isEditable) {
    return <WysiwygEditor node={node} treeApi={treeApi} />;
  }
  return <div dangerouslySetInnerHTML={{__html: node.htmlContent}} />;
}

export default function Node({node, treeApi}: NodeComponentProps) {
  const [isHtmlEditable, setIsHtmlEditable] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const toggleEditable = () => {
    setIsEditable(!isEditable);
  };

  const toggleHtmlEditable = () => {
    setIsHtmlEditable(!isHtmlEditable);
  };
  return (
    <li key={node.id} id={node.id}>
      <NodeContent
        node={node}
        treeApi={treeApi}
        isEditable={isEditable}
        isHtmlEditable={isHtmlEditable}
      />
      <div>
        <button disabled={isEditable} onClick={toggleHtmlEditable}>
          {isHtmlEditable ? 'Stop Editing' : 'Edit HTML'}
        </button>
        <button disabled={isHtmlEditable} onClick={toggleEditable}>
          {isEditable ? 'Stop Editing' : 'Edit Content'}
        </button>
        <button
          type="button"
          onClick={() => {
            treeApi.insertNode({
              parentId: node.id,
              content: 'hello world',
              htmlContent: '<div>hello world</div>',
            });
          }}
        >
          Insert Child
        </button>
        <button
          type="button"
          onClick={() => {
            treeApi.deleteNode({
              id: node.id,
            });
          }}
        >
          Delete
        </button>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((childNode) => {
            return (
              <Node key={childNode.id} node={childNode} treeApi={treeApi} />
            );
          })}
        </ul>
      )}
    </li>
  );
}
