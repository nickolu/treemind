import { Handle, NodeProps, Position } from "reactflow";
import { Box, Button, IconButton } from "@mui/material";
import { useTreeServiceContext } from "@/components/organisms/TreeService/useTreeServiceContext";
import { MindMapNode } from "@/components/organisms/MindMapNode";
import { TreeNode } from "@/components/molecules/TreeNode";
import { useEffect, useState } from "react";
import { getMindMapContextForNode } from "@/app/utils/getMindMapContextForNode";
import { TreeService } from "@/types/tree";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

function useAiGeneratedNodes(treeService: TreeService, node: TreeNode) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nodesText, setNodesText] = useState<string[]>([]);

    async function generateNodes() {
        const mindMapContext = getMindMapContextForNode(treeService.tree, node);
        setError(null);
        try {
            setIsLoading(true);

            const res = await fetch("/api/generateContextualNodes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: mindMapContext }),
            });
            const data = await res.json();
            console.log('data', data);
            if (data.nodes) {
                console.log('data.nodes', data.nodes);
                setNodesText(data.nodes);
            } else {
                setError("Unable to generate recommendations");
            }
        } catch (error) {
            console.error("Error:", error);
            setError("Unable to generate recommendations");
        } finally {
            setIsLoading(false);
        }
    }

    return {
        isLoading,
        error,
        nodesText,
        generateNodes
    };
}


export const ReactFlowMindMapNode = ({ data }: NodeProps<TreeNode>) => {
    const treeService = useTreeServiceContext();
    const treeNode = new TreeNode({
        id: data.id,
        children: data.children,
        parentId: data.parentId,
        html: data._html
    });
    const isRoot = treeNode.id === treeService.tree.root.id;
    const { nodesText: childNodesText, isLoading: areChildNodesLoading, generateNodes: generateChildNodes } = useAiGeneratedNodes(treeService, treeNode, 'child');
    const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (childNodesText && childNodesText.length > 0) {
            childNodesText.forEach((text) => {
                treeService.insertNode(treeNode.id, text);
            });
        }
    }, [childNodesText]);

    useEffect(() => {
        if (areChildNodesLoading) {
            const loadingNode = treeService.insertNode(treeNode.id, 'Loading...');
            setLoadingNodeId(loadingNode.id);
        } else {
            if (loadingNodeId) {
                treeService.deleteNode(loadingNodeId);
                setLoadingNodeId(null);
            }
        }
        return () => {
            if (loadingNodeId) {
                treeService.deleteNode(loadingNodeId);
                setLoadingNodeId(null);
            }
        };
    }, [areChildNodesLoading]);

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
            <Box display="flex">
                <IconButton size="small" onClick={() => generateChildNodes()}>
                    <AutoFixHighIcon />
                </IconButton>
            </Box>
        </Box>
    );
};
