// Quick edit modal for admin inline editing of career details
import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Briefcase, Layers, GraduationCap } from 'lucide-react';
import { Career } from '../../types';
import { updateCareer } from '../../services/api';
import { interestDomains } from '@in-aspired/shared';
import { WORK_ENVIRONMENT_OPTIONS } from '../../pages/admin/CreateCareerPage';
import { useTranslation } from 'react-i18next';

interface QuickEditModalProps {
  career: Career | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const EDUCATION_LEVELS = [
  'Diploma',
  'General Pre-U',
  'Degree',
  'Master',
  'PhD',
] as const;

const QuickEditModal: React.FC<QuickEditModalProps> = ({
  career,
  isOpen,
  onClose,
  onSaveSuccess
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Career>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && career) {
      setFormData({
        name: career.name || '',
        description: career.description || '',
        demand_level: career.demand_level || 'Medium',
        salary_low: career.salary_low || 0,
        salary_high: career.salary_high || 0,
        riasec_code: career.riasec_code || '',
        skills: [...(career.skills || [])],
        industry: [...(career.industry || [])],
        education_level_required: career.education_level_required || 'Diploma',
        work_environment: career.work_environment || 'Office',
        related_domains:
          career.related_domains && career.related_domains.length > 0
            ? career.related_domains
            : [''],
      });
    }
  }, [isOpen, career?.id]); // Only reset when modal opens or career ID changes

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const domainId = formData.related_domains?.[0];
    const domain = interestDomains.find(d => d.id === domainId);

    if (!formData.name?.trim()) {
      newErrors.name = 'Career name is required';
    }

    // Interest domain is required
    if (!domainId) {
      newErrors.related_domains = 'Interest domain is required';
    }

    // RIASEC must be derived when a domain is selected
    if (domainId && !formData.riasec_code) {
      newErrors.riasec_code =
        'RIASEC code could not be derived from the selected domain';
    }

    // RIASEC length validation (derived but still validated)
    if (formData.riasec_code && formData.riasec_code.length !== 3) {
      newErrors.riasec_code = 'RIASEC code must be 3 characters';
    }

    // Ensure RIASEC matches selected interest domain profile
    if (domain && formData.riasec_code) {
      const allowedLetters = [
        ...domain.riasecProfile.primary,
        ...domain.riasecProfile.secondary,
      ];

      const invalidLetter = formData.riasec_code
        .split('')
        .find(letter => !allowedLetters.includes(letter as any));

      if (invalidLetter) {
        newErrors.riasec_code =
          `RIASEC must match the selected interest domain (${allowedLetters.join(', ')})`;
      }
    }

    // Salary validation
    if (
      formData.salary_low !== undefined &&
      formData.salary_high !== undefined &&
      formData.salary_low > formData.salary_high
    ) {
      newErrors.salary = 'Low salary cannot be higher than high salary';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!career?.id || !validateForm()) return;

    setLoading(true);
    try {
      await updateCareer(career.id, formData);
      onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update career:', error);
      setErrors({
        submit: error.message || 'Failed to save changes. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Career, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Safely clear error for this field (supports arrays & derived fields)
    setErrors(prev => {
      if (!prev[field as string]) return prev;
      const { [field as string]: _, ...rest } = prev;
      return rest;
    });
  };

  if (!isOpen || !career) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Edit Career</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Make quick changes to {career.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Career Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Career Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-gray-700'
                }`}
                placeholder={t('admin.careers.edit.phName', 'e.g., Software Engineer')}
              />
              {errors.name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.name}</p>
              )}
            </div>

            {/* Interest Domain */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Interest Domain *
              </label>
              <select
                value={(formData.related_domains && formData.related_domains[0]) || ''}
                onChange={(e) => {
                  const domainId = e.target.value;
                  const domain = interestDomains.find(d => d.id === domainId);

                  handleChange('related_domains', [domainId]);

                  // Auto-derive RIASEC from selected domain
                  if (domain?.riasecProfile) {
                    const primary = domain.riasecProfile.primary ?? [];
                    const secondary = domain.riasecProfile.secondary ?? [];

                    const riasecCode = [...primary, ...secondary]
                      .slice(0, 3)
                      .join('');

                    handleChange('riasec_code', riasecCode);
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                  errors.related_domains ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-gray-700'
                }`}
              >
                <option value="">Select an interest domain</option>
                {interestDomains.map(domain => (
                  <option key={domain.id} value={domain.id} className="bg-white dark:bg-gray-800">
                    {domain.label}
                  </option>
                ))}
              </select>
              {errors.related_domains && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                  {errors.related_domains}
                </p>
              )}
            </div>

            {/* Demand Level & RIASEC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Demand Level
                </label>
                <select
                  value={formData.demand_level || 'Medium'}
                  onChange={(e) => handleChange('demand_level', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="High">High Demand</option>
                  <option value="Medium">Medium Demand</option>
                  <option value="Low">Low Demand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  RIASEC Code *
                </label>
                <input
                  type="text"
                  value={formData.riasec_code || ''}
                  readOnly
                  className="bg-slate-100 dark:bg-gray-700 cursor-not-allowed w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-300"
                />
                {errors.riasec_code && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                    {errors.riasec_code}
                  </p>
                )}
              </div>
            </div>

            {/* Education Level & Work Environment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Education Level
                </label>
                <select
                  value={formData.education_level_required || 'Diploma'}
                  onChange={(e) =>
                    handleChange('education_level_required', e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {EDUCATION_LEVELS.map(level => (
                    <option key={level} value={level} className="bg-white dark:bg-gray-800">
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Work Environment
                </label>
                <select
                  value={formData.work_environment || 'Office'}
                  onChange={(e) =>
                    handleChange('work_environment', e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {WORK_ENVIRONMENT_OPTIONS.map(env => (
                    <option key={env} value={env} className="bg-white dark:bg-gray-800">
                      {env}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Salary Range (RM)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={formData.salary_low || ''}
                  onChange={(e) =>
                    handleChange('salary_low', parseInt(e.target.value) || 0)
                  }
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.salary ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-gray-700'
                  }`}
                  placeholder={t('admin.careers.edit.phLow', 'Low')}
                />
                <input
                  type="number"
                  value={formData.salary_high || ''}
                  onChange={(e) =>
                    handleChange('salary_high', parseInt(e.target.value) || 0)
                  }
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.salary ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-gray-700'
                  }`}
                  placeholder={t('admin.careers.edit.phHigh', 'High')}
                />
              </div>
              {errors.salary && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errors.salary}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) =>
                  handleChange('description', e.target.value)
                }
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('admin.careers.edit.phDesc', 'Brief description of this career...')}
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickEditModal;