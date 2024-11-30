import { TreeNode, TreeNodeJson } from '@/components/molecules/TreeNode';

export function serializeTreeToJson(node: TreeNode): TreeNodeJson {
  return {
    id: node.id,
    parentId: node.parentId,
    html: node.html,
    children: node.children.map(child => serializeTreeToJson(child))
  };
}

export function deserializeJsonToTree(json: TreeNodeJson): TreeNode {
  const node = new TreeNode({
    id: json.id,
    parentId: json.parentId,
    html: json.html,
    children: []
  });
  
  node.children = json.children.map(child => deserializeJsonToTree(child));
  return node;
}

export async function saveMindMapToFile(root: TreeNode) {
  const json = serializeTreeToJson(root);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadMindMapFromFile(): Promise<TreeNode | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const tree = deserializeJsonToTree(json);
          resolve(tree);
        } catch (error) {
          console.error('Error parsing mindmap file:', error);
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  });
}
