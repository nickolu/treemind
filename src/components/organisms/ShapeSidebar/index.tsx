'use client';
import {DragEvent} from 'react';
import {ButtonBase, Tooltip, Typography} from '@mui/material';
import {ShapeGlyph} from '@/components/atoms/NodeShape';
import {
  SHAPE_GROUPS,
  ShapeChoice,
  shapeHint,
} from '@/components/molecules/ShapePicker/shapeGroups';

/** MIME type of a shape dragged from the sidebar onto the canvas. */
export const SHAPE_DRAG_TYPE = 'application/x-treemind-shape';

/**
 * Shapes to pick as the default for double-click, or to drag onto the canvas.
 */
export function ShapeSidebar({
  shape,
  onSelect,
}: {
  shape: ShapeChoice;
  onSelect: (shape: ShapeChoice) => void;
}) {
  const onDragStart = (event: DragEvent, id: ShapeChoice) => {
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, id ?? 'topic');
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="mm-shapes" aria-label="Shapes">
      {SHAPE_GROUPS.map((group) => (
        <div key={group.title} className="mm-shapes__group">
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{lineHeight: '24px'}}
          >
            {group.title}
          </Typography>
          <div className="mm-shapes__grid">
            {group.items.map(({id, name}) => (
              <Tooltip
                key={name}
                title={`${name}: drag onto the map, or click to use for new nodes${
                  shapeHint(id, name) !== name ? `. ${shapeHint(id, name)}` : ''
                }`}
                placement="right"
                disableInteractive
              >
                <ButtonBase
                  className={`mm-shape-option ${shape === id ? 'mm-shape-option--current' : ''}`}
                  draggable
                  onDragStart={(event) => onDragStart(event, id)}
                  onClick={(event) => {
                    onSelect(id);
                    // Give focus back to the page so the map's shortcuts
                    // (which ignore keys typed in buttons) keep working.
                    event.currentTarget.blur();
                  }}
                  aria-pressed={shape === id}
                  aria-label={name}
                >
                  <ShapeGlyph shape={id ?? 'topic'} />
                  <span>{name}</span>
                </ButtonBase>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
