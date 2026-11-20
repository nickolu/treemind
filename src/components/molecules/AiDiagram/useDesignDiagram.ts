'use client';
import {RefObject, useCallback, useRef} from 'react';
import {LAYOUTS, pickAiLayout} from '@/domain/MindMap/document';
import {applyDesign} from '@/domain/MindMap/design';
import {
  DesignDiagramRequest,
  DesignDiagramResponse,
  describeDiagram,
  toDesign,
} from '@/app/utils/diagramAi';
import type {
  MindMapActions,
  MindMapState,
} from '@/components/organisms/MindMapStore/useMindMapStore';
import type {AiSettings} from './useAiSettings';

const count = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * "Design as diagram": asks the AI to redesign the whole map's shapes,
 * classes, links and groups. The result is applied as a single undoable step.
 */
export function useDesignDiagram(
  stateRef: RefObject<MindMapState>,
  settingsRef: RefObject<AiSettings>,
  actions: MindMapActions,
  notify: (message: string, severity?: 'success' | 'error' | 'info') => void,
) {
  const busy = useRef(false);

  return useCallback(async () => {
    const state = stateRef.current;
    const settings = settingsRef.current;
    if (!state || !settings || busy.current) return;
    const {root, links} = state;
    if (root.children.length === 0) return;

    const prompt = describeDiagram(root, links, []);
    busy.current = true;
    actions.setGenerating(root.id, true);
    try {
      const body: DesignDiagramRequest = {
        map: prompt.map,
        model: settings.model,
      };
      const res = await fetch('/api/designDiagram', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.setShapes)) {
        throw new Error(data.error || 'The AI service returned an error.');
      }

      // Map against the state as it is now; anything deleted meanwhile is skipped.
      const latest = stateRef.current ?? state;
      const design = toDesign(
        data as DesignDiagramResponse,
        prompt,
        latest.root,
        latest.links,
      );
      const result = applyDesign(latest.root, latest.links, design);
      if (!result) {
        notify(
          'The map already reads well as a diagram, nothing to change.',
          'info',
        );
        return;
      }
      const next = pickAiLayout(
        data.layout,
        latest.layout,
        latest.layoutSetByUser,
      );
      actions.applyDesign(design, data.layout);

      const {shapes, classes, links: linkCount, groups, moves} = result.counts;
      const parts = [
        shapes && count(shapes, 'shape'),
        classes && count(classes, 'class', 'classes'),
        linkCount && count(linkCount, 'link'),
        groups && count(groups, 'group'),
        moves && count(moves, 'move'),
      ].filter(Boolean);
      notify(
        `Designed diagram: ${parts.join(', ')}${next ? `. Switched to ${LAYOUTS[next].name} layout.` : ''}`,
        'success',
      );
    } catch (error) {
      notify(
        `Couldn't design the diagram: ${error instanceof Error ? error.message : 'unknown error'}`,
        'error',
      );
    } finally {
      busy.current = false;
      actions.setGenerating(root.id, false);
    }
  }, [stateRef, settingsRef, actions, notify]);
}
