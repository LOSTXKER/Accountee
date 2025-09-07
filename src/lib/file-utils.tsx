// src/lib/file-utils.tsx
import { FileText, Image as ImageIcon } from 'lucide-react';
import React from 'react';

// Function to get a file icon based on MIME type
export const getFileIcon = (fileType: string): React.ReactNode => {
    if (fileType.startsWith('image/')) {
        return <ImageIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />;
    }
    if (fileType === 'application/pdf') {
        return <FileText className="h-6 w-6 text-red-500 flex-shrink-0" />;
    }
    return <FileText className="h-6 w-6 text-gray-500 flex-shrink-0" />;
};
