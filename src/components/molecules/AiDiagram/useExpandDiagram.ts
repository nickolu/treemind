'use client';
import {RefObject, useCallback, useRef} from 'react';
import {MindNode, findNode} from '@/domain/MindMap/tree';
import {
  ExpandDiagramRequest,
  ExpandDiagramResponse,
  describeDiagram,
  toGeneration,
} from '@/app/utils/diagramAi';
import type {
  MindMapActions,
  MindMapState,
} from '@/components/organisms/MindMapStore/useMindMapStore';
import type {AiSettings} from './useAiSettings';

function leaves(node: MindNode, result: string[] = []): string[] {
  if (node.children.length === 0) result.push(node.id);
  node.children.forEach((child) => leaves(child, result));
  return result;
}

/**
 * "Add detail": asks the AI for one more level of detail on a node, or on
 * every leaf of the map, together with the link changes that implies. The
 * result is applied as a single undoable step.
 */
export function useExpandDiagram(
  stateRef: RefObject<MindMapState>,
  settingsRef: RefObject<AiSettings>,
  actions: MindMapActions,
  notify: (message: string, severity?: 'success' | 'error' | 'info') => void,
) {
  const busy = useRef(false);

  const run = useCallback(
    async (mode: ExpandDiagramRequest['mode'], nodeId?: string) => {
      const state = stateRef.current;
      const settings = settingsRef.current;
      if (!state || !settings || busy.current) return;
      const {root, links, context} = state;

      const targetIds =
        mode === 'node' ? (nodeId ? [nodeId] : []) : leaves(root);
      if (targetIds.length === 0 || !findNode(root, targetIds[0])) return;

      const prompt = describeDiagram(root, links, targetIds);
      busy.current = true;
      targetIds.forEach((id) => actions.setGenerating(id, true));
      try {
        const body: ExpandDiagramRequest = {
          map: prompt.map,
          targets: prompt.targets,
          mode,
          context,
          strict: settings.strict,
          model: settings.model,
        };
        const res = await fetch('/api/expandDiagram', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.nodes)) {
          throw new Error(data.error || 'The AI service returned an error.');
        }

        // Map against the tree as it is now; anything deleted meanwhile is skipped.
        const current = stateRef.current?.root ?? root;
        const generation = toGeneration(
          data as ExpandDiagramResponse,
          prompt,
          current,
          (id) => findNode(current, id),
          !!context.trim() && !settings.strict,
        );
        const changes =
          generation.nodes.length +
          generation.updates.length +
          generation.addLinks.length +
          generation.removeLinkIds.length;
        if (changes === 0) {
          notify(
            context.trim() && settings.strict
              ? 'The context has no further detail for this.'
              : 'No further detail to add.',
            'info',
          );
          return;
        }
        actions.applyGeneration(generation);
      } catch (error) {
        notify(
          `Couldn't add detail: ${error instanceof Error ? error.message : 'unknown error'}`,
          'error',
        );
      } finally {
        busy.current = false;
        targetIds.forEach((id) => actions.setGenerating(id, false));
      }
    },
    [stateRef, settingsRef, actions, notify],
  );

  return {
    expandNode: useCallback((id: string) => run('node', id), [run]),
    expandAll: useCallback(() => run('all'), [run]),
  };
}
