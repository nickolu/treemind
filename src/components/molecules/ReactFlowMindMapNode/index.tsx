import { Handle, NodeProps, Position } from "reactflow";
import { Box } from "@mui/material";
import { useTreeServiceContext } from "@/components/organisms/TreeService/useTreeServiceContext";
import { MindMapNode } from "@/components/organisms/MindMapNode";
import { TreeNode } from "@/components/molecules/TreeNode";

export const ReactFlowMindMapNode = ({ data }: NodeProps<TreeNode>) => {
    const treeService = useTreeServiceContext();
    const treeNode = new TreeNode({
        id: data.id,
        children: data.children,
        parentId: data.parentId,
        html: data._html
    });
    const isRoot = treeNode.id === treeService.tree.root.id;

    return (
        <Box
            sx={{
                borderRadius: '5px',
                padding: '10px',
                width: 150,
                minHeight: 50,
            }}
        >
            {!isRoot && <Handle
                type="target"
                position={Position.Left}
                id="left"
                style={{ background: '#555' }}
            />}
            <MindMapNode treeNode={treeNode} />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                style={{ background: '#555' }}
            />
        </Box>
    );
};
