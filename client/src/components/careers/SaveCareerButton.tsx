// Toggle button to save/unsave a career to the user's bookmarks
import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useSavedCareers } from '@/contexts/SavedCareersContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SaveCareerButtonProps {
  careerId: string;
  careerName: string;
  variant?: 'button' | 'icon';
  showCount?: boolean;
  savedCount?: number;
  disabled?: boolean;
  saved?: boolean; // Controlled prop
  onSaveChange?: (isSaved: boolean) => void; // Callback
}

const SaveCareerButton: React.FC<SaveCareerButtonProps> = ({
  careerId,
  careerName,
  variant = 'icon',
  showCount = false,
  savedCount = 0,
  disabled = false,
  saved: propSaved,
  onSaveChange,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { isSaved, toggleSave } = useSavedCareers();
  const [isProcessing, setIsProcessing] = useState(false);
  const isDisabled = disabled || !isAuthenticated || isProcessing;
  const navigate = useNavigate();

  // Determine saved state: controlled (prop) vs uncontrolled (context)
  const isControlled = typeof onSaveChange === 'function';
  const saved = isControlled ? !!propSaved : isSaved(careerId);

  const handleToggleSave = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!isAuthenticated) {
      toast.warning(t('ui.toasts.signInToSave', 'Please sign in to save items'));
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (isControlled && onSaveChange) {
        // Controlled mode: Delegate to parent
        await onSaveChange(!saved);
      } else {
        // Uncontrolled mode: Use Context
        const newState = await toggleSave(careerId);

        if (newState) {
          toast.success(
            <span>
              {t('ui.toasts.savedItem', 'Saved "{{name}}".', { name: careerName })}{' '}
              <button
                onClick={() => navigate('/saved?tab=careers')}
                className="underline font-semibold hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                {t('ui.toasts.viewSavedCareers', 'View Saved Careers')}
              </button>
            </span>
          );
        } else {
          toast.info(t('ui.toasts.removedItem', 'Removed "{{name}}" from saved', { name: careerName }));
        }
      }
    } catch (error: any) {
      console.error('Failed to toggle save', error);

      if (error.message.includes('already saved')) {
        toast.info(t('ui.toasts.alreadySaved', 'This item is already saved'));
      } else if (error.message.includes('not saved')) {
        toast.info(t('ui.toasts.notSaved', 'This item is not saved'));
      } else {
        toast.error(t('ui.toasts.updateFailed', 'Failed to update'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return variant === 'button' ? (
    <button
      onClick={handleToggleSave}
      disabled={isDisabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
        saved
          ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm dark:hover:bg-gray-700'}`}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="w-5 h-5" />
      ) : (
        <Bookmark className="w-5 h-5" />
      )}
      {isProcessing ? '...' : saved ? t('ui.buttons.saved', 'Saved') : t('ui.buttons.save', 'Save')}
      {showCount && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">({savedCount})</span>}
    </button>
  ) : (
    <button
      onClick={handleToggleSave}
      disabled={isDisabled}
      className={`cursor-pointer p-2 rounded-full transition flex items-center justify-center ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-slate-100 dark:hover:bg-gray-800'
      }`}
      title={saved ? t('ui.buttons.removeSave', 'Remove from saved') : t('ui.buttons.save', 'Save')}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
      {showCount && <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">{savedCount}</span>}
    </button>
  );
};

export default SaveCareerButton;