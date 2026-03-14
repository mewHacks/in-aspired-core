// Single career detail page with save/unsave and admin actions
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { Briefcase, TrendingUp, DollarSign, BookOpen, CheckCircle, ArrowLeft, Edit, Trash2, Archive } from 'lucide-react';
import CourseCard from '../components/courses/CourseCard';
import HorizontalSlider from '../components/ui/HorizontalSlider';
import QuickEditModal from '../components/careers/QuickEditModal';
import { fetchCareerById, fetchCourses, deleteCareer } from '../services/api';
import { Career, Course } from '../types';
import { useRoles } from '../hooks/useRoles';
import { useToast } from '../contexts/ToastContext';
import SaveCareerButton from '../components/careers/SaveCareerButton';
import ArchiveButton from '@/components/ui/ArchiveButton';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

const CareerDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { confirm: confirmAction } = useConfirm();
  // Read URL and navigate 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useRoles();
  const toast = useToast();

  // Check where user came from
  const fromArchived = location.state?.from === 'archived';
  const fromSaved = location.state?.from === 'saved';

  // Derive back button destination and label
  const backTo = fromArchived ? '/admin/archived?tab=careers' : fromSaved ? '/saved?tab=careers' : '/careers';
  const backLabel = fromArchived ? t('careerDetail.backLabels.archived') : fromSaved ? t('careerDetail.backLabels.saved') : t('careerDetail.backLabels.careers');

  const [career, setCareer] = useState<Career | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [deleting] = useState(false);

  // Load career and courses data
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [careerData, coursesData] = await Promise.all([
          fetchCareerById(id),
          fetchCourses()
        ]);
        setCareer(careerData);
        setCourses(coursesData);
      } catch (error) {
        console.error("Failed to load data", error);
        toast.error(t('careerDetail.toast.loadFail'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleDeleteCareer = async () => {
    if (!id || !isAdmin) return;

    const confirmed = await confirmAction({
      title: t('common.warning'),
      message: t('careerDetail.confirmDelete', { name: career?.name }),
      variant: 'danger',
      confirmLabel: t('careerDetail.actions.delete')
    });

    if (confirmed) {
      try {
        await deleteCareer(id);
        toast.success(t('careerDetail.toast.deleteSuccess'));
        navigate('/careers');
      } catch (error) {
        console.error('Failed to delete career', error);
        toast.error(t('careerDetail.toast.deleteFail'));
      }
    }
  };

  // Refresh career data after quick edit
  const refreshCareerData = async () => {
    if (!id) return;
    try {
      const careerData = await fetchCareerById(id);
      setCareer(careerData);
    } catch (error) {
      console.error('Failed to refresh career data', error);
    }
  };

  // Find related courses
  const relatedCourses = useMemo(() => {
    if (!career) return [];
    return courses.filter(c => career.related_courses.includes(c.id));
  }, [career, courses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center pt-16">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-48 bg-slate-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!career) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('careerDetail.notFound.title')}</h2>
          <button
            onClick={() => navigate('/careers')}
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            {t('careerDetail.notFound.backBtn')}
          </button>
        </div>
      </div>
    );
  }

  // Determine demand tag color
  const demandColor = {
    'High': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    'Medium': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    'Low': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  }[career.demand_level || 'Medium'];

  // Format salary
  const formatSalary = (val?: number) => val ? `RM ${val.toLocaleString()}` : 'N/A';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16 ${career.isArchived ? 'opacity-60' : ''}`}>

      {/* Navigation bar */}
      <Navbar />

      {/* Archived Banner */}
      {career.isArchived && (
        <div className="bg-gray-800 dark:bg-gray-900 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <Archive className="w-4 h-4" />
          {t('careerDetail.archivedBanner')}
        </div>
      )}

      {/* Header backdrop */}
      <div className="bg-slate-900 dark:bg-gray-950 text-white pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900 dark:from-emerald-950 dark:to-gray-950 opacity-90" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* TOP ACTION BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {/* Back button - dynamic label and destination based on where user came from */}
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{backLabel}</span>
            </Link>

            {/* Right side buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Save button for ALL users - disabled when archived */}
              <SaveCareerButton
                careerId={career.id}
                careerName={career.name}
                variant="button"
                disabled={career.isArchived}
              />

              {/* Admin buttons on right - Only show if admin */}
              {isAdmin && (
                <div className="flex gap-3">
                  {/* QUICK EDIT BUTTON - disabled when archived */}
                  <button
                    onClick={() => !career.isArchived && setShowQuickEditModal(true)}
                    disabled={career.isArchived}
                    className="flex items-center gap-2 px-4 py-2.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit size={18} />
                    {t('careerDetail.actions.quickEdit')}
                  </button>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={handleDeleteCareer}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl hover:border-rose-300 dark:hover:border-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-rose-700 dark:border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                        {t('careerDetail.actions.deleting')}
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        {t('careerDetail.actions.delete')}
                      </>
                    )}
                  </button>

                  {/* ARCHIVE BUTTON */}
                  <ArchiveButton
                    itemId={career.id}
                    itemType="career"
                    itemTitle={career.name}
                    variant="button"
                    archived={career.isArchived}
                    onArchivedChange={() => navigate('/careers')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Career name and industry */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 dark:bg-white/5 text-emerald-300 dark:text-emerald-400 border border-white/20 dark:border-white/10 uppercase tracking-wide">
                  {career.industry[0]}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {t(`careers.items.${career.id}`, career.name)}
              </h1>
              <div className="flex flex-wrap gap-6 text-slate-300 dark:text-slate-400">
                {/* Salary range */}
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-emerald-400 dark:text-emerald-500" />
                  {formatSalary(career.salary_low)} - {formatSalary(career.salary_high)}
                </div>

                {/* Demand level */}
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${demandColor} bg-opacity-90 border-0`}>
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                  {t('careerDetail.labels.demand', { level: career.demand_level })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Career description */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                {t('careerDetail.labels.about')}
              </h2>
              <p className="text-slate-600 dark:text-gray-400 leading-relaxed mb-6">
                {t(`careers.descriptions.${career.id}`, career.description)}
              </p>

              {/* RIASEC Personality Match */}
              <div className="flex items-center mb-4 gap-5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center text-sm uppercase tracking-wide">
                  {t('careerDetail.labels.riasec')}
                </h3>
                <Link
                  to="/personality-test"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium hover:underline"
                >
                  {t('careerDetail.labels.whatIsThis')}
                </Link>
              </div>
              <div className="inline-flex items-center px-4 py-2 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-lg font-mono text-lg font-bold border border-slate-200 dark:border-gray-700">
                {career.riasec_code}
              </div>
            </div>

            {/* Skills Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                {t('careerDetail.labels.keySkills')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {career.skills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                    {t(`careers.skills.${skill}`, skill)}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Courses Section */}
            <div>
              <p className="text-slate-600 dark:text-gray-400 mb-6 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                {t('careerDetail.relatedCourses.desc', { name: t(`careers.items.${career.id}`, career.name) })}
              </p>

              {relatedCourses.length > 0 ? (
                <HorizontalSlider
                  title={t('careerDetail.relatedCourses.title')}
                  titleColor="bg-indigo-500 dark:bg-indigo-600"
                  viewMoreLink="/courses"
                  viewMoreText={t('careerDetail.relatedCourses.viewMore')}
                >
                  {relatedCourses.map(course => (
                    <div key={course.id} className="flex-shrink-0 w-80">
                      <CourseCard course={course} />
                    </div>
                  ))}
                </HorizontalSlider>
              ) : (
                <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 text-center">
                  {t('careerDetail.relatedCourses.empty')}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2">{t('careerDetail.labels.whyThis')}</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('careerDetail.labels.whyDesc', { industry: career.industry[0], demand: career.demand_level?.toLowerCase(), riasec: career.riasec_code }) }}>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* QUICK EDIT MODAL */}
      {isAdmin && (
        <QuickEditModal
          career={career}
          isOpen={showQuickEditModal}
          onClose={() => setShowQuickEditModal(false)}
          onSaveSuccess={() => {
            refreshCareerData();
            toast.success(t('careerDetail.toast.updateSuccess'));
          }}
        />
      )}
    </div>
  );
};

export default CareerDetailPage;