'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {MindNode} from '@/domain/MindMap/tree';
import {MindLink} from '@/domain/MindMap/links';
import {LayoutKind} from '@/domain/MindMap/document';
import {Layout, Size, computeLayout} from './layout';
import {computeElkLayout} from './elkLayout';

/**
 * The layout to draw. Most layouts are computed synchronously; the auto
 * diagram (and freeform before anything has been placed, which starts from
 * the same arrangement) runs ELK asynchronously, and until it finishes the
 * previous layout stays on screen.
 */
export function useCanvasLayout(
  kind: LayoutKind,
  root: MindNode,
  links: MindLink[],
  sizes: ReadonlyMap<string, Size>,
): Layout {
  const sync = useMemo(
    () => computeLayout(kind, root, sizes),
    [kind, root, sizes],
  );

  const [elk, setElk] = useState<{layout: Layout; kind: LayoutKind} | null>(
    null,
  );
  const needsElk = sync === null;
  useEffect(() => {
    if (!needsElk) return;
    let cancelled = false;
    computeElkLayout(root, links, sizes)
      .then((layout) => {
        if (!cancelled) setElk({layout: {...layout, kind}, kind});
      })
      .catch((error) => console.error('Diagram layout failed:', error));
    return () => {
      cancelled = true;
    };
  }, [needsElk, kind, root, links, sizes]);

  const last = useRef<Layout | null>(null);
  const layout =
    sync ??
    (elk?.kind === kind ? elk.layout : null) ??
    last.current ??
    computeLayout('mindmap', root, sizes)!;
  last.current = layout;
  return layout;
}
