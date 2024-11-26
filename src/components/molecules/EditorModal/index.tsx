import { TreeService } from "@/types/tree";
import { TreeNode } from "@/components/molecules/TreeNode";
import { useCallback, useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import { Box, ButtonGroup, IconButton, Modal, styled } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const StyledModal = styled(Modal)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});

interface EditorModalProps {
    isModalOpen: boolean;
    setIsModalOpen: (isModalOpen: boolean) => void;
    node: TreeNode;
    treeService: TreeService;
    tempHtmlContent: string;
    setTempHtmlContent: (tempHtmlContent: string) => void;
}

export const EditorModal = ({
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