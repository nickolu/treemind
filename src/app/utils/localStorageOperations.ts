import {
  MindMapDocument,
  normalizeDocument,
  serializeDocument,
} from '@/domain/MindMap/document';

const MINDMAP_STORAGE_KEY = 'treemind_current_map';

export function saveMindMapToLocalStorage(doc: MindMapDocument): void {
  try {
    localStorage.setItem(
      MINDMAP_STORAGE_KEY,
      JSON.stringify(serializeDocument(doc)),
    );
  } catch (error) {
    console.error('Error saving mindmap to localStorage:', error);
  }
}

export function loadMindMapFromLocalStorage(): MindMapDocument | null {
  try {
    const storedData = localStorage.getItem(MINDMAP_STORAGE_KEY);
    if (!storedData) return null;
    return normalizeDocument(JSON.parse(storedData));
  } catch (error) {
    console.error('Error loading mindmap from localStorage:', error);
    return null;
  }
}
