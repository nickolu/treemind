'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { TreeNode } from '@/domain/TreeNode';
import { EditorModal } from '@/components/molecules/EditorModal';
import { parseTextFromHtml } from '@/app/utils/parseTextFromHtml';
import { NodeHtmlRenderer } from '@/components/atoms/NodeHtmlRenderer';
import { useTreeServiceContext } from '@/components/organisms/TreeService/useTreeServiceContext';

export const MindMapNode: React.FC<{
  treeNode: TreeNode;
}> = ({ treeNode }) => {
  const {
    selectedNodeId,
    setSelectedNodeId,
    isNodeBeingEdited: isEditingNode,
    setIsNodeBeingEdited: setIsEditing,
    setAreKeyboardEventsEnabled,
    isEditorModalOpen: isModalOpen,
    setIsEditorModalOpen: setIsModalOpen,
  } = useMindMapStateContext();
  const treeService = useTreeServiceContext();

  const [text, setText] = useState('');
  const [html, setHtml] = useState(treeNode.html);
  const [hasChanged, setHasChanged] = useState(false);

  const textEditorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updatedText = parseTextFromHtml(html);
    setText(updatedText);
  }, [html]);

  useEffect(() => {
    if (isEditingNode && selectedNodeId === treeNode.id) {
      console.log('isNodeBeingEdited', isEditingNode);
      setText(treeNode.text);
    }
  }, [isEditingNode, selectedNodeId, treeNode.id, treeNode.text]);

  useEffect(() => {
    setAreKeyboardEventsEnabled(!isEditingNode);
  }, [isEditingNode, setAreKeyboardEventsEnabled]);

  useEffect(() => {
    if (selectedNodeId) {
      textEditorRef.current?.focus();
    } else {
      textEditorRef.current?.blur();
    }
  }, [selectedNodeId]);

  useEffect(() => {
    setAreKeyboardEventsEnabled(!isModalOpen);
  }, [isModalOpen, setAreKeyboardEventsEnabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        console.log('handleKeyDown');
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(false);
        setHasChanged(false);

        if (e.key === 'Enter') {
          textEditorRef.current?.blur();
        }
      }
    },
    [setIsEditing],
  );

  const handleTextChange = useCallback((newText: string) => {
    setHasChanged(true);
    setText(newText);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (hasChanged) {
      const newHtml = `<div>${text}</div>`;
      setHtml(newHtml);
      treeService.editNodeHtml(treeNode.id, newHtml);
      setHasChanged(false);
    }
  }, [hasChanged, text, treeNode.id, treeService, setIsEditing]);

  return (
    <Box
      key={treeNode.id}
      id={treeNode.id}
      tabIndex={0}
      onFocus={() => {
        setSelectedNodeId(treeNode.id);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onBlur={() => setIsEditing(false)}
      sx={{
        background: selectedNodeId === treeNode.id ? 'lightblue' : 'white',
        border:
          selectedNodeId === treeNode.id ? '2px solid blue' : '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        width: 150,
        minHeight: 50,
      }}
    >
      <div>
        {isEditingNode && selectedNodeId === treeNode.id ? (
          <TextField
            autoFocus
            size="small"
            variant="standard"
            value={text}
            inputRef={textEditorRef}
            multiline
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleTextChange(e.target.value);
            }}
            onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
              setIsEditing(true);
              event.target.select();
            }}
            onBlur={handleBlur}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              handleKeyDown(e)
            }
          />
        ) : (
          <div onDoubleClick={() => setIsEditing(true)}>
            <NodeHtmlRenderer html={html} />
          </div>
        )}
      </div>

      {/* <NodeControls onClickEdit={handleOpen} /> */}
      <EditorModal
        isModalOpen={isModalOpen}
        node={treeNode}
        setIsModalOpen={setIsModalOpen}
        setHtml={setHtml}
        html={html}
      />
    </Box>
  );
};
