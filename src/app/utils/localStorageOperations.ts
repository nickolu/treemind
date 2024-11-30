import { TreeNode } from '@/domain/TreeNode';
import { serializeTreeToJson, deserializeJsonToTree } from './fileOperations';

const MINDMAP_STORAGE_KEY = 'treemind_current_map';

export function saveMindMapToLocalStorage(root: TreeNode): void {
  try {
    const json = serializeTreeToJson(root);
    localStorage.setItem(MINDMAP_STORAGE_KEY, JSON.stringify(json));
  } catch (error) {
    console.error('Error saving mindmap to localStorage:', error);
  }
}

export function loadMindMapFromLocalStorage(): TreeNode | null {
  try {
    const storedData = localStorage.getItem(MINDMAP_STORAGE_KEY);
    if (!storedData) return null;
    
    const json = JSON.parse(storedData);
    return deserializeJsonToTree(json);
  } catch (error) {
    console.error('Error loading mindmap from localStorage:', error);
    return null;
  }
}
