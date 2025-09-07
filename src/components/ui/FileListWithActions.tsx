// src/components/ui/FileListWithActions.tsx
"use client";

import React, { useState } from 'react';
import { Trash2, Eye, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Attachment } from '@/types';
import { getFileIcon } from '@/lib/file-utils';

interface FileListWithActionsProps {
  files: Attachment[];
  onViewFile?: (url: string) => void;
  onDeleteFile?: (file: Attachment) => Promise<void>;
  showActions?: boolean;
  title?: string;
}

export default function FileListWithActions({ 
  files, 
  onViewFile, 
  onDeleteFile, 
  showActions = true,
  title = "ไฟล์ที่อัปโหลด"
}: FileListWithActionsProps) {
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [deletedFiles, setDeletedFiles] = useState<Set<string>>(new Set());

  const handleDelete = async (file: Attachment) => {
    if (!onDeleteFile) return;

    try {
      setDeletingFiles(prev => new Set(prev).add(file.url));
      await onDeleteFile(file);
      setDeletedFiles(prev => new Set(prev).add(file.url));
      
      // Remove from deleting state after success
      setTimeout(() => {
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.url);
          return newSet;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error deleting file:', error);
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.url);
        return newSet;
      });
    }
  };

  const handleDownload = (file: Attachment) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">ยังไม่มีไฟล์ที่อัปโหลด</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="text-sm text-gray-500">{files.length} ไฟล์</span>
      </div>
      
      <div className="space-y-2">
        {files.map((file, index) => {
          const isDeleting = deletingFiles.has(file.url);
          const isDeleted = deletedFiles.has(file.url);
          
          return (
            <div
              key={`${file.url}-${index}`}
              className={`
                flex items-center justify-between p-3 bg-gray-50 rounded-lg border transition-all duration-300
                ${isDeleted 
                  ? 'bg-green-50 border-green-200 opacity-75' 
                  : isDeleting 
                  ? 'bg-red-50 border-red-200 animate-pulse' 
                  : 'hover:bg-gray-100 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className={`
                    text-sm font-medium text-gray-900 truncate
                    ${isDeleted ? 'line-through' : ''}
                  `}>
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{file.type}</span>
                    {isDeleted && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle size={12} />
                        <span>ลบแล้ว</span>
                      </div>
                    )}
                    {isDeleting && (
                      <span className="text-red-600 animate-pulse">กำลังลบ...</span>
                    )}
                  </div>
                </div>
              </div>

              {!isDeleted && (
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {onViewFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewFile(file.url)}
                      disabled={isDeleting}
                      className="h-9 w-9 p-0 rounded-full hover:bg-blue-100"
                      title="ดูไฟล์"
                    >
                      <Eye size={16} className="text-blue-600" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    disabled={isDeleting}
                    className="h-9 w-9 p-0 rounded-full hover:bg-green-100"
                    title="ดาวน์โหลด"
                  >
                    <Download size={16} className="text-green-600" />
                  </Button>

                  {onDeleteFile && showActions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file)}
                      disabled={isDeleting}
                      className="h-9 w-9 p-0 rounded-full hover:bg-red-100 disabled:opacity-50"
                      title="ลบไฟล์"
                    >
                      <Trash2
                        size={16}
                        className={`${isDeleting ? 'text-red-400 animate-spin' : 'text-red-600'}`}
                      />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="text-xs text-gray-500 pt-2 border-t">
        <div className="flex justify-between">
          <span>ทั้งหมด {files.length} ไฟล์</span>
          {deletedFiles.size > 0 && (
            <span className="text-green-600">ลบแล้ว {deletedFiles.size} ไฟล์</span>
          )}
        </div>
      </div>
    </div>
  );
}