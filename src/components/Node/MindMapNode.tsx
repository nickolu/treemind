import { useState, useCallback, memo, useRef, useEffect } from 'react';
import Node from '.';
import { TreeService } from '@/components/Tree/useTreeService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Box,
  Modal,
  Button,
  TextField,
  ButtonGroup,
  IconButton,
} from '@mui/material';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DeleteIcon from '@mui/icons-material/Delete';

type NodeComponentProps = {
  node: Node;
  treeService: TreeService;
};

const EditorModal = ({
  isModalOpen,
  setIsModalOpen,
  node,
  treeService,
  tempContent,
  setTempContent,
  setEditor,
}) => {
  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    treeService.editNodeHtml({ id: node.id, htmlContent: tempContent });
    setIsModalOpen(false);
  }, [node.id, tempContent, treeService]);

  return (
    <Modal
      open={isModalOpen}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <ReactQuill
          theme="snow"
          value={tempContent}
          onChange={setTempContent}
          modules={{
            toolbar: [
              ['bold', 'italic', 'underline'],
              ['link'],
              [{ list: 'ordered' }, { list: 'bullet' }],
            ],
          }}
          onFocus={() => { }}
          preserveWhitespace
          bounds=".quill-editor"
          ref={(el) => {
            if (el) {
              setEditor(el.getEditor());
            }
          }}
        />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const NodeContent = ({
  setIsEditingText,
  isEditingText,
  node,
  treeService,
  handleOpen,
  setTempContent,
}) => {
  return (
    <div>
      {isEditingText ? (
        <TextField
          value={node.textContent}
          onChange={(e) => {
            setTempContent(e.target.value);
          }}
          onBlur={(e) => {
            treeService.editNodeHtml({
              id: node.id,
              htmlContent: e.target.value,
            });
            setIsEditingText(false);
          }}
        />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: node.htmlContent }} />
      )}
      <button onClick={handleOpen}>Edit</button>
    </div>
  );
};

const NodeControls = ({ node, treeService }) => {
  const handleInsertChild = useCallback(() => {
    treeService.insertNode({
      parentId: node.id,
      content: 'hello world',
      htmlContent: '<div>hello world</div>',
    });
  }, [treeService, node.id]);

  const handleDeleteNode = useCallback(() => {
    treeService.deleteNode({
      id: node.id,
    });
  }, [treeService, node.id]);

  return (
    <ButtonGroup>
      <IconButton type="button" onClick={handleInsertChild}>
        <SubdirectoryArrowRightIcon />
      </IconButton>
      <IconButton type="button" onClick={handleDeleteNode}>
        <DeleteIcon />
      </IconButton>
    </ButtonGroup>
  );
};

const MindMapNode = memo(function MindMapNode({
  node: nodeData,
  treeService,
}: NodeComponentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const node = new Node(nodeData);
  const [tempContent, setTempContent] = useState(node.htmlContent);
  const [editor, setEditor] = useState(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleOpen = useCallback(() => {
    if (!isEditingText) {
      setTempContent(node.htmlContent);
      setIsModalOpen(true);
    }
  }, [node.htmlContent, isEditingText]);

  useEffect(() => {
    if (editor) {
      editor.focus();
      editor.setSelection(editor.getLength());
    }
  }, [editor, isModalOpen]);

  // useEffect(() => {
  //   window.addEventListener('keydown', (e) => {
  //     e.preventDefault();
  //     if (e.key === 'Tab') {
  //       e.preventDefault();

  //       treeService.insertNode({
  //         parentId: node.id,
  //         content: 'hello world',
  //         htmlContent: '<div>hello world</div>',
  //       });
  //     }

  //     if (e.key === 'Delete') {
  //       treeService.deleteNode({
  //         id: node.id,
  //       });
  //     }

  //     if (e.key === 'Enter') {
  //       treeService.insertNode({
  //         parentId: node.parentId,
  //         content: 'hello world',
  //         htmlContent: '<div>hello world</div>',
  //       });
  //     }
  //   });
  //   return () => {
  //     window.removeEventListener('keydown', () => {});
  //   };
  // }, []);

  return (
    <Box
      key={node.id}
      id={node.id}
      onDoubleClick={() => setIsEditingText(true)}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      sx={{
        '&:focus-within': {
          border: '1px solid #ccc',
        },
      }}
    >
      <NodeContent
        setIsEditingText={setIsEditingText}
        isEditingText={isEditingText}
        node={node}
        treeService={treeService}
        handleOpen={handleOpen}
        setTempContent={setTempContent}
      />
      <NodeControls node={node} treeService={treeService} />
      <EditorModal
        isModalOpen={isModalOpen}
        node={node}
        setEditor={setEditor}
        setIsModalOpen={setIsModalOpen}
        setTempContent={setTempContent}
        tempContent={tempContent}
        treeService={treeService}
      />
    </Box>
  );
});

export default MindMapNode;
