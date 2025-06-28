import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useFileSystem(sessionId: string) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const readFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await apiRequest(
        "GET", 
        `/api/files/${sessionId}/content?path=${encodeURIComponent(filePath)}`
      );
      return response.json();
    },
  });

  const writeFileMutation = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/files/${sessionId}/content`,
        { path, content }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId, 'tree'] });
      toast({
        title: "File saved",
        description: "Your file has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await apiRequest(
        "DELETE", 
        `/api/files/${sessionId}/content?path=${encodeURIComponent(filePath)}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId, 'tree'] });
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, targetPath }: { file: File; targetPath: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', targetPath);

      const response = await fetch(`/api/files/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId, 'tree'] });
      setUploadProgress(0);
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Failed to upload file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeCommandMutation = useMutation({
    mutationFn: async ({ command, args }: { command: string; args?: string[] }) => {
      const response = await apiRequest(
        "POST", 
        `/api/execute/${sessionId}`,
        { command, args }
      );
      return response.json();
    },
  });

  return {
    readFile: readFileMutation.mutateAsync,
    writeFile: writeFileMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    uploadFile: uploadFileMutation.mutateAsync,
    executeCommand: executeCommandMutation.mutateAsync,
    isReadingFile: readFileMutation.isPending,
    isWritingFile: writeFileMutation.isPending,
    isDeletingFile: deleteFileMutation.isPending,
    isUploadingFile: uploadFileMutation.isPending,
    isExecutingCommand: executeCommandMutation.isPending,
    uploadProgress,
  };
}
