'use client';
import {CSSProperties, memo, MouseEvent, ReactNode, useState} from 'react';
import {Handle, NodeProps, NodeToolbar, Position} from 'reactflow';
import {CircularProgress, IconButton, Tooltip} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddLinkIcon from '@mui/icons-material/AddLink';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {NodeOrigin, UmlClass} from '@/domain/MindMap/tree';
import {NodeShape} from '@/domain/MindMap/shapes';
import {
  ComponentBadge,
  FIGURE_SHAPES,
  ShapeFigure,
  ShapeOutline,
  hasOutline,
} from '@/components/atoms/NodeShape';
import {ShapePicker} from '@/components/molecules/ShapePicker';
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
  umlClass?: UmlClass;
  origin?: NodeOrigin;
  shape?: NodeShape;
  /** Drawn as a box around its children (diagram layouts). */
  container: boolean;
  floating: boolean;
  /** Link mode is drawing a link from this node. */
  isLinkSource: boolean;
}

/** Abstract types and interfaces are named in italics, as in UML. */
const ITALIC_STEREOTYPE = /^\s*(interface|abstract)\b/i;

function Compartment({items}: {items: string[]}) {
  return (
    <ul className="mm-class__compartment">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
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
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
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
            onClick(event);
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
  const [shapeAnchor, setShapeAnchor] = useState<HTMLElement | null>(null);
  const hasChildren = data.childCount > 0;
  const uml = data.umlClass;
  // Classes and containers have their own look; otherwise the shape applies.
  const shape = !uml && !data.container ? data.shape : undefined;
  const figure = shape && FIGURE_SHAPES.has(shape);

  const className = [
    'mm-node',
    data.container && 'mm-node--container',
    data.isRoot && !data.container && !shape && 'mm-node--root',
    uml && 'mm-node--class',
    shape && `mm-node--shape mm-shape--${shape}`,
    figure && 'mm-node--figure',
    data.floating && 'mm-node--floating',
    data.isLinkSource && 'mm-node--link-source',
    data.origin === 'inferred' && 'mm-node--inferred',
    selected && 'mm-node--selected',
    data.isGenerating && 'mm-node--generating',
    data.isDropTarget && 'mm-node--drop-target',
    dragging && 'mm-node--dragging',
  ]
    .filter(Boolean)
    .join(' ');

  const title = data.isEditing ? (
    <InlineNodeEditor
      nodeId={id}
      html={data.html}
      initialText={data.editInitialText}
    />
  ) : data.html ? (
    <NodeHtmlRenderer html={data.html} />
  ) : (
    <span className="mm-node__placeholder">Untitled</span>
  );

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

      {data.container ? (
        <div className="mm-container__header">
          <div className="mm-container__title">{title}</div>
        </div>
      ) : figure ? (
        <>
          <ShapeFigure shape={shape} />
          <div className="mm-figure__label">{title}</div>
        </>
      ) : shape ? (
        <>
          {hasOutline(shape) && <ShapeOutline shape={shape} />}
          {shape === 'component' && <ComponentBadge />}
          <div className="mm-shape__label">{title}</div>
        </>
      ) : uml ? (
        <div className="mm-class">
          <div className="mm-class__header">
            {uml.stereotype && (
              <div className="mm-class__stereotype">«{uml.stereotype}»</div>
            )}
            <div
              className={`mm-class__name ${ITALIC_STEREOTYPE.test(uml.stereotype) ? 'mm-class__name--italic' : ''}`}
            >
              {title}
            </div>
          </div>
          <Compartment items={uml.attributes} />
          <Compartment items={uml.operations} />
        </div>
      ) : (
        title
      )}

      <Handle
        id="tree"
        type="source"
        position={Position.Right}
        className="mm-handle"
        isConnectable={false}
      />
      {/* Dragging from this dot to another node creates a link. */}
      {!data.isEditing && (
        <Handle
          id="link"
          type="source"
          position={Position.Bottom}
          className="mm-link-handle"
          title="Drag to another node to link them"
        />
      )}

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
            title={`Add detail with AI (${shortcutLabel('addDetail')})`}
            onClick={() => actions.expandNode(id)}
            disabled={data.isGenerating}
          >
            <LayersOutlinedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            title="Link to another node (or drag the dot below the node)"
            onClick={() => actions.startLinking(id)}
          >
            <AddLinkIcon fontSize="small" />
          </ToolbarButton>
          {!data.isRoot && (
            <ToolbarButton
              title="Shape…"
              onClick={(event) => setShapeAnchor(event.currentTarget)}
            >
              <CategoryOutlinedIcon fontSize="small" />
            </ToolbarButton>
          )}
          <ToolbarButton
            title={
              uml
                ? `Edit class (${shortcutLabel('richEditor')})`
                : `Formatted editor (${shortcutLabel('richEditor')})`
            }
            onClick={() => actions.openRichEditor(id)}
          >
            {uml ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <TextFieldsIcon fontSize="small" />
            )}
          </ToolbarButton>
          {!data.isRoot && !data.floating && (
            <ToolbarButton
              title="Detach from its parent (stands on its own)"
              onClick={() => actions.detach(id)}
            >
              <LinkOffIcon fontSize="small" />
            </ToolbarButton>
          )}
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
      <ShapePicker
        anchor={shapeAnchor}
        current={uml ? 'class' : (data.shape ?? null)}
        onPick={(choice) => {
          actions.setShape(id, choice);
          setShapeAnchor(null);
        }}
        onClose={() => setShapeAnchor(null)}
      />
    </div>
  );
}

export const MindMapNode = memo(MindMapNodeView);
