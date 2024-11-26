import React from 'react';
import { TextField } from '@mui/material';
import { TreeService } from '@/types/tree';
import { TreeNode } from '@/components/molecules/TreeNode';

export const NodeContent = ({
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
                    autoFocus
                    value={tempTextContent}
                    inputRef={textEditorRef}
                    multiline
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setTempTextContent(e.target.value);
                    }}
                    onFocus={() => {
                        setIsNodeBeingEdited(true);
                        textEditorRef.current?.select();
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