// Quick edit modal for admin inline editing of course details
import React, { useEffect, useState } from 'react';
import { X, Save, Loader, Building2, GraduationCap, BookOpen } from 'lucide-react';
import { Course, EducationLevel } from '../../types';
import { updateCourse } from '../../services/api';
import { institutions } from '../../data/institutions';

interface QuickEditModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const COURSE_LEVELS: EducationLevel[] = ['Foundation', 'Diploma', 'General Pre-U'];

const QuickEditModal: React.FC<QuickEditModalProps> = ({ course, isOpen, onClose, onSaveSuccess }) => {
  const [formData, setFormData] = useState<Partial<Course>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && course) {
      setFormData({
        title: course.title || '',
        institutionId: course.institutionId || '',
        campuses: course.campuses || [],
        level: course.level || 'Diploma',
        type: course.type || 'Public',
        duration_year: course.duration_year?.toString() || '1',
        cost_level: course.cost_level || '< RM 20k',
        description: course.description || '',
        apply_url: course.apply_url || '',
      });
    }
  }, [isOpen, course?.id]);

  // Auto-update application URL & campuses when institution changes
  useEffect(() => {
    if (!formData.institutionId || !formData.title) return;

    const selectedInstitution = institutions.find(inst => inst.id === formData.institutionId);
    if (!selectedInstitution) return;

    const slugTitle = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData(prev => {
      const newUrl = `${selectedInstitution.apply_url}/${slugTitle}`;
      const newCampuses = selectedInstitution.campuses || [];

      if (prev.apply_url === newUrl && JSON.stringify(prev.campuses) === JSON.stringify(newCampuses)) {
        return prev;
      }

      return {
        ...prev,
        apply_url: newUrl,
        campuses: newCampuses,
      };
    });
  }, [formData.institutionId, formData.title]);

  const handleChange = (field: keyof Course, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) newErrors.title = 'Course title is required';
    if (!formData.institutionId?.trim()) newErrors.institutionId = 'Institution is required';
    if (!formData.duration_year || parseInt(formData.duration_year as any) <= 0)
      newErrors.duration_year = 'Duration must be greater than 0';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course?.id || !validateForm()) return;

    setLoading(true);
    try {
      const selectedInstitution = institutions.find(inst => inst.id === formData.institutionId);

      const payload = {
        ...formData,
        duration_year: parseInt(formData.duration_year as string) as any,
        title: formData.title?.trim(),
        description: formData.description?.trim(),
        campuses: selectedInstitution?.campuses || [],
        apply_url: selectedInstitution?.apply_url || '',
      };

      await updateCourse(course.id, payload);
      onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update course:', error);
      setErrors({ submit: error.message || 'Failed to save changes' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-slate-50 dark:bg-gray-800 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Edit Course</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">Make quick changes to {course.title}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Title *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => handleChange('title', e.target.value)}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.title 
                    ? 'border-red-300 dark:border-red-700' 
                    : 'border-slate-300 dark:border-gray-700'
                } focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30`}
              />
              {errors.title && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.title}</p>}
            </div>

            {/* Institution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Institution *
              </label>
              <select
                value={formData.institutionId || ''}
                onChange={e => handleChange('institutionId', e.target.value)}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.institutionId 
                    ? 'border-red-300 dark:border-red-700' 
                    : 'border-slate-300 dark:border-gray-700'
                } focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30`}
              >
                <option value="">Select Institution</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id} className="bg-white dark:bg-gray-800">
                    {inst.name}
                  </option>
                ))}
              </select>
              {errors.institutionId && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.institutionId}</p>}
            </div>

            {/* Level & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Level
                </label>
                <select
                  value={formData.level || 'Diploma'}
                  onChange={e => handleChange('level', e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                >
                  {COURSE_LEVELS.map(level => (
                    <option key={level} value={level} className="bg-white dark:bg-gray-800">
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={formData.type || 'Public'}
                  onChange={e => handleChange('type', e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                >
                  <option value="Public" className="bg-white dark:bg-gray-800">Public</option>
                  <option value="Private" className="bg-white dark:bg-gray-800">Private</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (Years)</label>
              <input
                type="number"
                value={formData.duration_year || '1'}
                onChange={e => handleChange('duration_year', e.target.value)}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.duration_year 
                    ? 'border-red-300 dark:border-red-700' 
                    : 'border-slate-300 dark:border-gray-700'
                } focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30`}
              />
              {errors.duration_year && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.duration_year}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Description
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
              />
              {errors.description && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.description}</p>}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 dark:bg-gray-800 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border border-slate-300 dark:border-gray-700 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickEditModal;