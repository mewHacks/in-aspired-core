import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define upload directory path
const uploadDir = path.join(process.cwd(), 'uploads', 'feedback');

// Ensure upload directory exists - create if missing
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created directory:', uploadDir);
} else {
  console.log('Upload directory exists:', uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);  // Use the verified directory
  },
  filename: (req, file, cb) => {
    // Generate unique filename: feedback-1708012345-123456.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - only allow images and videos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos allowed.'));
  }
};

// Create upload middleware
export const uploadFeedbackFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5 // Max 5 files total
  }
}).array('files', 5);

export default uploadFeedbackFiles;