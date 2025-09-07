// src/components/ui/FileViewerModal.tsx
"use client";

import { X, Trash2, Download, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from './Button';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
  fileType?: string;
  onDeleteFile?: () => Promise<void>;
  showDeleteButton?: boolean;
}

export default function FileViewerModal({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName,
  fileType,
  onDeleteFile,
  showDeleteButton = false
}: FileViewerModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !fileUrl) return null;

  // Check if the file is an image based on its extension
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  const handleDelete = async () => {
    if (!onDeleteFile) return;
    
    try {
      setIsDeleting(true);
      await onDeleteFile();
      setShowConfirmDelete(false);
      onClose();
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">
              {fileName || 'ดูเอกสาร'}
            </h2>
            {fileType && (
              <p className="text-sm text-gray-500 mt-1">{fileType}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Download Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="h-9 w-9 p-0 hover:bg-green-100 bg-transparent border-0"
              title="ดาวน์โหลด"
            >
              <Download size={18} className="text-green-600" />
            </Button>

            {/* Delete Button */}
            {showDeleteButton && onDeleteFile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting}
                className="h-9 w-9 p-0 hover:bg-red-100 disabled:opacity-50 bg-transparent border-0"
                title="ลบไฟล์"
              >
                <Trash2 size={18} className="text-red-600" />
              </Button>
            )}

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={fileName || "เอกสาร"} 
              className="max-w-full max-h-full mx-auto rounded-lg shadow-sm" 
            />
          ) : (
            <iframe 
              src={fileUrl} 
              className="w-full h-full rounded-lg border" 
              title="File Viewer"
            />
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div 
          className="fixed inset-0 bg-black/50 z-60 flex justify-center items-center p-4"
          onClick={() => setShowConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle size={24} className="text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบไฟล์</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <span className="font-medium">{fileName}</span>? 
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'กำลังลบ...' : 'ลบไฟล์'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}