'use client';
import {RefObject, useCallback, useEffect, useRef} from 'react';
import {findNode} from '@/domain/MindMap/tree';
import {htmlToText, textToHtml} from '@/domain/MindMap/html';
import {getMindMapContextForNode} from '@/app/utils/getMindMapContextForNode';
import type {
  MindMapActions,
  MindMapState,
} from '@/components/organisms/MindMapStore/useMindMapStore';
import type {AiSettings} from '@/components/molecules/AiDiagram/useAiSettings';
import {shortcutLabel} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

const normalize = (text: string) => text.trim().toLowerCase();

/** How long new ideas stay highlighted. */
const FLASH_MS = 2600;

/**
 * Asks the API for child ideas for a node and inserts them in one undoable
 * step. Progress is shown on the node itself rather than as a placeholder node
 * in the tree, so nothing temporary is ever saved or selectable.
 */
export function useGenerateIdeas(
  stateRef: RefObject<MindMapState>,
  settingsRef: RefObject<AiSettings>,
  actions: MindMapActions,
  notify: (message: string, severity?: 'success' | 'error' | 'info') => void,
) {
  const inFlight = useRef(new Set<string>());
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>();
  // The keyboard shortcut is mentioned once per session, right after the
  // first generation — when it's obvious what it would be for.
  const taughtShortcut = useRef(false);

  useEffect(() => () => clearTimeout(flashTimeout.current), []);

  return useCallback(
    async (nodeId: string) => {
      const root = stateRef.current?.root;
      const node = root && findNode(root, nodeId);
      if (!root || !node || inFlight.current.has(nodeId)) return;

      inFlight.current.add(nodeId);
      actions.setGenerating(nodeId, true);
      try {
        const res = await fetch('/api/generateContextualNodes', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            input: getMindMapContextForNode(root, nodeId),
            model: settingsRef.current?.model,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.nodes)) {
          throw new Error(data.error || 'The AI service returned an error.');
        }

        // Skip anything that duplicates an existing child (at insert time).
        const current =
          stateRef.current && findNode(stateRef.current.root, nodeId);
        if (!current) return; // node was deleted while we waited
        const existing = new Set(
          current.children.map((c) => normalize(htmlToText(c.html))),
        );
        const ideas = (data.nodes as unknown[])
          .filter((n): n is string => typeof n === 'string' && !!n.trim())
          .filter((n) => !existing.has(normalize(n)));

        const name = htmlToText(current.html) || 'this node';
        if (ideas.length === 0) {
          notify(
            `No new ideas for “${name}”. Try a more specific name, or add source material in the AI panel.`,
            'info',
          );
          return;
        }

        const added = actions.addChildren(nodeId, ideas.map(textToHtml));
        actions.flashNodes(added);
        clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(
          () => actions.flashNodes([]),
          FLASH_MS,
        );
        const count = `${added.length} idea${added.length === 1 ? '' : 's'}`;
        notify(
          taughtShortcut.current
            ? `Added ${count} under “${name}”.`
            : `Added ${count} — press ${shortcutLabel('generate')} on any node for more.`,
          'success',
        );
        taughtShortcut.current = true;
      } catch (error) {
        notify(
          `Couldn't generate ideas: ${error instanceof Error ? error.message : 'unknown error'}`,
          'error',
        );
      } finally {
        inFlight.current.delete(nodeId);
        actions.setGenerating(nodeId, false);
      }
    },
    [stateRef, settingsRef, actions, notify],
  );
}
