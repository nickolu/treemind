import { TreeNode } from "@/components/molecules/TreeNode";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { Box, Button, ButtonGroup, Modal, styled, Tab, Tabs, TextField } from "@mui/material";
import { useTreeServiceContext } from "@/components/organisms/TreeService/useTreeServiceContext";


const StyledModal = styled(Modal)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});

interface EditorModalProps {
    isModalOpen: boolean;
    setIsModalOpen: (isModalOpen: boolean) => void;
    node: TreeNode;
    html: string;
    setHtml: (html: string) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 2 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export const EditorModal = ({
    isModalOpen,
    setIsModalOpen,
    html,
    setHtml,
    node,
}: EditorModalProps) => {
    const treeService = useTreeServiceContext();
    const editorRef = useRef<ReactQuill>(null);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (isModalOpen && editorRef.current) {
            const editor = editorRef.current.getEditor();
            editor.focus();
            const length = editor.getLength();
            editor.setSelection(length, length);
        }
    }, [isModalOpen]);

    const handleEditorChange = useCallback((content: string) => {
        setHtml(content);
    }, []);

    const handleClose = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleSave = useCallback(() => {
        setHtml(html);
        setIsModalOpen(false);
    }, [node.id, html, treeService]);

    const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    }, []);

    return (
        <StyledModal open={isModalOpen} onClose={handleClose}>
            <Box sx={{ bgcolor: 'background.paper', width: 600, borderRadius: 1 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label="Editor" />
                        <Tab label="HTML" />
                    </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                    <ReactQuill
                        ref={editorRef}
                        value={html}
                        onChange={handleEditorChange}
                        modules={{
                            toolbar: [
                                ['bold', 'italic', 'underline'],
                                ['link'],
                                [{ list: 'ordered' }, { list: 'bullet' }],
                            ],
                        }}
                    />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                    <TextField
                        multiline
                        fullWidth
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                    />
                </TabPanel>
                <Box sx={{ padding: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <ButtonGroup>
                        <Button onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} variant="contained">
                            Save
                        </Button>
                    </ButtonGroup>
                </Box>
            </Box>
        </StyledModal >
    );
};