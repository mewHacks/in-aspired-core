// Feedback submission modal with file attachments and type selection
import React, { useState } from 'react';
import { X, MessageSquare, Bug, FileText, Lightbulb, MessageCircle, Send, Upload, Image as ImageIcon, Video, File } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { httpClient } from '@/services/httpClient';
import { useTranslation } from 'react-i18next';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'content' | 'feature' | 'general';

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes = [
    { value: 'bug' as FeedbackType, label: t('feedback.type.bug.label'), icon: Bug, description: t('feedback.type.bug.desc') },
    { value: 'content' as FeedbackType, label: t('feedback.type.content.label'), icon: FileText, description: t('feedback.type.content.desc') },
    { value: 'feature' as FeedbackType, label: t('feedback.type.feature.label'), icon: Lightbulb, description: t('feedback.type.feature.desc') },
    { value: 'others' as FeedbackType, label: t('feedback.type.others.label'), icon: MessageCircle, description: t('feedback.type.others.desc') }
  ];

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Validate file types
      const validFiles = newFiles.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        return isImage || isVideo;
      });

      // Validate file sizes (max 10MB per file)
      const validSizedFiles = validFiles.filter(file => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large. Max 10MB per file.`);
          return false;
        }
        return true;
      });

      // Limit total files to 5
      const totalFiles = [...files, ...validSizedFiles];
      if (totalFiles.length > 5) {
        toast.error(t('feedback.toast.maxFiles', 'Maximum 5 files allowed'));
        setFiles(totalFiles.slice(0, 5));
      } else {
        setFiles(totalFiles);
      }

      // Reset input
      e.target.value = '';
    }
  };

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim().length < 10) {
      toast.error(t('feedback.toast.minChars', 'Please provide at least 10 characters'));
      return;
    }

    try {
      setSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('type', type);
      formData.append('message', message.trim());

      // Append files
      files.forEach((file) => {
        formData.append(`files`, file);
      });

      const res = await httpClient('/api/feedback', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success(t('feedback.toast.success', 'Feedback submitted! Thank you! 🎉'));
        setMessage('');
        setFiles([]);
        setType('general');
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || t('feedback.toast.fail', 'Failed to submit feedback'));
      }
    } catch (err) {
      console.error('Submit feedback error:', err);
      toast.error(t('feedback.toast.fail', 'Failed to submit feedback'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg my-8 shadow-2xl border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/20 dark:to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/10 to-red-400/5 dark:from-red-500/20 dark:to-red-400/10 border border-red-200 dark:border-red-800">
                <MessageSquare className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('feedback.header.title', 'Report Issue')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('feedback.header.subtitle', 'Help us fix bugs & improve')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="w-5 h-5 text-red-500 dark:text-red-400" />
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Feedback Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('feedback.form.issueType', 'Issue Type')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {feedbackTypes.map((ft) => {
                  const Icon = ft.icon;
                  const isSelected = type === ft.value;

                  return (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setType(ft.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-300 text-left ${isSelected
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-red-100 dark:bg-red-800' : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-xs ${isSelected ? 'text-red-900 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                            {ft.label}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {ft.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('feedback.form.describe', 'Describe the issue')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback.form.placeholder', 'What happened? Please be as specific as possible...')}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:border-red-300 dark:focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 
                         transition-all duration-300 outline-none resize-none text-sm"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('feedback.form.minChars', 'Min 10 characters')}
                </p>
                <p className={`text-xs ${message.length < 10 ? 'text-red-500 dark:text-red-400' :
                  message.length > 900 ? 'text-amber-500 dark:text-amber-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                  {message.length} / 1000
                </p>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('feedback.form.screenshots', 'Screenshots / Videos (Optional)')}
              </label>

              {/* Upload Button */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={files.length >= 5}
                />
                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                              ${files.length >= 5
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/30 dark:hover:bg-red-900/20'
                  }`}>
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${files.length >= 5 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {files.length >= 5 ? t('feedback.upload.maxReached', 'Maximum files reached') : t('feedback.upload.clickToUpload', 'Click to upload files')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {t('feedback.upload.constraints', 'Images & videos only • Max 10MB each • Up to 5 files')}
                  </p>
                </div>
              </label>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                        text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-800
                        hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                        active:scale-95 active:shadow-sm
                        transition-all duration-200 text-sm"
              >
                {t('feedback.btn.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || message.trim().length < 10}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 dark:from-red-600 dark:to-rose-600
                        text-white font-medium shadow-md
                        hover:shadow-lg hover:shadow-red-200 dark:hover:shadow-red-900/30 hover:from-red-600 hover:to-rose-600
                        active:scale-95 active:shadow-sm
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
                        flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('feedback.btn.submitting', 'Submitting...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('feedback.btn.submit', 'Submit Report')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;