import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  File, 
  ChevronRight, 
  ChevronDown,
  RefreshCw 
} from "lucide-react";
import type { FileTreeNode } from "@shared/schema";

interface FileExplorerProps {
  fileTree: FileTreeNode[];
  onFileOpen: (node: FileTreeNode) => void;
  onRefresh: () => void;
}

interface FileNodeProps {
  node: FileTreeNode;
  level: number;
  onFileOpen: (node: FileTreeNode) => void;
}

function FileNode({ node, level, onFileOpen }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileOpen(node);
    }
  };

  const getFileIcon = (node: FileTreeNode) => {
    if (node.type === 'directory') {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-warning-yellow" />
      ) : (
        <Folder className="h-4 w-4 text-warning-yellow" />
      );
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    if (['js', 'ts', 'py', 'html', 'css'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-accent-blue" />;
    }

    return <File className="h-4 w-4 text-text-secondary" />;
  };

  return (
    <div>
      <div
        className="flex items-center py-1 px-2 hover:bg-border-color rounded cursor-pointer text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1 text-text-secondary" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1 text-text-secondary" />
            )}
          </>
        )}
        {getFileIcon(node)}
        <span className="ml-2 truncate">{node.name}</span>
        {node.type === 'file' && node.size && (
          <span className="ml-auto text-xs text-text-secondary">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNode
              key={child.id}
              node={child}
              level={level + 1}
              onFileOpen={onFileOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({ fileTree, onFileOpen, onRefresh }: FileExplorerProps) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">Files</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-6 w-6 p-0 text-text-secondary hover:text-text-primary"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-1">
        {fileTree.length === 0 ? (
          <div className="text-xs text-text-secondary text-center py-4">
            No files found
          </div>
        ) : (
          fileTree.map((node) => (
            <FileNode
              key={node.id}
              node={node}
              level={0}
              onFileOpen={onFileOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
