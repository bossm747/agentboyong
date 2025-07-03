import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, 
  File, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  Search,
  FolderOpen,
  Code,
  Image,
  FileText,
  Archive,
  Music,
  Video,
  ChevronLeft,
  Home,
  RefreshCw,
  Eye,
  Copy,
  MoreVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { FileTreeNode } from "@shared/schema";

interface FileManagerPanelProps {
  sessionId: string;
}

export default function FileManagerPanel({ sessionId }: FileManagerPanelProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fileTree = [], refetch: refetchFiles } = useQuery({
    queryKey: ['/api/files', sessionId, 'tree'],
    queryFn: async () => {
      const response = await fetch(`/api/files/${sessionId}/tree`);
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const createFileMutation = useMutation({
    mutationFn: async ({ path, content, isDirectory }: { path: string; content?: string; isDirectory?: boolean }) => {
      if (isDirectory) {
        // Create directory via API call (you may need to implement this endpoint)
        const response = await apiRequest("POST", `/api/files/${sessionId}/directory`, { path });
        return response.json();
      } else {
        const response = await apiRequest("POST", `/api/files/${sessionId}/content`, {
          path,
          content: content || "",
          mimeType: getMimeType(path)
        });
        return response.json();
      }
    },
    onSuccess: () => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId] });
      setShowNewFileInput(false);
      setNewFileName("");
      toast({
        title: "Success",
        description: "File created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await apiRequest("DELETE", `/api/files/${sessionId}/content?path=${encodeURIComponent(path)}`);
      return response.json();
    },
    onSuccess: () => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId] });
      setSelectedFiles([]);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const fileName = file.name;
        const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
        
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
        
        const response = await fetch(`/api/files/${sessionId}/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${fileName}`);
        }
        
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        return response.json();
      });
      
      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId] });
      setUploadProgress({});
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error: any) => {
      setUploadProgress({});
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return <Folder className="h-4 w-4 text-blue-400" />;
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rs':
        return <Code className="h-4 w-4 text-green-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="h-4 w-4 text-purple-400" />;
      case 'md':
      case 'txt':
      case 'json':
      case 'yaml':
      case 'yml':
        return <FileText className="h-4 w-4 text-cyan-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return <Archive className="h-4 w-4 text-orange-400" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="h-4 w-4 text-pink-400" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="h-4 w-4 text-red-400" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const getMimeType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'py': 'text/x-python',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
    };
    return mimeMap[ext || ''] || 'text/plain';
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayPath = () => {
    return currentPath || '/';
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles([]);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
    setSelectedFiles([]);
  };

  const getCurrentFiles = () => {
    const findFilesInPath = (nodes: FileTreeNode[], targetPath: string): FileTreeNode[] => {
      if (targetPath === "" || targetPath === "/") {
        return nodes;
      }
      
      const pathParts = targetPath.split('/').filter(Boolean);
      let currentNodes = nodes;
      
      for (const part of pathParts) {
        const foundNode = currentNodes.find(node => node.name === part && node.type === 'directory');
        if (foundNode && foundNode.children) {
          currentNodes = foundNode.children;
        } else {
          return [];
        }
      }
      
      return currentNodes;
    };

    const files = findFilesInPath(fileTree, currentPath);
    
    if (searchQuery.trim()) {
      return files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return files;
  };

  const handleFileSelect = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    const fullPath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
    const isDirectory = newFileName.endsWith('/');
    
    createFileMutation.mutate({
      path: fullPath,
      content: isDirectory ? undefined : "",
      isDirectory
    });
  };

  const handleDeleteSelected = () => {
    selectedFiles.forEach(fileName => {
      const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      deleteFileMutation.mutate(fullPath);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadFileMutation.mutate(files);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileDownload = async (fileName: string) => {
    try {
      const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const response = await fetch(`/api/files/${sessionId}/content?path=${encodeURIComponent(fullPath)}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const data = await response.json();
      const blob = new Blob([data.content], { type: data.mimeType || 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `Downloaded ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSelected = () => {
    selectedFiles.forEach(fileName => {
      handleFileDownload(fileName);
    });
  };

  const currentFiles = getCurrentFiles();

  return (
    <div className="h-full flex flex-col bg-black border border-purple-500/30 rounded-lg overflow-hidden">
      <CardHeader className="pb-3 bg-black border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-cyan-400 flex items-center">
            <FolderOpen className="h-4 w-4 mr-2" />
            File Manager
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                refetchFiles();
              }}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerFileUpload}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
              disabled={uploadFileMutation.isPending}
            >
              <Upload className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewFileInput(!showNewFileInput)}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToPath("")}
            className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
          >
            <Home className="h-3 w-3" />
          </Button>
          {currentPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateUp}
              className="p-1 h-7 w-7 text-gray-400 hover:text-cyan-400"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
          <div className="flex-1 text-xs text-purple-300 bg-gray-800/30 px-2 py-1 rounded border border-gray-600/50">
            {getDisplayPath()}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-7 h-8 bg-gray-800/30 border-gray-600/50 text-xs text-cyan-100 placeholder-gray-400"
            />
          </div>
        </div>

        {/* New File Input */}
        {showNewFileInput && (
          <div className="flex items-center space-x-2 mt-2">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.ext or foldername/"
              className="flex-1 h-8 bg-gray-800/30 border-gray-600/50 text-xs text-cyan-100 placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateFile}
              disabled={!newFileName.trim()}
              className="h-8 px-3 text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
            >
              Create
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-2 p-2 bg-gray-800/30 rounded border border-gray-600/50">
            <div className="text-xs text-cyan-400 mb-1">Uploading files...</div>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="flex items-center space-x-2 text-xs">
                <span className="text-purple-300 truncate flex-1">{fileName}</span>
                <span className="text-gray-400">{progress}%</span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        
        <ScrollArea className="h-full">
          {currentFiles.length > 0 ? (
            <div className="p-3 space-y-1">
              {currentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.type === 'directory') {
                      navigateToPath(currentPath ? `${currentPath}/${file.name}` : file.name);
                    } else {
                      handleFileSelect(file.name);
                    }
                  }}
                  className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedFiles.includes(file.name)
                      ? 'bg-cyan-500/10 border-cyan-400/50'
                      : 'bg-gray-800/30 border-gray-600/50 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFileIcon(file.name, file.type === 'directory')}
                      <span className="text-sm text-cyan-300 truncate">
                        {file.name}
                      </span>
                      {file.type === 'directory' && (
                        <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-400/50">
                          DIR
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.type === 'file' && file.size && (
                        <span className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                      {file.type === 'file' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileDownload(file.name);
                          }}
                          className="p-1 h-6 w-6 text-gray-400 hover:text-green-400"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-center">
              <div className="text-gray-400">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery.trim() ? 'No files found' : 'Empty directory'}
                </p>
                <p className="text-xs text-purple-300 mt-1">
                  {searchQuery.trim() ? 'Try a different search term' : 'Create files here with Pareng Boyong'}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Action Bar */}
        {selectedFiles.length > 0 && (
          <div className="border-t border-purple-500/30 bg-gray-900/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-300">
                {selectedFiles.length} file(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadSelected}
                  className="h-7 px-3 text-xs text-green-400 hover:bg-green-500/20"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-7 px-3 text-xs text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                  className="h-7 px-3 text-xs text-gray-400 hover:bg-gray-500/20"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}