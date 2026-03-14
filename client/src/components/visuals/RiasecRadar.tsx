import React from 'react';
import {
    RadarChart, // Main chart container
    Radar, // Filled polygon showing scores
    PolarGrid, // Grid lines
    PolarAngleAxis, // Labels
    PolarRadiusAxis, // Score values
    ResponsiveContainer, // Auto resize
    Tooltip // Hoverable tooltips
} from 'recharts';
import { RiasecType } from '../../types';
import { useTranslation } from 'react-i18next';

// Chart data shape
interface RiasecData {
    subject: string; // Axis label
    A: number; // Score value
    fullMark: number; // Max score for scaling
}

// Component props
interface RiasecRadarProps {
    scores: { type: RiasecType; score: number }[]; // RIASEC scores
    interactive?: boolean; // Determines axis labels are hoverable or not
}

// Defines main RIASEC radar component
const RiasecRadar: React.FC<RiasecRadarProps> = ({ scores, interactive = true }) => {
    const { t } = useTranslation();

    // Map RIASEC types to full names for the chart axis
    const typeMap: Record<string, string> = {
        R: t('visuals.riasec.types.R', 'Realistic'),
        I: t('visuals.riasec.types.I', 'Investigative'),
        A: t('visuals.riasec.types.A', 'Artistic'),
        S: t('visuals.riasec.types.S', 'Social'),
        E: t('visuals.riasec.types.E', 'Enterprising'),
        C: t('visuals.riasec.types.C', 'Conventional')
    };

    // Max possible scores based on question distribution (5 points per answer)
    // R:18, I:18, A:18, C:18 questions => 90 points
    // E:19 questions => 95 points
    // S:17 questions => 85 points
    const maxPossibleScores: Record<string, number> = {
        R: 90, I: 90, A: 90, S: 85, E: 95, C: 90
    };

    // Transform scores for Recharts (Normalize to 0-100 scale)
    const data: RiasecData[] = scores.map(s => {
        const maxScore = maxPossibleScores[s.type] || 90; // Fallback to 90
        return {
            subject: typeMap[s.type],
            A: Math.round((s.score / maxScore) * 100), // Normalize to percentage
            fullMark: 100
        };
    });

    // Tracks hovered label for tooltip interaction
    const [hoveredLabel, setHoveredLabel] = React.useState<{ label: string; desc: string; x: number; y: number } | null>(null);

    // Defines RIASEC descriptions for tooltips
    const riasecDescriptions: Record<string, string> = {
        [t('visuals.riasec.types.R', 'Realistic')]: t('visuals.riasec.desc.R', 'Practical & Hands-on. Loves working with tools, machines, plants, or animals.'),
        [t('visuals.riasec.types.I', 'Investigative')]: t('visuals.riasec.desc.I', 'Analytical & Curious. Loves studying, solving math or science problems.'),
        [t('visuals.riasec.types.A', 'Artistic')]: t('visuals.riasec.desc.A', 'Expressive & Creative. Loves art, drama, music, or writing.'),
        [t('visuals.riasec.types.S', 'Social')]: t('visuals.riasec.desc.S', 'Helpful & Friendly. Loves teaching, nursing, or giving first aid.'),
        [t('visuals.riasec.types.E', 'Enterprising')]: t('visuals.riasec.desc.E', 'Ambitious & Persuasive. Loves leading people and selling ideas.'),
        [t('visuals.riasec.types.C', 'Conventional')]: t('visuals.riasec.desc.C', 'Organized & Detail-oriented. Loves working with numbers or records.')
    };

    // Custom tick component for the axis labels (further out)
    const CustomTick = (props: any) => {

        // Extract positioning data
        const { x, y, cx, cy, payload } = props;
        const label = payload.value;

        // Calculate radial position to push labels outward from center to avoid overlap
        // Use smaller shift on mobile (window.innerWidth < 640)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const shift = isMobile ? 12 : 25; // px distance to move outward
        const angle = Math.atan2(y - cy, x - cx);
        const newX = x + Math.cos(angle) * shift;
        const newY = y + Math.sin(angle) * shift;

        // Handles mouse enter which shows tooltip and saves label data
        const handleMouseEnter = () => {
            if (!interactive) return;
            setHoveredLabel({
                label,
                desc: riasecDescriptions[label] || '',
                x: newX,
                y: newY
            });
        };

        // Handles mouse leave which hides tooltip
        const handleMouseLeave = () => {
            if (!interactive) return;
            setHoveredLabel(null);
        };

        return (
            // Renders the label with custom styles and with different mouse behaviour
            <g transform={`translate(${newX},${newY})`}>
                <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="middle"
                    className="fill-purple-600 dark:fill-purple-300 transition-colors"
                    fontSize={isMobile ? 10 : 14}
                    fontWeight={700}
                    fontFamily="Outfit" // Gen Z Heading Font
                    style={{ cursor: interactive ? 'help' : 'default' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {label}
                </text>
            </g>
        );
    };

    // Main chart container
    return (
        <div
            className="w-full h-[320px] xs:h-[380px] sm:h-[450px] md:h-[500px] relative"
            // Ensures tooltip is hidden when mouse leaves the chart
            onMouseLeave={() => setHoveredLabel(null)}
        >

            {/* Custom tooltip overlay */}
            {hoveredLabel && (
                <div
                    className="absolute z-50 bg-slate-900/90 backdrop-blur text-white p-3 rounded-xl shadow-xl w-40 xs:w-48 text-center border border-white/10 pointer-events-none transition-opacity duration-200"
                    style={{
                        left: hoveredLabel.x,
                        top: hoveredLabel.y,
                        transform: 'translate(-50%, -125%)' // Position slightly higher
                    }}
                >
                    <div className="font-bold text-[10px] xs:text-sm text-center mb-1 font-display">{hoveredLabel.label}</div>
                    <div className="text-[9px] xs:text-xs text-slate-300 font-medium leading-relaxed font-sans">{hoveredLabel.desc}</div>

                    {/* CSS Arrow using borders */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/90"></div>
                </div>
            )}

            {/* Responsive chart container */}
            <ResponsiveContainer width="100%" height="100%">

                {/* Radar chart core */}
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data} margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>

                    {/* Grid lines */}
                    <PolarGrid gridType="polygon" stroke="#ddd6fe" /> {/* primary-200 */}

                    {/* Angle axis (RIASEC labels) */}
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={CustomTick}
                    />

                    {/* Radius axis (Scores) */}
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                    {/* Radar polygon shape */}
                    <Radar
                        name={t('visuals.riasec.personalityProfile', 'Personality Profile')}
                        dataKey="A"
                        stroke="#7c3aed" // primary-600
                        strokeWidth={3}
                        fill="#8b5cf6" // primary-500
                        fillOpacity={0.6}
                    />

                    {/* Tooltip which shows numeric score*/}
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            padding: '12px'
                        }}
                    />

                </RadarChart>

            </ResponsiveContainer>
        </div>
    );
};

export default RiasecRadar;
