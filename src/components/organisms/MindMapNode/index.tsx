"use client";
import 'react-quill/dist/quill.snow.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import { useMindMapStateContext } from '@/components/organisms/MindMapState/useMindMapStateContext';
import { TreeNode } from '@/components/molecules/TreeNode';
import { NodeControls } from '@/components/molecules/NodeControls';
import { EditorModal } from '@/components/molecules/EditorModal';
import { parseTextFromHtml } from '@/components/atoms/parseTextFromHtml';
import { NodeHtmlRenderer } from '@/components/atoms/NodeHtmlRenderer';
import { useTreeServiceContext } from '@/components/organisms/TreeService/useTreeServiceContext';

export const MindMapNode: React.FC<{
  treeNode: TreeNode;
}> = ({
  treeNode,
}) => {
    const { selectedNodeId, setSelectedNodeId, isNodeBeingEdited, setIsNodeBeingEdited, setAreKeyboardEventsEnabled } = useMindMapStateContext();
    const treeService = useTreeServiceContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [text, setText] = useState('');
    const [html, setHtml] = useState(treeNode.html);
    const [hasChanged, setHasChanged] = useState(false);

    const textEditorRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      console.log('on html change');
      const updatedText = parseTextFromHtml(html);
      setText(updatedText);
      console.log('html', html);
      console.log('updatedText', updatedText);
    }, [html]);

    useEffect(() => {
      if (isNodeBeingEdited && selectedNodeId === treeNode.id) {
        console.log('isNodeBeingEdited', isNodeBeingEdited);
        setText(treeNode.text);
      }
    }, [isNodeBeingEdited, selectedNodeId, treeNode.id, treeNode.text]);

    useEffect(() => {
      setAreKeyboardEventsEnabled(!isNodeBeingEdited);
    }, [isNodeBeingEdited, setAreKeyboardEventsEnabled]);

    useEffect(() => {
      if (selectedNodeId) {
        textEditorRef.current?.focus();
      } else {
        textEditorRef.current?.blur();
      }
    }, [selectedNodeId]);

    useEffect(() => {
      setAreKeyboardEventsEnabled(!isModalOpen);
    }, [isModalOpen])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        console.log('handleKeyDown');
        e.preventDefault();
        e.stopPropagation();
        setIsNodeBeingEdited(false);
        setHasChanged(false);

        if (e.key === 'Enter') {
          textEditorRef.current?.blur();
        }
      }
    }, []);

    const handleTextChange = useCallback((newText: string) => {
      setHasChanged(true);
      setText(newText);
    }, []);

    const handleBlur = useCallback(() => {
      setIsNodeBeingEdited(false);
      if (hasChanged) {
        const newHtml = `<div>${text}</div>`;
        setHtml(newHtml);
        treeService.editNodeHtml(treeNode.id, newHtml);
        setHasChanged(false);
      }
    }, [hasChanged, text, treeNode.id, treeService]);

    return (
      <Box
        key={treeNode.id}
        id={treeNode.id}
        tabIndex={0}
        onFocus={() => {
          setSelectedNodeId(treeNode.id)
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
        <div>
          {isNodeBeingEdited && selectedNodeId === treeNode.id ? (
            <TextField
              autoFocus
              size='small'
              variant='standard'
              value={text}
              inputRef={textEditorRef}
              multiline
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                handleTextChange(e.target.value);
              }}
              onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                setIsNodeBeingEdited(true);
                event.target.select();
              }}
              onBlur={handleBlur}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e)}
            />
          ) : (
            <div onDoubleClick={() => setIsNodeBeingEdited(true)}><NodeHtmlRenderer html={html} /></div>
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
