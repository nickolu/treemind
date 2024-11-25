import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TreeService } from '../../types/tree';
import { styled } from '@mui/material/styles';
import { Box, Modal, ButtonGroup, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import useMindMapStateContext from '../MindMap/useMindMapStateContext';
import { TreeNode } from '.';

const StyledModal = styled(Modal)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

interface NodeControlsProps {
  node: TreeNode;
  treeService: TreeService;
  handleOpen: () => void;
}

interface EditorModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  node: TreeNode;
  treeService: TreeService;
  tempHtmlContent: string;
  setTempHtmlContent: (tempHtmlContent: string) => void;
}

const EditorModal = ({
  isModalOpen,
  setIsModalOpen,
  node,
  treeService,
  tempHtmlContent,
  setTempHtmlContent,
}: EditorModalProps) => {
  const editorRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (isModalOpen && editorRef.current) {
      const editor = editorRef.current.getEditor();
      editor.focus();
      const length = editor.getLength();
      editor.setSelection(length, length);
    }
  }, [isModalOpen]);

  const handleEditorChange = (content: string) => {
    setTempHtmlContent(content);
  };

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    treeService.editNodeHtml(node.id, tempHtmlContent);
    setIsModalOpen(false);
  }, [node.id, tempHtmlContent, treeService]);

  return (
    <StyledModal open={isModalOpen} onClose={handleClose}>
      <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
        <ReactQuill
          ref={editorRef}
          value={tempHtmlContent}
          onChange={handleEditorChange}
          modules={{
            toolbar: [
              ['bold', 'italic', 'underline'],
              ['link'],
              [{ list: 'ordered' }, { list: 'bullet' }],
            ],
          }}
        />
        <ButtonGroup>
          <IconButton onClick={handleSave}>
            <AddIcon />
          </IconButton>
          <IconButton onClick={handleClose}>
            <DeleteIcon />
          </IconButton>
        </ButtonGroup>
      </Box>
    </StyledModal>
  );
};

const NodeContent = ({
  setIsNodeBeingEdited,
  isNodeBeingEdited,
  treeNode,
  treeService,
  textEditorRef,
  selectedNodeId,
  setTempTextContent,
  tempTextContent
}: {
  setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void;
  isNodeBeingEdited: boolean;
  treeNode: TreeNode;
  treeService: TreeService;
  textEditorRef: React.RefObject<HTMLInputElement>;
  selectedNodeId: string | null;
  setTempTextContent: (tempTextContent: string) => void;
  tempTextContent: string;
}) => {

  return (
    <div>
      {isNodeBeingEdited && selectedNodeId === treeNode.id ? (
        <TextField
          value={tempTextContent}
          inputRef={textEditorRef}
          multiline
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setTempTextContent(e.target.value);
          }}
          onFocus={() => {
            setIsNodeBeingEdited(true);
            textEditorRef.current?.focus();
          }}
          onBlur={() => {
            const wrappedContent = `<div>${tempTextContent}</div>`;
            if (wrappedContent !== treeNode.html) {
              treeService.editNodeHtml(treeNode.id, wrappedContent);
              setTempTextContent('');
            }
            setIsNodeBeingEdited(false);
          }}
        />
      ) : (
        <div onClick={() => setIsNodeBeingEdited(true)} dangerouslySetInnerHTML={{ __html: treeNode.html }} />
      )}
    </div>
  );
};

const NodeControls: React.FC<NodeControlsProps> = ({
  node,
  treeService,
  handleOpen,
}) => {
  const handleInsertChild = useCallback(() => {
    treeService.insertNode(
      node.id,
      '<div>hello world</div>',
    );
  }, [treeService, node.id]);

  const handleDelete = useCallback(() => {
    treeService.deleteNode(node.id);
  }, [treeService, node.id]);

  return (
    <ButtonGroup>
      <IconButton onClick={handleInsertChild}>
        <AddIcon />
      </IconButton>
      <IconButton onClick={handleOpen}>
        <EditIcon />
      </IconButton>
      <IconButton onClick={handleDelete}>
        <DeleteIcon />
      </IconButton>
    </ButtonGroup>
  );
};

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
          treeService={treeService}
        />
      </Box>
    );
  };
