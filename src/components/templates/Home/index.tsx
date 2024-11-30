"use client";
import { Box } from '@mui/material';
import { ReactFlowMindMap } from '@/components/organisms/ReactFlowMindMap';
import { useTreeService } from '@/components/organisms/TreeService/useTreeService';
import { TreeServiceContext } from '@/components/organisms/TreeService/TreeServiceContext';
import { MindMapStateContext } from '@/components/organisms/MindMapState/MindMapStateContext';
import { useMindMapState } from '@/components/organisms/MindMapState/useMindMapState';

function HomePage() {
    const treeService = useTreeService();
    const mindMapState = useMindMapState()
    const tree = treeService.tree;

    return (
        <TreeServiceContext.Provider value={treeService}>
            <MindMapStateContext.Provider value={mindMapState}>
                <Box sx={{ margin: '20px auto', padding: '0 20px', }}>
                    <ReactFlowMindMap treeData={tree.root} />
                </Box>
            </MindMapStateContext.Provider>
        </TreeServiceContext.Provider>
    );
}

export { HomePage }