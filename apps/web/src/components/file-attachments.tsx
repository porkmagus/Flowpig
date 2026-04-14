import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Download,
  Loader2,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileAttachmentsProps {
  workspace: string;
  issueId: string;
}

interface Attachment {
  id: string;
  upload: {
    id: string;
    originalName: string;
    contentType: string;
    size: number;
    url: string;
  };
  attachedBy: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  createdAt: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return ImageIcon;
  if (contentType.includes('pdf')) return FileText;
  return File;
};

export function FileAttachments({ workspace, issueId }: FileAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['issue-attachments', workspace, issueId],
    queryFn: async (): Promise<{ attachments: Attachment[] }> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/uploads/issue/${issueId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load attachments');
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const uploadedAttachments: Attachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Track progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const uploadResponse = await fetch(`${API_URL}/workspaces/${workspace}/uploads`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadResult = await uploadResponse.json() as {
          upload: {
            id: string;
          };
        };

        setUploadProgress(prev => ({ ...prev, [file.name]: 70 }));

        const attachResponse = await fetch(`${API_URL}/workspaces/${workspace}/uploads/attach-to-issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ issueId, uploadId: uploadResult.upload.id }),
        });
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        if (!attachResponse.ok) {
          throw new Error(`Failed to attach ${file.name}`);
        }
        
        const result = await attachResponse.json();
        uploadedAttachments.push(result.attachment);
      }
      
      return uploadedAttachments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-attachments', workspace, issueId] });
      setUploadProgress({});
      toast.success('Files uploaded successfully');
    },
    onError: (error) => {
      setUploadProgress({});
      toast.error(error.message || 'Failed to upload files');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ uploadId }: { uploadId: string }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/uploads/${uploadId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete attachment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-attachments', workspace, issueId] });
      toast.success('Attachment removed');
    },
    onError: () => {
      toast.error('Failed to remove attachment');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadMutation.mutate(e.dataTransfer.files);
    }
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const attachments = data?.attachments || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-linear-text flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-sm text-linear-text-secondary">({attachments.length})</span>
          )}
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-linear-accent hover:bg-linear-accent/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload
        </button>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      {attachments.length === 0 && !uploadMutation.isPending && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging 
              ? 'border-linear-accent bg-linear-accent/10' 
              : 'border-linear-border hover:border-linear-border-hover'
            }
          `}
        >
          <Paperclip className="w-8 h-8 mx-auto mb-2 text-linear-text-tertiary" />
          <p className="text-sm text-linear-text-secondary">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-linear-text-tertiary mt-1">
            Max file size: 10MB
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm text-linear-text-secondary truncate">{filename}</p>
                <div className="h-1.5 bg-blue-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-blue-600">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            space-y-2 p-2 rounded-lg transition-colors
            ${isDragging ? 'bg-linear-accent/10 border-2 border-dashed border-linear-accent/40' : ''}
          `}
        >
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.upload.contentType);
            const isImage = attachment.upload.contentType.startsWith('image/');

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-linear-elevated/50 rounded-lg group hover:bg-linear-elevated transition-colors"
              >
                {/* Thumbnail or Icon */}
                {isImage ? (
                  <img
                    src={attachment.upload.url}
                    alt={attachment.upload.originalName}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-linear-text hover:text-linear-accent truncate block"
                  >
                    {attachment.upload.originalName}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-linear-text-secondary">
                    <span>{formatFileSize(attachment.upload.size)}</span>
                    <span>•</span>
                    <span>{new Date(attachment.createdAt).toLocaleDateString()}</span>
                    {attachment.attachedBy && (
                      <>
                        <span>•</span>
                        <span>by {attachment.attachedBy.name || 'Unknown'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.upload.url}
                    download={attachment.upload.originalName}
                    className="p-1.5 hover:bg-linear-elevated rounded text-linear-text-secondary hover:text-linear-text-secondary"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => deleteMutation.mutate({ uploadId: attachment.upload.id })}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 hover:bg-red-100 rounded text-linear-text-secondary hover:text-red-600"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Drop hint when dragging */}
          {isDragging && (
            <div className="text-center py-4 text-linear-accent text-sm">
              Drop files to upload
            </div>
          )}
        </div>
      )}
    </div>
  );
}
