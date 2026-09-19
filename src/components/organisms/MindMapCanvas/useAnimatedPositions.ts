'use client';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Layout, XY} from './layout';

const DURATION_MS = 220;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Tweens node positions whenever the layout changes. Animating positions (not
 * CSS transforms) keeps edges attached to their nodes mid-animation. New nodes
 * grow out of their parent's position.
 *
 * `jumpTo` sets the current on-screen position of some nodes (e.g. where a
 * dragged subtree was dropped) and animates them to their layout slot.
 */
export function useAnimatedPositions(layout: Layout, paused: boolean) {
  const [positions, setPositions] = useState<Map<string, XY>>(
    () => new Map(layout.nodes.map((n) => [n.id, n.position])),
  );
  const currentRef = useRef(positions);
  const layoutRef = useRef(layout);
  const frameRef = useRef<number | null>(null);
  layoutRef.current = layout;

  const show = useCallback((next: Map<string, XY>) => {
    currentRef.current = next;
    setPositions(next);
  }, []);

  const animateToLayout = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const target = layoutRef.current;
    const from = new Map<string, XY>();
    target.nodes.forEach((node) => {
      const start =
        currentRef.current.get(node.id) ??
        (node.parentId ? from.get(node.parentId) : undefined) ??
        node.position;
      from.set(node.id, start);
    });

    const settled = target.nodes.every((node) => {
      const start = from.get(node.id)!;
      return start.x === node.position.x && start.y === node.position.y;
    });
    const final = new Map(target.nodes.map((n) => [n.id, n.position]));
    if (settled || prefersReducedMotion()) return show(final);

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION_MS);
      if (t === 1) {
        frameRef.current = null;
        return show(final);
      }
      const eased = easeOutCubic(t);
      const frame = new Map<string, XY>();
      target.nodes.forEach((node) => {
        const start = from.get(node.id)!;
        frame.set(node.id, {
          x: start.x + (node.position.x - start.x) * eased,
          y: start.y + (node.position.y - start.y) * eased,
        });
      });
      show(frame);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [show]);

  // Layout effect so the first frame of a new layout is already animating.
  useLayoutEffect(() => {
    if (paused) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      show(new Map(layout.nodes.map((n) => [n.id, n.position])));
      return;
    }
    animateToLayout();
  }, [layout, paused, animateToLayout, show]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const jumpTo = useCallback(
    (overrides: Map<string, XY>) => {
      const next = new Map(currentRef.current);
      overrides.forEach((position, id) => next.set(id, position));
      currentRef.current = next;
      animateToLayout();
    },
    [animateToLayout],
  );

  // Nodes the animation hasn't seen yet fall back to their layout position.
  const get = useCallback(
    (id: string): XY =>
      positions.get(id) ?? layout.byId.get(id)?.position ?? {x: 0, y: 0},
    [positions, layout],
  );

  return {get, jumpTo};
}
