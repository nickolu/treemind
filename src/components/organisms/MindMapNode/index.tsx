import 'react-quill/dist/quill.snow.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TreeService } from '@/types/tree';
import { Box } from '@mui/material';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { TreeNode } from '@/components/molecules/TreeNode';
import { NodeContent } from '@/components/molecules/NodeContent';
import { NodeControls } from '@/components/molecules/NodeControls';
import { EditorModal } from '@/components/molecules/EditorModal';

export const MindMapNode: React.FC<{
  treeNode: TreeNode;
  treeService: TreeService;
}> = ({
  treeNode,
  treeService,
}) => {
    const { selectedNodeId, setSelectedNodeId, isNodeBeingEdited, setIsNodeBeingEdited } = useMindMapStateContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempTextContent, setTempTextContent] = useState('');
    const [tempHtmlContent, setTempHtmlContent] = useState(treeNode.html);

    const textEditorRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isNodeBeingEdited && selectedNodeId === treeNode.id) {
        setTempTextContent(treeNode.text);
      }
    }, [isNodeBeingEdited, selectedNodeId, treeNode.id, treeNode.text]);

    const handleOpen = useCallback(() => {
      if (!isNodeBeingEdited) {
        setTempHtmlContent(treeNode.html);
        setIsModalOpen(true);
      }
    }, [treeNode.html, isNodeBeingEdited]);

    return (
      <Box
        key={treeNode.id}
        id={treeNode.id}
        tabIndex={0}
        onFocus={() => {
          setSelectedNodeId(treeNode.id)
          textEditorRef.current?.focus();
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
        <NodeContent
          isNodeBeingEdited={isNodeBeingEdited}
          treeNode={treeNode}
          setIsNodeBeingEdited={setIsNodeBeingEdited}
          setTempTextContent={setTempTextContent}
          tempTextContent={tempTextContent}
          textEditorRef={textEditorRef}
          treeService={treeService}
          selectedNodeId={selectedNodeId}
        />
        <NodeControls node={treeNode} treeService={treeService} handleOpen={handleOpen} />
        <EditorModal
          isModalOpen={isModalOpen}
          node={treeNode}
          setIsModalOpen={setIsModalOpen}
          setTempHtmlContent={setTempHtmlContent}
          tempHtmlContent={tempHtmlContent}

        />
      </Box>
    );
  };
