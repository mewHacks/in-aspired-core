// Reusable landing page section with animated content and call-to-action
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ArrowRight, Lock } from 'lucide-react';
import ScrollRevelation from '@/components/ui/ScrollRevelation';

interface LandingSectionProps {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    linkTo?: string; // Optional for sections without buttons
    colorClass: string; // e.g. 'bg-primary-50'
    imageSide?: 'left' | 'right';
    children?: React.ReactNode;
    isDark?: boolean;
}

const LandingSection: React.FC<LandingSectionProps> = ({
    id,
    title,
    description,
    linkTo,
    colorClass,
    imageSide = 'right',
    children,
    isDark = false
}) => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { confirm: confirmAction } = useConfirm();
    const navigate = useNavigate();

    const handleViewMore = async () => {
        if (!linkTo) return;

        if (isAuthenticated) {
            navigate(linkTo);
        } else {
            // Prompt guest to sign up
            const confirmed = await confirmAction({
                title: t('common.confirm'),
                message: t('landing.common.confirmSignup'),
                confirmLabel: t('nav.signup'),
                variant: 'info'
            });
            if (confirmed) {
                navigate('/signup'); // Improved: go to signup
            }
        }
    };

    return (
        <section 
            id={id} 
            className={`min-h-screen flex items-center justify-center p-8 ${colorClass} snap-start border-b border-white/50 dark:border-gray-800 relative overflow-hidden`}
        >
            <div className="max-w-7xl mx-auto w-full relative z-10">
                <div className={`flex flex-col md:flex-row items-center gap-12 ${imageSide === 'left' ? 'md:flex-row-reverse' : ''}`}>

                    {/* Text Content */}
                    <ScrollRevelation className="flex-1 space-y-8" direction={imageSide === 'left' ? 'right' : 'left'}>
                        <h2 className={`text-4xl md:text-6xl font-display font-bold leading-tight ${
                            isDark ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                            {title}
                        </h2>
                        <p className={`text-lg md:text-xl leading-relaxed max-w-xl ${
                            isDark ? 'text-gray-200' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            {description}
                        </p>

                        {linkTo && (
                            <div className="flex items-center gap-4 pt-4">
                                <Button
                                    onClick={handleViewMore}
                                    variant="primary"
                                    size="lg"
                                    className="group"
                                >
                                    {isAuthenticated ? t('landing.common.viewMore') : t('landing.common.unlockFeature')}
                                    {isAuthenticated ? (
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    ) : (
                                        <Lock className="ml-2 h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </ScrollRevelation>

                    {/* Visual Content (Children ensures flexibility for Hero components etc, or just an image placeholder) */}
                    <ScrollRevelation className="flex-1 w-full flex justify-center" direction={imageSide === 'left' ? 'left' : 'right'} delay={0.2}>
                        {children ? children : (
                            <div className="w-full h-[400px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-white/40 dark:border-gray-700 shadow-xl flex items-center justify-center">
                                <span className="text-gray-400 dark:text-gray-500 font-medium">{t('landing.common.visualPlaceholder')}</span>
                            </div>
                        )}
                    </ScrollRevelation>

                </div>
            </div>
        </section>
    );
};

export default LandingSection;