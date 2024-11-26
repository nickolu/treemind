import React, { useCallback } from 'react';
import { ButtonGroup, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { TreeService } from '@/types/tree';
import { TreeNode } from '@/components/molecules/TreeNode';

interface NodeControlsProps {
    node: TreeNode;
    treeService: TreeService;
    handleOpen: () => void;
}

export const NodeControls: React.FC<NodeControlsProps> = ({
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