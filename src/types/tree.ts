import {TreeState} from '@/domain/Tree';
import {TreeNode} from '@/components/molecules/TreeNode';

export interface TreeService {
  tree: TreeState;
  insertNode: (parentId: string, html: string) => TreeNode;
  editNodeHtml: (nodeId: string, html: string) => void;
  deleteNode: (nodeId: string) => void;
  getNodeById: (nodeId: string) => TreeNode | undefined;
  getParentNode: (node: TreeNode) => TreeNode;
  findNodeIndex: (node: TreeNode) => number;
}

export interface MindMapNodeProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  node: TreeNode;
  treeService: TreeService;
  tempHtmlContent: string;
  setTempHtmlContent: (content: string) => void;
}
