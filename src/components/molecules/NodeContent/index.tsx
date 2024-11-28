import React from 'react';
import { TreeNode } from '@/components/molecules/TreeNode';
import { NodeTextEditor } from '@/components/atoms/NodeTextEditor';
import { NodeHtmlRenderer } from '@/components/atoms/NodeHtmlRenderer';

export const NodeContent = ({
    setIsNodeBeingEdited,
    isNodeBeingEdited,
    treeNode,
    textEditorRef,
    selectedNodeId,
    setText,
    text,
    html,
    setHtml
}: {
    setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void;
    isNodeBeingEdited: boolean;
    treeNode: TreeNode;
    textEditorRef: React.RefObject<HTMLInputElement>;
    selectedNodeId: string | null;
    setText: (text: string) => void;
    text: string;
    html: string;
    setHtml: (html: string) => void
}) => {
    return (
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
    );
};