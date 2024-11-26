import React, { useCallback, useEffect } from 'react';
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

    const updateNodeHtml = useCallback(() => {
        const wrappedContent = `<div>${tempTextContent}</div>`;
        if (wrappedContent !== treeNode.html) {
            treeService.editNodeHtml(treeNode.id, wrappedContent);
        }
    }, [tempTextContent, treeNode.html, treeService, treeNode.id]);

    useEffect(() => {
        if (!isNodeBeingEdited) {
            updateNodeHtml();
        }
    }, [isNodeBeingEdited, updateNodeHtml]);

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
                    onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                        setIsNodeBeingEdited(true);
                        event.target.select();
                    }}
                    onBlur={() => {
                        updateNodeHtml();
                        setIsNodeBeingEdited(false);
                    }}
                />
            ) : (
                <div onClick={() => setIsNodeBeingEdited(true)} dangerouslySetInnerHTML={{ __html: treeNode.html }} />
            )}
        </div>
    );
};