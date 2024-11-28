import 'react-quill/dist/quill.snow.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TreeService } from '@/types/tree';
import { Box } from '@mui/material';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { TreeNode } from '@/components/molecules/TreeNode';
import { NodeControls } from '@/components/molecules/NodeControls';
import { EditorModal } from '@/components/molecules/EditorModal';
import { parseTextFromHtml } from '@/components/atoms/parseTextFromHtml';
import { NodeTextEditor } from '@/components/atoms/NodeTextEditor';
import { NodeHtmlRenderer } from '@/components/atoms/NodeHtmlRenderer';

export const MindMapNode: React.FC<{
  treeNode: TreeNode;
  treeService: TreeService;
}> = ({
  treeNode,
  treeService,
}) => {
    const { selectedNodeId, setSelectedNodeId, isNodeBeingEdited, setIsNodeBeingEdited, setAreKeyboardEventsEnabled } = useMindMapStateContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [text, setText] = useState('');
    const [html, setHtml] = useState(treeNode.html);

    const textEditorRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      console.log('on html change');
      const updatedText = parseTextFromHtml(html);
      setText(updatedText);
      console.log('html', html);
      console.log('updatedText', updatedText);
    }, [html]);

    useEffect(() => {
      if (isNodeBeingEdited && selectedNodeId === treeNode.id) {
        console.log('isNodeBeingEdited', isNodeBeingEdited);
        setText(treeNode.text);
      }
    }, [isNodeBeingEdited, selectedNodeId, treeNode.id, treeNode.text]);

    useEffect(() => {
      setAreKeyboardEventsEnabled(!isNodeBeingEdited);
    }, [isNodeBeingEdited, setAreKeyboardEventsEnabled]);

    useEffect(() => {
      if (selectedNodeId) {
        textEditorRef.current?.focus();
      } else {
        textEditorRef.current?.blur();
      }
    }, [selectedNodeId]);

    useEffect(() => {
      setAreKeyboardEventsEnabled(!isModalOpen);
    }, [isModalOpen])

    const handleOpen = useCallback(() => {
      setIsNodeBeingEdited(false);
      setIsModalOpen(true);
    }, [isNodeBeingEdited]);

    const updateHtml = useCallback((html: string) => {
      treeService.editNodeHtml(treeNode.id, html);
      setHtml(html);
    }, [treeService, treeNode.id]);

    return (
      <Box
        key={treeNode.id}
        id={treeNode.id}
        tabIndex={0}
        onFocus={() => {
          setSelectedNodeId(treeNode.id)
        }}
        onBlur={() => setIsNodeBeingEdited(false)}
        sx={{
          background: selectedNodeId === treeNode.id ? 'lightblue' : 'white',
          border: selectedNodeId === treeNode.id ? '2px solid blue' : '1px solid #ccc',
          borderRadius: '5px',
          padding: '10px',
          width: 150,
          minHeight: 50,
        }}
      >

        <div>
          {isNodeBeingEdited && selectedNodeId === treeNode.id ? (
            <NodeTextEditor
              textEditorRef={textEditorRef}
              text={text}
              setText={setText}
              setHtml={setHtml}
              setIsNodeBeingEdited={setIsNodeBeingEdited}
            />
          ) : (
            <div onClick={() => setIsNodeBeingEdited(true)}><NodeHtmlRenderer html={html} /></div>
          )}
        </div>

        <NodeControls onClickEdit={handleOpen} />
        <EditorModal
          isModalOpen={isModalOpen}
          node={treeNode}
          setIsModalOpen={setIsModalOpen}
          setHtml={setHtml}
          html={html}
        />
      </Box>
    );
  };
