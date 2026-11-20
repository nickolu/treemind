'use client';
import {useCallback, useEffect, useState} from 'react';
import {isNodeShape} from '@/domain/MindMap/shapes';
import type {ShapeChoice} from '@/components/molecules/ShapePicker/shapeGroups';

const SHAPE_KEY = 'treemind_default_shape';
const OPEN_KEY = 'treemind_shapes_open';
/** Below this width the sidebar is an overlay, so it starts closed. */
const WIDE_QUERY = '(min-width: 720px)';

const parseShape = (value: unknown): ShapeChoice =>
  value === 'class' || (typeof value === 'string' && isNodeShape(value))
    ? (value as ShapeChoice)
    : null;

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted (e.g. private mode); still applies for this session.
  }
};

/**
 * Per-browser shapes-sidebar preferences: the default shape for new nodes
 * made by double-clicking the canvas, and whether the sidebar is open.
 */
export function useShapePreference() {
  const [shape, setShapeState] = useState<ShapeChoice>(null);
  const [open, setOpenState] = useState(false);

  // Read after mount so server and client render the same markup.
  useEffect(() => {
    try {
      setShapeState(parseShape(localStorage.getItem(SHAPE_KEY)));
    } catch {
      // Unreadable: stay on the plain topic.
    }
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(OPEN_KEY);
    } catch {
      // Unreadable: use the width-based default.
    }
    setOpenState(
      stored === 'true' || stored === 'false'
        ? stored === 'true'
        : window.matchMedia(WIDE_QUERY).matches,
    );
  }, []);

  const setShape = useCallback((next: ShapeChoice) => {
    setShapeState(next);
    save(SHAPE_KEY, next ?? 'topic');
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    save(OPEN_KEY, String(next));
  }, []);

  return {shape, setShape, open, setOpen};
}
