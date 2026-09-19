import {MindNode, normalizeTree, serializeTree} from '@/domain/MindMap/tree';

const MINDMAP_STORAGE_KEY = 'treemind_current_map';

export function saveMindMapToLocalStorage(root: MindNode): void {
  try {
    localStorage.setItem(
      MINDMAP_STORAGE_KEY,
      JSON.stringify(serializeTree(root)),
    );
  } catch (error) {
    console.error('Error saving mindmap to localStorage:', error);
  }
}

export function loadMindMapFromLocalStorage(): MindNode | null {
  try {
    const storedData = localStorage.getItem(MINDMAP_STORAGE_KEY);
    if (!storedData) return null;
    return normalizeTree(JSON.parse(storedData));
  } catch (error) {
    console.error('Error loading mindmap from localStorage:', error);
    return null;
  }
}
