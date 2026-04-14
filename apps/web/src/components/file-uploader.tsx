import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API_URL } from '~/lib/api';

interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

interface FileUploaderProps {
  workspaceId: string;
  onUploadComplete?: (files: Array<{ id: string; url: string; name: string; size: number }>) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
}

export function FileUploader({
  workspaceId,
  onUploadComplete,
  onUploadError,
  accept = '*',
  maxSize = 50,
  multiple = true,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (fileUpload: FileUpload) => {
      const formData = new FormData();
      formData.append('file', fileUpload.file);

      const response = await fetch(`${API_URL}/workspaces/${workspaceId}/uploads`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: (data, fileUpload) => {
      setFiles(prev =>
        prev.map(f =>
          f.id === fileUpload.id
            ? { ...f, status: 'completed', progress: 100, url: data.upload.url }
            : f
        )
      );

      const completedFiles = files
        .filter(f => f.status === 'completed' || (f.id === fileUpload.id && data.upload.url))
        .map(f => ({
          id: f.id,
          url: f.url || data.upload.url,
          name: f.file.name,
          size: f.file.size,
        }));

      onUploadComplete?.(completedFiles);
    },
    onError: (error, fileUpload) => {
      setFiles(prev =>
        prev.map(f =>
          f.id === fileUpload.id
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    },
  });

  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    newFiles.forEach(fileUpload => {
      if (fileUpload.file.size > maxSize * 1024 * 1024) {
        setFiles(prev =>
          prev.map(f =>
            f.id === fileUpload.id
              ? { ...f, status: 'error', error: `File too large (max ${maxSize}MB)` }
              : f
          )
        );
        return;
      }

      uploadMutation.mutate(fileUpload);
    });
  }, [maxSize, uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-linear-text-secondary" />;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-linear-accent bg-linear-accent/10' : 'border-linear-border hover:border-linear-border-hover'}
        `}
      >
        <Upload className="w-10 h-10 text-linear-text-tertiary mx-auto mb-3" />
        <p className="text-linear-text-secondary font-medium">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-linear-text-tertiary mt-1">
          Max {maxSize}MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((fileUpload) => (
              <motion.div
                key={fileUpload.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-linear-elevated/50 rounded-lg"
              >
                {getFileIcon(fileUpload.file)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-linear-text truncate">
                    {fileUpload.file.name}
                  </p>
                  <p className="text-xs text-linear-text-secondary">
                    {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {/* Progress bar */}
                  {fileUpload.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-linear-elevated rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-linear-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {fileUpload.status === 'completed' && (
                    <span className="text-xs text-green-600">Upload complete</span>
                  )}
                  
                  {fileUpload.status === 'error' && (
                    <span className="text-xs text-red-600">{fileUpload.error}</span>
                  )}
                </div>

                <button
                  onClick={() => removeFile(fileUpload.id)}
                  className="p-1 hover:bg-linear-elevated rounded transition-colors"
                >
                  <X className="w-4 h-4 text-linear-text-tertiary" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
