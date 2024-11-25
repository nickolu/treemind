
import { createContext, useContext } from "react";
import { TreeService } from "@/components/Tree/useTreeService";

export const treeContext = createContext<TreeService | null>(null);

export default function useTreeContext() {
    const context = useContext(treeContext);
    if (context === null) {
        throw new Error("useTreeContext must be used within a TreeProvider");
    }
    return context;
}
