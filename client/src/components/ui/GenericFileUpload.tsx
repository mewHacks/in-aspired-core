import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText, ImageIcon } from 'lucide-react';

// Props definition for the reusable file upload component, handles pdf and image
interface GenericFileUploadProps {
    value?: string; // Base64 string of the file content
    onChange: (value: string, fileName?: string) => void; // Callback when file is processed
    label?: string;
    maxSizeMB?: number;
    acceptedFormats?: string[]; // MIME types array, e.g. ['application/pdf', 'image/jpeg']
    type: 'pdf' | 'image'; // Determines icon and preview behavior
}

// A reusable drag-and-drop file upload component
// Converts uploaded files to Base64 strings for easy transmission/storage
const GenericFileUpload: React.FC<GenericFileUploadProps> = ({
    value,
    onChange,
    label = "Upload File",
    maxSizeMB = 5,
    acceptedFormats = [],
    type
}) => {
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // States
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string>('');

    // Validates file size and format against props
    const validateFile = (file: File): { isValid: boolean; error?: string } => {
        // Check MIME type
        if (acceptedFormats.length > 0 && !acceptedFormats.includes(file.type)) {
            return { isValid: false, error: `Invalid format. Accepted: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}` };
        }
        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            return { isValid: false, error: `File must be smaller than ${maxSizeMB}MB` };
        }
        return { isValid: true };
    };

    // Main file processing handler
    // Reads file as DataURL (Base64)
    const processFile = (file: File) => {
        const validation = validateFile(file);
        if (!validation.isValid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setIsLoading(true);
        setError(null);
        setFileName(file.name);

        const reader = new FileReader();

        // Success handler: Return Base64 string to parent
        reader.onloadend = () => {
            const base64String = reader.result as string;
            onChange(base64String, file.name);
            setIsLoading(false);
        };

        // Error handler
        reader.onerror = () => {
            setError('Failed to read file');
            setIsLoading(false);
        };

        // Begin reading
        reader.readAsDataURL(file);
    };

    // Handle file selection via clicked input
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // Remove file handler
    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering click on the container if needed
        onChange('', '');
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input to allow re-uploading same file
    };

    // Drag & drop event handlers
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>

            {/* Determines between upload dropzone or file preview */}
            {!value ? (
                // Upload Dropzone State
                <div
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group
                        ${isDragging ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'}
                        ${error ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30' : ''}
                    `}
                >
                    {isLoading ? (
                        // Loading State
                        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500 dark:text-indigo-400" />
                            <span className="text-sm font-medium">Processing...</span>
                        </div>
                    ) : (
                        // Default Upload Prompt
                        <>
                            <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
                                <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                {isDragging ? 'Drop file here' : `Click or drag ${type === 'pdf' ? 'PDF' : 'Image'}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                Max {maxSizeMB}MB
                            </p>
                        </>
                    )}

                    {/* Error Message Display */}
                    {error && (
                        <div className="absolute bottom-2 left-0 right-0 text-center">
                            <p className="text-xs text-rose-500 dark:text-rose-400 font-medium px-2">{error}</p>
                        </div>
                    )}
                </div>
            ) : (
                // File Preview / Success State
                <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
                    {/* File Icon */}
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                        {type === 'pdf' ? <FileText className="w-6 h-6 text-red-500 dark:text-red-400" /> : <ImageIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />}
                    </div>
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName || 'Uploaded File'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{type}</p>
                    </div>
                    {/* Remove Button */}
                    <button
                        onClick={handleRemove}
                        type="button"
                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {/* Preview Image Background (for Images) */}
                    {type === 'image' && (
                        <div className="absolute inset-0 -z-10 opacity-10 dark:opacity-5 bg-center bg-cover" style={{ backgroundImage: `url(${value})` }} />
                    )}
                </div>
            )}

            {/* Hidden Input for Click Handling */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={acceptedFormats.join(',')}
                onChange={handleFileChange}
                disabled={isLoading}
            />
        </div>
    );
};

export default GenericFileUpload;