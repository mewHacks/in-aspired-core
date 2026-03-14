import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

// Props for ImageUpload component
interface ImageUploadProps {
    value?: string; // Base64 encoded image string
    onChange: (value: string) => void; // Callback when image changes
    label?: string; // Optional label text
    className?: string; // Optional container styling
    maxSizeMB?: number; // Allowed file size in MB
    acceptedFormats?: string[]; // Accepted MIME formats
}

// Main ImageUpload component
// Supports click to upload + drag and drop, validation, compression, and error handling
const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    label = "Upload Image",
    className = "",
    maxSizeMB = 2,
    acceptedFormats = ['image/png', 'image/jpeg', 'image/webp']
}) => {
    // Reference to the hidden file input element
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stores validation or processing errors
    const [error, setError] = useState<string | null>(null);

    // Indicates compression / reading is in progress
    const [isLoading, setIsLoading] = useState(false);

    // Tracks drag state for visual feedback
    const [isDragging, setIsDragging] = useState(false);

    // Compresses image using a canvas, resize if needed and converts to JPEG with 80% quality
    const compressImage = async (file: File, maxWidth = 1920): Promise<File> => {
        return new Promise((resolve, reject) => {

            // Load the image
            const img = new Image();

            // Create a canvas to resize the image
            const canvas = document.createElement('canvas');

            // Get the 2D drawing context of the canvas
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Maintain aspect ratio while limiting width
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Resize canvas to target dimensions
                canvas.width = width;
                canvas.height = height;

                // Draw resized image onto canvas
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert canvas content into a compressed Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }
                        // Convert Blob back into File
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    },
                    'image/jpeg', // JPEG format
                    0.8 // quality 80%
                );
            };

            // Handle image loading errors
            img.onerror = reject;

            // Load the file into the Image element
            img.src = URL.createObjectURL(file);
        });
    };

    // Validate file type and size
    const validateFile = (file: File): { isValid: boolean; error?: string } => {

        // Check file type/format
        if (!acceptedFormats.includes(file.type)) {
            return {
                isValid: false,
                error: `Invalid format. Accepted: ${acceptedFormats.map(f => f.replace('image/', '')).join(', ')}`
            };
        }

        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            return {
                isValid: false,
                error: `Image must be smaller than ${maxSizeMB}MB`
            };
        }
        return { isValid: true };
    };

    // Handles file selection from file input
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setError(null);
        if (!file) return;

        processFile(file);
    };

    // Process file (validate, compress and convert to base64)
    const processFile = async (file: File) => {

        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setIsLoading(true);
        try {
            // Compress image before encoding
            const compressedFile = await compressImage(file);

            // Create a FileReader that is required to convert a File/Blob into Base6
            const reader = new FileReader();

            // Convert file into Base64 string
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onChange(base64String);
                setIsLoading(false);
            };
            // Handles unexpected read failures
            reader.onerror = () => {
                setError('Failed to read file');
                setIsLoading(false);
            };
            // Start reading the compressed image as Base64
            reader.readAsDataURL(compressedFile);

        } catch (err) { // Error handling
            console.error(err);
            setError('Failed to process image');
            setIsLoading(false);
        }
    };

    // Handles drag and drop

    // When a draggable item is over the drop zone
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Prevents default behavior of opening files in browser
        e.stopPropagation(); // Prevents event from bubbling up to parent elements
        setIsDragging(true); // For UI, highlights the drop zone
    };

    // When a draggable item leaves the drop zone
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false); // For UI, removes highlight
    };

    // When the user releases the dragged item onto the drop zone
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Extract the first file from the dropped files list
        const file = e.dataTransfer.files?.[0];

        // Continue to process file if it was actually dropped
        if (file) {
            processFile(file);
        }
    };

    // Removes the uploaded image
    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering upload click
        onChange('');

        // Reset file input so same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        // Render JSX
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>

            {/* Upload Area (no image yet) */}
            {!value ? (
                <div
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group
                        ${isDragging ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'}
                        ${error ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30' : ''}
                        ${isLoading ? 'cursor-wait' : ''}
                    `}
                >
                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500 dark:text-indigo-400" />
                            <span className="text-sm font-medium">Compressing & Uploading...</span>
                        </div>
                    ) : (
                        <>
                            {/* Upload Icon */}
                            <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
                                <Upload className="w-6 h-6" />
                            </div>

                            {/* Upload Instructions Text */}
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                {isDragging ? 'Drop image here' : 'Click or drag image to upload'}
                            </p>

                            {/* File Constraints */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">
                                {acceptedFormats.map(f => f.replace('image/', '').toUpperCase()).join(', ')} up to {maxSizeMB}MB
                            </p>
                        </>
                    )}

                    {/* Error Message */}
                    {error && !isLoading && !isDragging && (
                        <div className="absolute bottom-2 left-0 right-0 text-center">
                            <p className="text-xs text-rose-500 dark:text-rose-400 font-medium px-2">{error}</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Preview Area (image already uploaded) */
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                    <img
                        src={value}
                        alt="Uploaded preview"
                        className={`w-full h-48 object-cover bg-gray-50 dark:bg-gray-800 transition-opacity ${isLoading ? 'opacity-50' : ''}`}
                    />

                    {/* Remove Button (X at top right) */}
                    <button
                        onClick={handleRemove}
                        type="button"
                        className="absolute top-2 right-2 p-1.5 bg-black/50 dark:bg-black/70 hover:bg-rose-500 dark:hover:bg-rose-600 text-white rounded-full transition-colors shadow-sm backdrop-blur-sm transform group-hover:scale-110 active:scale-95"
                        title="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md" />
                        </div>
                    )}
                </div>
            )}

            {/* Hidden File Input */}
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

export default ImageUpload;