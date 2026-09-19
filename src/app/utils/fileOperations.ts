import {MindNode, normalizeTree, serializeTree} from '@/domain/MindMap/tree';
import {htmlToText} from '@/domain/MindMap/html';

function fileNameFor(root: MindNode) {
  const slug = htmlToText(root.html)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${slug || 'mindmap'}.json`;
}

export function saveMindMapToFile(root: MindNode) {
  const blob = new Blob([JSON.stringify(serializeTree(root), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(root);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and resolves with the parsed tree, or null if the user
 * cancelled. Rejects if the file isn't a valid mind map.
 */
export function loadMindMapFromFile(): Promise<MindNode | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('cancel', () => resolve(null));
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(normalizeTree(JSON.parse(await file.text())));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
