import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { ArrowLeft, Plus, Minus, Briefcase, Layers, BookOpen, TrendingUp, DollarSign, GraduationCap, AlertCircle, Award, Info, Hash } from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';

import { useToast } from '../../contexts/ToastContext';
import { createCareer, fetchCourses } from '../../services/api';
import { CreateCareerDTO } from '@in-aspired/shared';
import { interestDomains } from '@in-aspired/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// ------------------------ Constants ------------------------ //
// Demand level options for careers
const DEMAND_LEVELS = ['High', 'Medium', 'Low'] as const;

// Required education level options
const EDUCATION_LEVELS = [
  'Diploma',
  'General Pre-U',
  'Degree',
  'Master',
  'PhD',
] as const;


// Suggested skills to help admins quickly pick skills
// These appear as suggestions in input fields
const SKILL_SUGGESTIONS = [
  'Communication', 'Problem Solving', 'Teamwork', 'Leadership',
  'Critical Thinking', 'Creativity', 'Time Management', 'Adaptability',
  'Technical Writing', 'Project Management', 'Data Analysis', 'Programming',
  'UI/UX Design', 'Digital Marketing', 'Financial Analysis', 'Research',
  'Business Fundamentals', 'Communication', 'Analytical Thinking', 'Teamwork',
  'Problem Solving', 'Diagnosis', 'Patient Care', 'Surgery', 'Empathy',
  'Instruction', 'Patience', 'Data Analysis', 'Process Analysis', 'C#/C++',
  '3D Mathematics', 'Gym Equipment', 'Nutrition Basics', 'Java', 'Python', 'React',
  'SQL', 'System Design', 'Network Security', 'Database', 'Programming Languages',
  'Excel', 'Editing', 'Photograpgy', 'Financial Modeling', 'E-learning Platforms',
  'Technical Support', 'E-tech', 'Auditing', 'Financial Reporting', 'Documentation',
  'Accouting', 'Taxation', 'Project Management', 'Digital tools', 'Decorating',
  'Recipe Development', 'Law', 'Public Speaking', 'Legal Research', 'Research',
  'Negotiation', 'Critical Thinking', '3D Modelling', 'ARCore', 'Hardware Troubleshooting',
  'Software Installation', 'Network Setup', 'Customer Service', 'Statistics & Probability',
  'Machine Learning', 'AR/VR', 'Cost Estimation', 'Creativity', 'Nursing', 'Risk Analysis',
  'Prototyping', 'Figma', 'HTML/CSS', 'Hospitality Management', 'Revenue Management',
  'Operations', 'Contract Law', 'Typography', 'Illustrator', 'Pharmacology', 'Chemistry',
  'Detailed', 'Foreign Languages', 'Political Analysis', 'Cross-cultural Communication',
  'Counseling', 'Mathematics', 'Writing', 'Interwing', 'Reporting', 'Microbilogy',
  'Biology', 'Marine Knowledge', ' Farm Operations'
];


// Suggested industries list
const INDUSTRY_SUGGESTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Fintess',
  'Retail', 'Hospitality', 'Construction', 'Transportation', 'Media', 'Coporate',
  'Consulting', 'Gaming', 'Business', 'Education Technology', 'Law', 'Mobile Apps',
  'Pastry', 'Bakery', 'Marketing', 'Publishing', 'Entertainment', 'Creative Arts',
  'Goverment', 'Engineering', 'Social Sciences', 'Think Tanks', 'Agriculture',
  'Aquaculture'
];


// Possible working environments for a career
export const WORK_ENVIRONMENT_OPTIONS = [
  'Office', 'Remote', 'Hybrid', 'Field', 'Factory', 'Laboratory',
  'Hospital', 'Classroom', 'Outdoor', 'Retail Store', 'Workshop',
  'Studio', 'On-site', 'Virtual', 'Home-based', 'Warehouse', 'Clinic', 'Farm',
  'International', 'Kitchen', 'Bakery', 'Courtroom', 'Data Center', 'Think Tank',
  'Creative Studio', 'Government Office', 'Aquatic Facility', 'Agricultural Site',
  'Entertainment Venue', 'Publishing House', 'Marketing Agency', 'Marine Environment',
  'Fitness Center', 'Research Center', 'Production Floor', 'Construction Site'
];


// ---------------- Types ----------------
// Course interface used locally in this page
// Only storing the fields needed for dropdown
interface Course {
  _id: string;
  title: string;
}


// ------------------------ Helper Functions ------------------------ //
// Automatically generate a URL-friendly ID from career name
// Example:
// "Software Engineer" → "software-engineer"
const generateCareerId = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};


// Validate salary values before submitting
const validateSalaryRange = (low: number, high: number): string | null => {

  if (low < 0 || high < 0)
    return 'Salary cannot be negative';

  if (low > high)
    return 'Maximum salary must be greater than minimum salary';

  if (high > 10000000)
    return 'Salary seems unusually high';

  return null;
};


// ------------------------ Main Component ------------------------
const CreateCareerPage: React.FC = () => {

  const { t } = useTranslation(); // Translation function from react-i18next
  const navigate = useNavigate(); // For programmatic navigation after successful creation
  const toast = useToast(); // For showing success/error messages to the user

  // Used to disable submit button while submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Store courses fetched from backend
  const [courses, setCourses] = useState<Course[]>([]);

  // Authentication info
  const { user, isAuthenticated, isLoading } = useAuth();
  console.log('CreateCareerPage auth:', { user, isAuthenticated, isLoading });

  // ---------------- Fetch courses from backend ----------------
  // Needed for "Related Courses" dropdown
  useEffect(() => {

    const fetchAllCourses = async () => {

      try {
        // Fetch courses from backend API and map to local Course type
        const dataFromApi = await fetchCourses(); // This returns an array of courses with _id and title fields

        // Map API result to local Course structure
        const mappedCourses: Course[] = dataFromApi.map(c => ({
          _id: (c as any)._id || (c as any).id, // Handle cases where API might return either _id or id
          title: c.title
        }));

        setCourses(mappedCourses);

      } catch {
        toast.error(t('admin.createCareer.toast.fetchError', 'Failed to load courses'));
      }
    };

    fetchAllCourses();

  }, []);


  // ------------------------ Form State ------------------------
  const [formData, setFormData] = useState<CreateCareerDTO>({

    id: '',
    name: '',
    description: '',

    industry: [''],

    skills: [''],

    // default with one empty value so input shows immediately
    related_courses: [''],

    related_domains: [],

    salary_low: 0,
    salary_high: 0,

    demand_level: 'Medium',
    work_environment: 'Office',
    education_level_required: 'Diploma',

    riasec_code: '',
    masco_code: ''

  });


  // ------------------------ Computed Values ------------------------

  // Find selected interest domain object
  const selectedDomain = useMemo(() => {

    if (formData.related_domains.length > 0) { // Currently only supporting single domain selection
      return interestDomains.find(
        d => d.id === formData.related_domains[0]
      );
    }

    return undefined;

  }, [formData.related_domains]);


  // Generate RIASEC code automatically
  const computedRiasecCode = useMemo(() => {

    if (!selectedDomain) return ''; // No domain selected, so no RIASEC code

    const { primary, secondary } = selectedDomain.riasecProfile; // Get primary and secondary traits from the selected domain

    return [...primary, ...secondary].join(''); // Combine primary and secondary traits into one code

  }, [selectedDomain]);


  // ------------------------ Validation ------------------------
  const validateForm = (): boolean => {

    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim())
      errors.name = 'Career name is required';

    if (!formData.description.trim())
      errors.description = 'Description is required';

    if (formData.related_domains.length === 0)
      errors.related_domains = 'Interest domain is required';


    // Salary validation
    const salaryError = validateSalaryRange(
      formData.salary_low,
      formData.salary_high
    );

    if (salaryError)
      errors.salary = salaryError;


    // Validate arrays
    const validIndustries = formData.industry.filter(i => i.trim());
    const validSkills = formData.skills.filter(s => s.trim());
    const validCourses = formData.related_courses.filter(c => c.trim());

    if (validIndustries.length === 0)
      errors.industry = 'Industry is required';

    if (validSkills.length === 0)
      errors.skills = 'At least one skill is required';

    if (validCourses.length === 0)
      errors.related_courses = 'At least one related course is required';


    setFormErrors(errors);

    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };


  // ------------------------ Input Handlers ------------------------

  // Handle text inputs
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));


    // Clear validation error when user edits field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }


    // Auto-generate ID when name changes
    if (name === 'name' && value.trim()) {

      setFormData(prev => ({
        ...prev,
        id: generateCareerId(value)
      }));

    }
  };


  // Handle numeric salary inputs
  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'salary_low' | 'salary_high'
  ) => {

    const value = parseFloat(e.target.value) || 0;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));


    if (formErrors.salary) {
      setFormErrors(prev => ({
        ...prev,
        salary: ''
      }));
    }
  };


  // Update items inside array fields
  const handleArrayChange = (
    field: 'industry' | 'skills' | 'related_courses',
    index: number,
    value: string
  ) => {

    setFormData(prev => {

      const newArray = [...prev[field]];
      newArray[index] = value;

      return {
        ...prev,
        [field]: newArray
      };
    });

    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle industry change (currently only supports single industry for simplicity)
  const handleIndustryChange = (value: string) => {
    setFormData(prev => ({ ...prev, industry: [value] }));

    if (formErrors.industry) {
      setFormErrors(prev => ({ ...prev, industry: '' }));
    }
  };

  // Handle interest domain change (currently only supports single domain for simplicity)
  const handleDomainChange = (domainId: string) => {
    const newDomains = [domainId]; // Currently only supporting single domain
    setFormData(prev => ({ ...prev, related_domains: newDomains }));

    if (formErrors.related_domains) {
      setFormErrors(prev => ({ ...prev, related_domains: '' }));
    }
  };

  // Add new item to dynamic arrays
  const addArrayItem = (field: 'skills' | 'related_courses') => {

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));

  };


  // Remove item from dynamic arrays
  const removeArrayItem = (
    field: 'skills' | 'related_courses',
    index: number
  ) => {

    if (formData[field].length > 1) {

      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));

    }
  };


  // ------------------------ Form Submission ------------------------
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    // Validate before submitting
    if (!validateForm()) {

      toast.error(
        t('admin.createCareer.toast.formError',
        'Please fix the errors in the form')
      );

      return;
    }


    // Ensure RIASEC code exists
    if (!computedRiasecCode) {

      toast.error(
        t('admin.createCareer.toast.riasecError',
        'RIASEC code could not be generated')
      );

      return;
    }


    setIsSubmitting(true);

    try {

      // Clean and prepare final data
      const payload: CreateCareerDTO = {

        ...formData,

        id: formData.id || generateCareerId(formData.name),

        name: formData.name.trim(),

        description: formData.description.trim(),

        industry: formData.industry
          .filter(i => i.trim())
          .map(i => i.trim()),

        skills: formData.skills
          .filter(s => s.trim())
          .map(s => s.trim()),

        related_courses: formData.related_courses
          .filter(c => c.trim())
          .map(c => c.trim()),

        riasec_code: computedRiasecCode
      };


      console.log('CREATE CAREER PAYLOAD:', payload);

      // Send to backend
      await createCareer(payload as any);

      toast.success(
        t('admin.createCareer.toast.success',
        'Career created successfully!')
      );

      navigate('/careers');

    } catch (error: any) {

      console.error('Failed to create career:', error);

      toast.error(
        error?.message ||
        error?.response?.data?.message ||
        t('admin.createCareer.toast.fail', 'Failed to create career')
      );

    } finally {

      setIsSubmitting(false);

    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16">
      {/* Navigation bar */}
      <Navbar />

      {/* Header section */}
      <div className="bg-slate-900 dark:bg-gray-950 text-white pt-12 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900 dark:from-emerald-950 dark:to-gray-950 opacity-90" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">

          {/* Back button */}
          <div className="flex justify-between items-center mb-8">
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02]"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('admin.createCareer.backBtn', 'Back to Careers')}</span>
            </Link>
          </div>

          {/* Page title */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('admin.createCareer.title', 'Create New Career')}</h1>
            <p className="text-slate-300 dark:text-slate-400">
              {t('admin.createCareer.subtitle', 'Fill in the details below to create a new career pathway')}
            </p>
          </div>
        </div>
      </div>

      {/* Main form content */}
      <main className="max-w-4xl mx-auto px-6 -mt-8 pb-20 relative z-20">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Basic Information Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Info className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" />
              {t('admin.createCareer.basicInfo', 'Basic Information')}
            </h2>

            <div className="space-y-6">
              {/* Career Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  {t('admin.createCareer.fields.name', 'Career Name')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('admin.createCareer.fields.namePlaceholder', 'e.g., Software Engineer, Data Scientist')}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formErrors.name ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                    }`}
                  required
                />
                {formErrors.name && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {formErrors.name}
                  </p>
                )}
                {formData.id && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                    Auto-generated ID: <code className="bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded">{formData.id}</code>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  {t('admin.createCareer.fields.desc', 'Description')} *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t('admin.createCareer.fields.descPlaceholder', 'Describe the career, typical responsibilities, and career outlook...')}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formErrors.description ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                    }`}
                  required
                />
                {formErrors.description && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {formErrors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Interest Domain */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Layers className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" />
              {t('admin.createCareer.fields.domain', 'Interest Domain')} *
            </h2>
            <CustomSelect
              value={formData.related_domains[0] || ''}
              onChange={(value) => handleDomainChange(value)}
              options={interestDomains.map(domain => ({
                label: domain.label,
                value: domain.id
              }))}
              placeholder={t('admin.createCareer.fields.domainPlaceholder', 'Select an interest domain')}
              className={formErrors.related_domains ? 'border-rose-500 dark:border-rose-600' : ''}
            />
            {formErrors.related_domains && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{formErrors.related_domains}</p>
            )}
            {selectedDomain && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-gray-400 mb-2">
                  {t('admin.createCareer.riasec', 'RIASEC Profile:')} <strong className="font-mono text-lg text-gray-900 dark:text-white">{computedRiasecCode}</strong>
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-500">
                  Primary: {selectedDomain.riasecProfile.primary.join(', ')}
                  {selectedDomain.riasecProfile.secondary.length > 0 && (
                    <> | Secondary: {selectedDomain.riasecProfile.secondary.join(', ')}</>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <div className="space-y-8">

              {/* MASCO Code Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <Hash className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                  {t('admin.createCareer.fields.masco', 'MASCO Code')}
                </h3>
                <div>
                  <input
                    type="text"
                    name="masco_code"
                    value={formData.masco_code}
                    onChange={handleInputChange}
                    placeholder={t('admin.createCareer.fields.mascoPlaceholder', 'e.g., 2512')}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                    {t('admin.createCareer.mascoDesc', 'International Standard Classification of Occupations code')}
                  </p>
                </div>
              </div>

              {/* Education Level */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                  {t('admin.createCareer.fields.education')} *
                </h3>
                <CustomSelect
                  value={formData.education_level_required}
                  onChange={(value) => handleInputChange({ target: { name: 'education_level_required', value } } as any)}
                  options={EDUCATION_LEVELS.map(level => ({
                    label: level,
                    value: level
                  }))}
                />
              </div>

            </div>

            <div className="space-y-8">

              {/* Salary Range */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                  {t('admin.createCareer.fields.salary')} *
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-gray-400 mb-2">{t('admin.createCareer.fields.salaryMin', 'Minimum')}</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.salary_low || ''}
                      onChange={(e) => handleNumberChange(e, 'salary_low')}
                      placeholder="2000"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formErrors.salary ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                        }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-gray-400 mb-2">{t('admin.createCareer.fields.salaryMax', 'Maximum')}</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.salary_high || ''}
                      onChange={(e) => handleNumberChange(e, 'salary_high')}
                      placeholder="8000"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formErrors.salary ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                        }`}
                      required
                    />
                  </div>
                </div>
                {formErrors.salary && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {formErrors.salary}
                  </p>
                )}
                {formData.salary_low > 0 && formData.salary_high > 0 && !formErrors.salary && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">
                    {t('admin.createCareer.salaryEst', 'Estimated monthly salary:')} <strong className="text-gray-900 dark:text-white">RM {formData.salary_low.toLocaleString()} - RM {formData.salary_high.toLocaleString()}</strong>
                  </p>
                )}
              </div>

              {/* Demand Level*/}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                  {t('admin.createCareer.fields.demand')} *
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {DEMAND_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, demand_level: level }))}
                      className={`px-4 py-4 rounded-xl border font-medium transition-all text-sm ${formData.demand_level === level
                          ? level === 'High'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : level === 'Medium'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Industry Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Briefcase className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" />
              {t('admin.createCareer.fields.industry')} *
            </h2>
            <div>
              <input
                type="text"
                value={formData.industry[0] || ''}
                onChange={(e) => handleIndustryChange(e.target.value)}
                placeholder={t('admin.createCareer.fields.industryPlaceholder', 'e.g., Technology, Healthcare')}
                list="industry-suggestions"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${formErrors.industry ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                  }`}
                required
              />
              <datalist id="industry-suggestions">
                {INDUSTRY_SUGGESTIONS.map(industry => (
                  <option key={industry} value={industry} />
                ))}
              </datalist>
              {formErrors.industry && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{formErrors.industry}</p>
              )}
            </div>
          </div>

          {/* Work Environment */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Briefcase className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" />
              {t('admin.createCareer.fields.environment')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {WORK_ENVIRONMENT_OPTIONS.map(env => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, work_environment: env }))}
                  className={`px-4 py-3 rounded-xl border font-medium transition-all text-sm ${formData.work_environment === env
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" />
              {t('admin.createCareer.fields.skills')} *
            </h2>
            <div className="space-y-4">
              {formData.skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => handleArrayChange('skills', index, e.target.value)}
                    placeholder={t('admin.createCareer.fields.skillsPlaceholder', 'e.g., Communication, Problem Solving, Teamwork')}
                    list="skill-suggestions"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  {formData.skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('skills', index)}
                      className="px-4 text-slate-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center justify-center min-w-[44px]"
                    >
                      <Minus size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <datalist id="skill-suggestions">
              {SKILL_SUGGESTIONS.map(skill => (
                <option key={skill} value={skill} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => addArrayItem('skills')}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <Plus size={16} /> {t('admin.createCareer.fields.addSkill', 'Add Skill')}
            </button>
            {formErrors.skills && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{formErrors.skills}</p>
            )}
          </div>

          {/* Education Pathway - Related Courses */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
              {t('admin.createCareer.educationPathway', 'Education Pathway')} *
            </h2>
            <p className="text-slate-600 dark:text-gray-400 mb-6">
              {t('admin.createCareer.educationPathwayDesc', 'Add educational programs or courses that lead to this career.')}
            </p>

            <div className="space-y-4">
              {formData.related_courses.map((course, index) => (
                <div key={index} className="flex gap-2">
                  <CustomSelect
                    value={course}
                    onChange={(value) => handleArrayChange('related_courses', index, value)}
                    options={courses.map(c => ({
                      label: c.title,
                      value: c._id
                    }))}
                    placeholder={t('admin.createCareer.fields.coursePlaceholder', 'Select a course')}
                    className="flex-1"
                  />
                  {formData.related_courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('related_courses', index)}
                      className="px-4 text-slate-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center justify-center min-w-[44px]"
                    >
                      <Minus size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addArrayItem('related_courses')}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            >
              <Plus size={16} /> {t('admin.createCareer.fields.addCourse', 'Add Course')}
            </button>
            {formErrors.related_courses && (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{formErrors.related_courses}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-8 border-t border-slate-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => navigate('/careers')}
              className="px-6 py-3 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
            >
              {t('admin.createCareer.cancelBtn', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('admin.createCareer.submittingBtn', 'Creating...')}
                </>
              ) : (
                t('admin.createCareer.submitBtn', 'Create Career')
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateCareerPage;