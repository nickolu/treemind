import React from 'react';
import { ButtonGroup, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface NodeControlsProps {
    onClickEdit: () => void;
}

export const NodeControls: React.FC<NodeControlsProps> = ({ onClickEdit }) => {
    return (
        <ButtonGroup>
            <IconButton tabIndex={-1} onClick={onClickEdit}>
                <EditIcon />
            </IconButton>
        </ButtonGroup>
    );
};