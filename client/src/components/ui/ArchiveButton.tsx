// Archive/unarchive toggle button for admin content management
import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toggleCareerArchive, toggleCourseArchive } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ArchiveButtonProps {
  itemId: string;
  itemType: 'course' | 'career';
  itemTitle: string;
  variant?: 'button' | 'icon';
  archived?: boolean; // controlled archived state
  onArchivedChange?: (isArchived: boolean) => void;
}

const ArchiveButton: React.FC<ArchiveButtonProps> = ({
  itemId,
  itemType,
  itemTitle,
  variant = 'icon',
  archived: propArchived,
  onArchivedChange,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);

  // Controlled vs uncontrolled state
  const isControlled = typeof onArchivedChange === 'function';
  const archived = isControlled ? !!propArchived : false;

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!isAuthenticated) {
      toast.warning(t('ui.toasts.signInToArchive', 'Please sign in to archive items'));
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Call appropriate API
      if (itemType === 'course') {
        await toggleCourseArchive(itemId);
      } else {
        await toggleCareerArchive(itemId);
      }

      // Update parent state if provided
      if (isControlled && onArchivedChange) {
        onArchivedChange(!archived);
      }

      // Toast message
      if (!archived) {
        // Archiving
        toast.success(
          <span>
            {t('ui.toasts.archivedItem', 'Archived "{{name}}".', { name: itemTitle })}{' '}
            <button
              onClick={() =>
                navigate(
                  `/admin/archived?tab=${itemType === 'course' ? 'courses' : 'careers'}`
                )
              }
              className="underline font-semibold hover:text-rose-700"
            >
              {itemType === 'course' ? t('ui.toasts.viewArchivedCourses', 'View Archived Courses') : t('ui.toasts.viewArchivedCareers', 'View Archived Careers')}
            </button>
          </span>
        );
      } else {
        // Restoring
        toast.success(t('ui.toasts.unarchivedItem', 'Unarchived "{{name}}"', { name: itemTitle }));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('ui.toasts.updateFailed', 'Failed to update'));
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = archived ? ArchiveRestore : Archive;

  // UI
  return variant === 'button' ? (
    <button
      onClick={handleToggle}
      disabled={isProcessing}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${archived
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-700'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
      {archived ? t('ui.buttons.unarchive', 'Unarchive') : t('ui.buttons.archive', 'Archive')}
    </button>
  ) : (
    <button
      onClick={handleToggle}
      disabled={isProcessing}
      className={`cursor-pointer p-2 rounded-full transition flex items-center justify-center ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'
        }`}
      title={archived ? t('ui.buttons.unarchive', 'Unarchive') : t('ui.buttons.archive', 'Archive')}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
      ) : (
        <Icon className={`w-5 h-5 ${archived ? 'text-emerald-600' : ''}`} />
      )}
    </button>
  );
};

export default ArchiveButton;
