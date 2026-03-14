// Admin page for creating and editing courses
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calendar, DollarSign, GraduationCap, Hash, Info, Layers, MapPin, AlertCircle, Award, Globe, Clock, Plus, Minus, Tag } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import { CustomSelect } from '../../components/ui/CustomSelect'
import { CreateCourseDTO } from '@in-aspired/shared'
import { Institution } from '../../types/education'
import { Career } from '../../types'
import { fetchCareers, createCourse } from '../../services/api'
import { institutions as institutionData } from '../../data/institutions'
import { DOMAIN_OPTIONS } from '../../data/domains'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'

/* ---------- URL Validation ---------- */
// Regex pattern used to validate application URLs
// Ensures links start with http:// or https://
const URL_REGEX =
  /^(https?:\/\/)([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/

// ---------- Component ----------
export default function CreateCoursePage() {

  // Router navigation
  const navigate = useNavigate()

  // Translation function
  const { t } = useTranslation()

  // Toast notification helper
  const toast = useToast()


  // Get authentication info
  // Redirect non-admin users away from this page
  const { user, isAuthenticated, isLoading } = useAuth();

  // Debug log for auth state
  console.log('CreateCoursePage auth:', { user, isAuthenticated, isLoading });

  /* ---------- Form State ---------- */
  // Main form state storing course data
  const [form, setForm] = useState<CreateCourseDTO>({
    id: '',
    title: '',
    institutionId: '',
    level: 'Diploma',
    type: 'Private',
    mqa_code: '',
    duration_year: '',
    cost_level: '< RM 20k',
    description: '',
    apply_url: '',
    campuses: [],
    accredited_from: undefined,
    accredited_to: undefined,
    difficulty: 'Medium',
    domainIds: [''],
    careers: [''],
    tags: ['']
  })

  // List of institutions available
  const [institutions, setInstitutions] = useState<Institution[]>([])

  // List of careers fetched from backend
  const [careers, setCareers] = useState<Career[]>([])

  // Validation error messages
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Flag to know if data has finished loading
  const [initialized, setInitialized] = useState(false)

  // Prevent multiple submissions
  const [isSubmitting, setIsSubmitting] = useState(false)

  /* ---------- Init ---------- */
  // Runs once when component loads
  useEffect(() => {

    const fetchData = async () => {

      try {

        // Load institution data from local dataset
        setInstitutions(institutionData)

        // Fetch careers from backend API
        const careersData = await fetchCareers()

        setCareers(careersData)

        // Mark page as initialized
        setInitialized(true)

      } catch (error) {

        console.error('Failed to fetch data:', error)

        toast.error(t('admin.createCourse.toast.fetchError'))

      }
    }

    fetchData()

  }, [])

  /* ---------- Helpers ---------- */

  // Generic helper to update form fields safely
  const updateField = <K extends keyof CreateCourseDTO>(
    key: K,
    value: CreateCourseDTO[K]
  ) => {

    setForm(prev => ({
      ...prev,
      [key]: value
    }))

  }

  /* ---------- Dynamic Array Handlers ---------- */
  /* Handles fields like domains, careers, tags */
  // Update domain selection
  const handleDomainChange = (index: number, value: string) => { 

    setForm(prev => {

      const newDomains = [...(prev.domainIds || [])]

      newDomains[index] = value

      return { ...prev, domainIds: newDomains }

    })
  }

  // Add another domain dropdown
  const addDomain = () => { // Append a new empty domain selection to the array, allowing multiple domains to be selected for a course

    setForm(prev => ({
      ...prev,
      domainIds: [...(prev.domainIds || []), ''] // Add empty string for new dropdown
    }))

  }

  // Remove domain dropdown
  const removeDomain = (index: number) => { // Only allow removal if there's more than one domain (to ensure at least one is selected)

    if (form.domainIds && form.domainIds.length > 1) {

      setForm(prev => ({
        ...prev,
        domainIds: prev.domainIds?.filter((_, i) => i !== index) || [] // Remove the domain at the specified index
      }))

    }

  }

  /* ---------- Career Selection Handlers ---------- */
  const handleCareerChange = (index: number, value: string) => { // Update the selected career at the specified index in the careers array

    setForm(prev => {
      const newCareers = [...(prev.careers || [])]
      newCareers[index] = value
      return { ...prev, careers: newCareers }
    })
  }

  // Add a new career selection dropdown by appending an empty string to the careers array, 
  // allowing multiple careers to be associated with the course
  const addCareer = () => {

    setForm(prev => ({
      ...prev,
      careers: [...(prev.careers || []), '']
    }))

  }

  // Remove a career selection dropdown at the specified index, 
  // but only if there's more than one career selected to ensure at least one career remains associated with the course
  const removeCareer = (index: number) => {

    if (form.careers && form.careers.length > 1) {

      setForm(prev => ({
        ...prev,
        careers: prev.careers?.filter((_, i) => i !== index) || []
      }))

    }

  }

  /* ---------- Tag Handlers ---------- */
  const handleTagChange = (index: number, value: string) => { 
    // Update the tag at the specified index in the tags array when the user edits a tag input field

    setForm(prev => {
      const newTags = [...(prev.tags || [])]
      newTags[index] = value
      return { ...prev, tags: newTags }
    })
  }

  // Add a new tag input by appending an empty string to the tags array, 
  // allowing multiple tags to be added for the course
  const addTag = () => {

    setForm(prev => ({
      ...prev,
      tags: [...(prev.tags || []), '']
    }))

  }

  // Remove a tag input at the specified index, 
  // but only if there's more than one tag to ensure at least one tag remains associated with the course
  const removeTag = (index: number) => {

    if (form.tags && form.tags.length > 1) {

      setForm(prev => ({
        ...prev,
        tags: prev.tags?.filter((_, i) => i !== index) || []
      }))

    }

  }

  /* ---------- Auto ID Generator ---------- */
  // Automatically generates course ID based on:
  // institution + course title + level
  const generatedId = useMemo(() => {

    const title = form.title
    const institutionId = form.institutionId
    const level = form.level

    if (!title.trim()) return ''
    if (!institutionId.trim()) return ''

    const inst = institutionId.toLowerCase()


    // Helper function that converts text → URL slug
    const createSlug = (text: string) => {

      return text
        .toLowerCase()
        .replace(/\b(in|of|and|for|the|a|an)\b/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '')

    }

    // Special handling for Pre-U programs
    if (level === 'General Pre-U') {

      const preUMap: Record<string, string> = {
        'A-LEVEL': 'alevel',
        'AUSMAT': 'ausmat',
        'CIMP': 'cimp',
      }

      const upperTitle = title.toUpperCase()

      // Check for exact matches or partial matches
      for (const [key, value] of Object.entries(preUMap)) {
        // Check if the title contains the key (e.g., "AUSMAT" in "Australian Matriculation (AUSMAT)")
        if (upperTitle.includes(key)) {
          return `${inst}-${value}`
        }

      }

      const slug = createSlug(title)
      return `${inst}-${slug}`
    }

    // Level code mapping
    let levelCode = ''

    if (level === 'Diploma') {
      levelCode = 'dip'
    } else if (level === 'Foundation') {
      levelCode = 'fnd'
    } else {
      // Fallback for any other levels
      levelCode = String(level).toLowerCase().replace(/\s+/g, '-')
    }

     // Create slug from title (removing level indicators for cleaner slugs)
    let slugText = title
    // Remove level indicators from the title for the slug
    if (level === 'Diploma') {
      slugText = slugText.replace(/\bDiploma\b/gi, '')
    }

    if (level === 'Foundation') {
      slugText = slugText.replace(/\bFoundation\b/gi, '')
    }

    const slug = createSlug(slugText) 

    // If slug is empty after cleaning, use a fallback
    if (!slug) {
      return `${inst}-${levelCode}`
    }

    return `${inst}-${slug}-${levelCode}`

  }, [form.title, form.institutionId, form.level])

  // updates the form's id field with the generated ID
  useEffect(() => {

    if (generatedId) {
      updateField('id', generatedId)
    }

  }, [generatedId])

  /* ---------- Institution Change ---------- */
  // When admin selects institution:
  // - update institution ID
  // - auto-fill apply URL
  // - auto-fill campuses
  const handleInstitutionChange = (institutionId: string) => {

    const inst = institutions.find(i => i.id === institutionId)

    if (!inst) return

    const updatedForm = {

      ...form,

      institutionId,

      apply_url:
        form.apply_url === '' ||
        form.apply_url === selectedInstitution?.apply_url
          ? inst.apply_url ?? ''
          : form.apply_url,

      campuses: [...(inst.campuses ?? [])]

    }

    setForm(updatedForm)

  }


  // Selected institution object
  const selectedInstitution = institutions.find(
    i => i.id === form.institutionId
  )

  /* ---------- Application URL Auto Update ---------- */
  // Auto-fill application URL if institution changes
  useEffect(() => {

    if (!initialized || !selectedInstitution) return

    const shouldAutoUpdate =
      !form.apply_url ||
      institutions.some(inst => inst.apply_url === form.apply_url)

    if (shouldAutoUpdate && selectedInstitution.apply_url) {

      updateField('apply_url', selectedInstitution.apply_url)

    }

  }, [form.institutionId, initialized])

  // ---------- Validation ----------
  const validate = (): boolean => {

    const e: Record<string, string> = {}

    if (!form.title.trim())
      e.title = 'Course title is required'

    if (!form.institutionId)
      e.institutionId = 'Institution is required'

    if (!form.description.trim())
      e.description = 'Description is required'

    if (!form.mqa_code.trim())
      e.mqa_code = 'MQA code is required'

    if (!form.duration_year.trim())
      e.duration_year = 'Duration is required'


    // URL validation
    if (!form.apply_url.trim())
      e.apply_url = 'Application URL is required'
    else if (!URL_REGEX.test(form.apply_url))
      e.apply_url = 'Invalid URL'


    // Accreditation date validation
    if (
      form.accredited_from &&
      form.accredited_to &&
      form.accredited_from > form.accredited_to
    ) {
      e.accreditation = 'Accredited From must be before Accredited To'
    }

    // Campus validation
    if (!form.campuses?.length)
      e.campuses = 'Select at least one campus'

    // Domain validation
    const validDomains = form.domainIds?.filter(d => d.trim()) || []
    if (validDomains.length === 0)
      e.domainIds = 'At least one domain is required'

    // Career validation
    const validCareers = form.careers?.filter(c => c.trim()) || []
    if (validCareers.length === 0)
      e.careers = 'At least one related career is required'

    setErrors(e)

    return Object.keys(e).length === 0

  }

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    // Run validation first
    if (!validate()) {

      toast.error(t('admin.createCourse.toast.formError'))

      return

    }

    setIsSubmitting(true)

    try {
      // Clean payload before sending to backend
      const payload = {

        ...form,

        domainIds: form.domainIds?.filter(d => d.trim()) || [],

        careers: form.careers?.filter(c => c.trim()) || [],

        tags: form.tags?.filter(t => t.trim()) || [],

        accredited_from:
          form.accredited_from instanceof Date
            ? form.accredited_from.toISOString()
            : form.accredited_from,

        accredited_to:
          form.accredited_to instanceof Date
            ? form.accredited_to.toISOString()
            : form.accredited_to

      }

      // Call backend API
      await createCourse({ ...payload, id: form.id || generatedId })

      toast.success(t('admin.createCourse.toast.success'))

      // Reset form after successful creation
      setForm({
        id: '',
        title: '',
        institutionId: '',
        level: 'Diploma',
        type: 'Private',
        mqa_code: '',
        duration_year: '',
        cost_level: '< RM 20k',
        description: '',
        apply_url: '',
        campuses: [],
        accredited_from: undefined,
        accredited_to: undefined,
        difficulty: 'Medium',
        domainIds: [''],
        careers: [''],
        tags: ['']
      })

      // Redirect back to course list
      navigate('/courses')

    } catch (error: any) {

      console.error('Failed to create course:', error)

      toast.error(
        error?.message ||
        error?.response?.data?.message ||
        t('admin.createCourse.toast.fail')
      )

    } finally {

      setIsSubmitting(false)

    }

  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans">
      {/* Navigation Bar */}
      <Navbar />

      <div className="pt-16">
        {/* Header section */}
        <div className="bg-slate-900 dark:bg-gray-950 text-white pt-12 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-gray-950 opacity-90" />
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            {/* Back button */}
            <div className="flex justify-between items-center mb-8">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02]"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('admin.createCourse.backBtn')}</span>
              </Link>
            </div>

            {/* Page title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('admin.createCourse.title')}</h1>
              <p className="text-slate-300 dark:text-slate-400">
                {t('admin.createCourse.subtitle')}
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
                <Info className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.basicInfo')}
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Course Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.title')} *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => updateField('title', e.target.value)}
                      placeholder={t('admin.createCourse.fields.titlePlaceholder')}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.title ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                        }`}
                    />
                    {errors.title && (
                      <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle size={14} /> {errors.title}
                      </p>
                    )}
                    {form.id && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                        Auto-generated ID: <code className="bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded">{form.id}</code>
                      </p>
                    )}
                  </div>

                  {/* Institution */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.institution')} *
                    </label>
                    <CustomSelect
                      value={form.institutionId ?? ''}
                      onChange={handleInstitutionChange}
                      options={institutions.map(i => ({
                        label: i.name,
                        value: i.id
                      }))}
                      placeholder={t('admin.createCourse.fields.institutionPlaceholder')}
                      className={errors.institutionId ? 'border-rose-500 dark:border-rose-600' : ''}
                    />
                    {errors.institutionId && (
                      <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle size={14} /> {errors.institutionId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Application URL - Full width */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    {t('admin.createCourse.fields.applyUrl')} *
                  </label>
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-slate-400 dark:text-gray-500 mr-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={form.apply_url ?? ''}
                      onChange={e => updateField('apply_url', e.target.value)}
                      placeholder={t('admin.createCourse.fields.applyUrlPlaceholder')}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.apply_url ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                        }`}
                    />
                  </div>
                  {errors.apply_url && (
                    <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.apply_url}
                    </p>
                  )}
                  {selectedInstitution && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        Default URL: <span className="font-medium">{selectedInstitution.apply_url || 'Not set'}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => updateField('apply_url', selectedInstitution.apply_url || '')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                      >
                        Use Default
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Level */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.level')} *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Foundation', 'Diploma', 'General Pre-U'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateField('level', level as CreateCourseDTO['level'])}
                          className={`px-4 py-3 rounded-xl border font-medium transition-all text-sm ${form.level === level
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.type')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Private', 'Public'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateField('type', type as CreateCourseDTO['type'])}
                          className={`px-4 py-3 rounded-xl border font-medium transition-all text-sm ${form.type === type
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <BookOpen className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.descSection')} *
              </h2>
              <textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder={t('admin.createCourse.fields.descPlaceholder')}
                rows={5}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.description ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                  }`}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Academic Details Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <GraduationCap className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                  {t('admin.createCourse.academicDetails')}
                </h2>

                <div className="space-y-6">
                  {/* MQA Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.mqa')} *
                    </label>
                    <div className="flex items-center">
                      <Hash className="h-5 w-5 text-slate-400 dark:text-gray-500 mr-3" />
                      <input
                        type="text"
                        value={form.mqa_code}
                        onChange={e => updateField('mqa_code', e.target.value)}
                        placeholder={t('admin.createCourse.fields.mqaPlaceholder')}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.mqa_code ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                          }`}
                      />
                    </div>
                    {errors.mqa_code && (
                      <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle size={14} /> {errors.mqa_code}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.duration')} *
                    </label>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-slate-400 dark:text-gray-500 mr-3" />
                      <input
                        type="text"
                        value={form.duration_year ? `${form.duration_year} year(s)` : ''}
                        onChange={e => updateField('duration_year', e.target.value.replace(/\s*year\(s\)/, '').trim())}
                        placeholder="e.g., 2 year(s)"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.duration_year ? 'border-rose-500 dark:border-rose-600' : 'border-slate-300 dark:border-gray-700'
                          }`}
                      />
                    </div>
                    {errors.duration_year && (
                      <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle size={14} /> {errors.duration_year}
                      </p>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.difficulty')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Easy', 'Medium', 'Hard'].map(difficulty => (
                        <button
                          key={difficulty}
                          type="button"
                          onClick={() => updateField('difficulty', difficulty as 'Easy' | 'Medium' | 'Hard')}
                          className={`px-4 py-3 rounded-xl border font-medium transition-all text-sm ${form.difficulty === difficulty
                            ? difficulty === 'Easy'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : difficulty === 'Medium'
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {difficulty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <DollarSign className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                  {t('admin.createCourse.financialDetails')}
                </h2>

                <div className="space-y-6">
                  {/* Cost Level */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      {t('admin.createCourse.fields.cost')}
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {['< RM 20k', 'RM 20k - 50k', '> RM 50k'].map(cost => (
                        <button
                          key={cost}
                          type="button"
                          onClick={() => updateField('cost_level', cost as CreateCourseDTO['cost_level'])}
                          className={`px-4 py-3 rounded-xl border font-medium transition-all text-sm ${form.cost_level === cost
                            ? cost === '< RM 20k'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : cost === 'RM 20k - 50k'
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          {cost}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accreditation Dates Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.accreditation')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    {t('admin.createCourse.fields.accFrom')}
                  </label>
                  <input
                    type="date"
                    value={form.accredited_from ? form.accredited_from.toISOString().slice(0, 10) : ''}
                    onChange={e => updateField('accredited_from', e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    {t('admin.createCourse.fields.accTo')}
                  </label>
                  <input
                    type="date"
                    value={form.accredited_to ? form.accredited_to.toISOString().slice(0, 10) : ''}
                    onChange={e => updateField('accredited_to', e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {errors.accreditation && (
                <p className="mt-4 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.accreditation}
                </p>
              )}
            </div>

            {/* Campuses Card */}
            {selectedInstitution?.campuses?.length ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <MapPin className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                  {t('admin.createCourse.campuses')} *
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedInstitution.campuses.map(campus => (
                    <label
                      key={campus}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${form.campuses?.includes(campus)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.campuses?.includes(campus) || false}
                        onChange={() => {
                          updateField(
                            'campuses',
                            form.campuses?.includes(campus)
                              ? form.campuses?.filter(c => c !== campus) ?? []
                              : [...(form.campuses ?? []), campus]
                          )
                        }}
                        className="h-5 w-5 text-indigo-600 dark:text-indigo-400 rounded border-slate-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
                      />
                      <span className="font-medium text-slate-700 dark:text-gray-300">{campus}</span>
                    </label>
                  ))}
                </div>
                {errors.campuses && (
                  <p className="mt-4 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.campuses}
                  </p>
                )}
              </div>
            ) : null}

            {/* Domains Card (Dynamic like Required Skills) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Layers className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.domains')} *
              </h2>

              <div className="space-y-4">
                {form.domainIds?.map((domainId, index) => (
                  <div key={index} className="flex gap-2">
                    <CustomSelect
                      value={domainId}
                      onChange={(value) => handleDomainChange(index, value)}
                      options={DOMAIN_OPTIONS.map(domain => ({
                        label: domain.label,
                        value: domain.id
                      }))}
                      placeholder="Select a domain"
                      className="flex-1"
                    />
                    {form.domainIds && form.domainIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDomain(index)}
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
                onClick={addDomain}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <Plus size={16} /> {t('admin.createCourse.fields.addDomain', 'Add Domain')}
              </button>

              {errors.domainIds && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.domainIds}
                </p>
              )}
            </div>

            {/* Related Careers Card (Dynamic like Education Pathway) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Award className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.relatedCareers', 'Related Careers')} *
              </h2>

              <p className="text-slate-600 dark:text-gray-400 mb-6">
                {t('admin.createCourse.relatedCareersDesc', 'Add career pathways that this course can lead to.')}
              </p>

              <div className="space-y-4">
                {form.careers?.map((careerId, index) => (
                  <div key={index} className="flex gap-2">
                    <CustomSelect
                      value={careerId}
                      onChange={(value) => handleCareerChange(index, value)}
                      options={careers.map(career => ({
                        label: career.name,
                        value: career.id
                      }))}
                      placeholder={t('admin.createCourse.fields.careerPlaceholder', 'Select a career')}
                      className="flex-1"
                    />
                    {form.careers && form.careers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCareer(index)}
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
                onClick={addCareer}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <Plus size={16} /> {t('admin.createCourse.fields.addCareer', 'Add Career')}
              </button>

              {errors.careers && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.careers}
                </p>
              )}
            </div>

            {/* Tags Card - Updated with Tag icon */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Tag className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                {t('admin.createCourse.fields.tags', 'Highlights')}
              </h2>

              <p className="text-slate-600 dark:text-gray-400 mb-6">
                {t('admin.createCourse.fields.tagsDesc', 'Add relevant tags to help users discover this course (e.g., STEM, Creative, Business, etc.)')}
              </p>

              <div className="space-y-4">
                {form.tags?.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder={t('admin.createCourse.fields.tagsPlaceholder', 'e.g., STEM, Creative Arts, Business, Technology')}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    {form.tags && form.tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
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
                onClick={addTag}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <Plus size={16} /> {t('admin.createCourse.fields.addTag', 'Add Tag')}
              </button>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-8 border-t border-slate-200 dark:border-gray-800">
              <Link
                to="/courses"
                className="px-6 py-3 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
              >
                {t('admin.createCourse.cancelBtn', 'Cancel')}
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('admin.createCourse.submittingBtn', 'Creating...')}
                  </>
                ) : (
                  t('admin.createCourse.submitBtn', 'Create Course')
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}