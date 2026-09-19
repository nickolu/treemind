'use client';
import {CSSProperties, memo, MouseEvent, ReactNode} from 'react';
import {Handle, NodeProps, NodeToolbar, Position} from 'reactflow';
import {CircularProgress, IconButton, Tooltip} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {NodeHtmlRenderer} from '@/components/atoms/NodeHtmlRenderer';
import {InlineNodeEditor} from '@/components/atoms/InlineNodeEditor';
import {useMindMapActions} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {shortcutLabel} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

export interface MindMapNodeData {
  html: string;
  depth: number;
  color: string;
  isRoot: boolean;
  childCount: number;
  collapsed: boolean;
  isEditing: boolean;
  editInitialText?: string;
  isGenerating: boolean;
  isDropTarget: boolean;
}

/** Keeps toolbar clicks from stealing keyboard focus from the canvas. */
const keepFocus = (event: MouseEvent) => event.preventDefault();

function ToolbarButton({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={title} placement="top" disableInteractive>
      <span>
        <IconButton
          size="small"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function MindMapNodeView({
  id,
  data,
  selected,
  dragging,
}: NodeProps<MindMapNodeData>) {
  const actions = useMindMapActions();
  const hasChildren = data.childCount > 0;

  const className = [
    'mm-node',
    data.isRoot && 'mm-node--root',
    selected && 'mm-node--selected',
    data.isGenerating && 'mm-node--generating',
    data.isDropTarget && 'mm-node--drop-target',
    dragging && 'mm-node--dragging',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={{'--branch': data.color} as CSSProperties}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="mm-handle"
        isConnectable={false}
      />

      {data.isEditing ? (
        <InlineNodeEditor
          nodeId={id}
          html={data.html}
          initialText={data.editInitialText}
        />
      ) : data.html ? (
        <NodeHtmlRenderer html={data.html} />
      ) : (
        <span className="mm-node__placeholder">Untitled</span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="mm-handle"
        isConnectable={false}
      />

      {hasChildren && (
        <button
          type="button"
          tabIndex={-1}
          className={`mm-collapse nodrag ${data.collapsed ? 'mm-collapse--collapsed' : ''}`}
          aria-label={data.collapsed ? 'Expand branch' : 'Collapse branch'}
          title={`${data.collapsed ? 'Expand' : 'Collapse'} (${shortcutLabel('toggleCollapse')})`}
          onMouseDown={keepFocus}
          onClick={(event) => {
            event.stopPropagation();
            actions.toggleCollapsed(id);
          }}
        >
          {data.collapsed ? data.childCount : '–'}
        </button>
      )}

      <NodeToolbar
        isVisible={selected && !data.isEditing && !dragging}
        position={Position.Top}
        offset={8}
      >
        <div className="mm-toolbar nodrag">
          <ToolbarButton
            title={`Add child (${shortcutLabel('addChild')})`}
            onClick={() => actions.addChild(id)}
          >
            <AddIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            title={`Generate ideas with AI (${shortcutLabel('generate')})`}
            onClick={() => actions.generateIdeas(id)}
            disabled={data.isGenerating}
          >
            {data.isGenerating ? (
              <CircularProgress size={16} />
            ) : (
              <AutoAwesomeIcon fontSize="small" />
            )}
          </ToolbarButton>
          <ToolbarButton
            title={`Formatted editor (${shortcutLabel('richEditor')})`}
            onClick={() => actions.openRichEditor(id)}
          >
            <TextFieldsIcon fontSize="small" />
          </ToolbarButton>
          {!data.isRoot && (
            <ToolbarButton
              title={`Delete (${shortcutLabel('delete')})`}
              onClick={() => actions.deleteNode(id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </ToolbarButton>
          )}
        </div>
      </NodeToolbar>
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeView);
