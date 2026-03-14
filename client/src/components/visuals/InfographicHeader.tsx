import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'; // Built in charting library chosen for better interaction with React component state management
import { motion } from 'framer-motion';
import { DOMAIN_OPTIONS } from '../../data/domains';
import { useTranslation } from 'react-i18next';
import { Career, Course } from '../../types';
import { LucideList, Wallet } from 'lucide-react';

// Infographic header component to show two charts as overview on top

// Props for the infographic header component
interface InfographicHeaderProps {
    type: 'careers' | 'courses';
    data: Career[] | Course[];
    loading?: boolean;
}

// Define color palette for charts
const COLORS = ['#7c3aed', '#0ea5e9', '#f472b6', '#facc15', '#10b981', '#6366f1', '#f97316', '#ef4444', '#ec4899'];

// Define neon colors for meaning-based visuals
const NEON_COLORS = {
    primary: '#7c3aed', // Electric Violet
    secondary: '#0ea5e9', // Electric Blue
    accent: '#f472b6', // Hot Pink
    warning: '#facc15', // Cyber Yellow
    success: '#10b981', // Emerald
};

// Main infographic header component
const InfographicHeader: React.FC<InfographicHeaderProps> = ({ type, data, loading }) => {
    const { t } = useTranslation();

    // Calculate stats (only re-calculate when data changes)
    const stats = useMemo(() => {
        // If no data is available, do not show infographic header because it is meaningless
        if (!data || data.length === 0) return null;

        // Build a lookup table that maps domain ID to domain label to avoid repeated search through DOMAIN_OPTIONS
        const domainMap = DOMAIN_OPTIONS.reduce((acc, d) => {
            acc[d.id] = d.label; // Map domain ID to domain label
            return acc;
        }, {} as Record<string, string>);

        // If the type is careers, calculate career stats
        if (type === 'careers') {
            const careers = data as Career[];

            // Demand level distribution (High / Medium / Low)
            const demandCounts: Record<string, number> = { 'High': 0, 'Medium': 0, 'Low': 0 };

            // Domain popularity (e.g. Business, Tech, Creative)
            const domainCounts: Record<string, number> = {};

            // Salary aggregation for average pay calculation
            let totalSalaryLow = 0;
            let totalSalaryHigh = 0;
            let salaryCount = 0;

            // Loop through each career and calculate stats
            careers.forEach(c => {

                // Update demand level distribution
                if (c.demand_level) demandCounts[c.demand_level]++;

                // Update domain popularity
                c.related_domains?.forEach((id: string) => {
                    domainCounts[id] = (domainCounts[id] || 0) + 1;
                });

                // Update salary aggregation (only if both higher boundary and lower boundary exist)
                if (c.salary_low && c.salary_high) {
                    totalSalaryLow += c.salary_low;
                    totalSalaryHigh += c.salary_high;
                    salaryCount++;
                }
            });

            // Transform demand counts into chart-friendly format
            const demandData = Object.entries(demandCounts).map(([name, value]) => ({ name, careers: value }));

            // Transform domain counts into chart-friendly format
            const domainData = Object.entries(domainCounts)

                // Map domain ID to domain label
                .map(([id, value]) => {

                    // Trim the domain label to only the first word and capitalize
                    const mappedName = domainMap[id]?.split(',')[0].split('and')[0].trim() || id;
                    const name = mappedName.charAt(0).toUpperCase() + mappedName.slice(1);

                    return {
                        name: t(`domainsShort.${id}`, name),
                        full: t(`domains.${id}`, domainMap[id] || id),
                        careers: value
                    };
                })
                .sort((a, b) => b.careers - a.careers) // Sort by count in descending order
                .slice(0, 5); // Limit to top 5 for visual clarity

            // Calculate average salary
            const avgSalary = salaryCount > 0 ? Math.round((totalSalaryLow + totalSalaryHigh) / (2 * salaryCount)) : 0;

            return { demandData, domainData, avgSalary, totalCount: careers.length };
        } else {
            // If the type is courses, calculate course stats
            const courses = data as Course[];

            // Cost distribution
            const costCounts: Record<string, number> = {
                '< RM 20k': 0,
                'RM 20k - 50k': 0,
                '> RM 50k': 0
            };

            // Domain distribution
            const domainCounts: Record<string, number> = {};

            // Loop through each course and calculate stats
            courses.forEach(c => {

                // Update cost distribution
                if (c.cost_level) costCounts[c.cost_level]++;

                // Update domain distribution
                c.domainIds?.forEach((id: string) => {
                    domainCounts[id] = (domainCounts[id] || 0) + 1;
                });
            });

            // Transform cost counts into chart-friendly format
            const costData = Object.entries(costCounts).map(([name, value]) => ({ name, courses: value }));

            // Transform domain counts into chart-friendly format
            const domainData = Object.entries(domainCounts)

                // Map domain ID to domain label
                .map(([id, value]) => {

                    // Trim the domain label to only the first word and capitalize
                    const mappedName = domainMap[id]?.split(',')[0].split('and')[0].trim() || id;
                    const name = mappedName.charAt(0).toUpperCase() + mappedName.slice(1);

                    return { name: t(`domainsShort.${id}`, name), courses: value };
                })
                .sort((a, b) => b.courses - a.courses) // Sort by count in descending order
                .slice(0, 5); // Limit to top 5 for visual clarity

            return { costData, domainData, totalCount: courses.length };
        }
    }, [data, type, t]);

    // If loading or no stats, do not render anything
    if (loading || !stats) return null;

    // Helper: get the correct legend data depending on type
    // Used to render the manual legend below the pie chart
    const legendData = type === 'careers'
        ? (stats.demandData || [])
        : (stats.costData || []);

    // Helper: get the fill color for a legend entry depending on type and index
    // Careers use semantic colors (green = high demand, violet = medium, gray = low)
    // Courses use the standard rotating COLORS palette
    const getLegendColor = (entry: { name: string }, index: number): string => {
        if (type === 'careers') {
            if (entry.name === 'High') return NEON_COLORS.success;
            if (entry.name === 'Medium') return NEON_COLORS.primary;
            return '#cbd5e1'; // Low demand = slate gray (kept as is, works in both modes)
        }
        return COLORS[index % COLORS.length];
    };

    return (
        // Return JSX
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full overflow-hidden flex flex-col items-center"
        >
            {/* Compact stats row */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">

                {/* Total results count badge */}
                <div className="bg-slate-50/50 dark:bg-gray-800/50 px-5 py-3 rounded-2xl flex items-center gap-3 group transition-all">
                    <div className="p-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                        <LucideList className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('visuals.results', 'Results')}</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-display leading-none">{stats.totalCount}</span>
                    </div>
                </div>

                {/* Average salary badge (careers only, shown when salary data exists) */}
                {type === 'careers' && stats.avgSalary && stats.avgSalary > 0 && (
                    <div className="bg-slate-50/50 dark:bg-gray-800/50 px-5 py-3 rounded-2xl flex items-center gap-3 group transition-all">
                        <div className="p-2 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">{t('visuals.avgSalary', 'Avg Salary')}</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white font-display leading-none">RM {stats.avgSalary.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">

                {/* Primary Insights (Pie/Bar) */}
                <div className="lg:col-span-1 bg-slate-50/30 dark:bg-gray-800/30 p-6 rounded-3xl transition-all h-full flex flex-col">

                    {/* Section title */}
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-gray-500 font-bold mb-4">
                        {type === 'careers'
                            ? t('visuals.overallDemand', 'Overall Demand Distribution')
                            : t('visuals.overallCost', 'Overall Cost Analysis')}
                    </h4>

                    {/* Pie/Donut chart container
                        Fixed height so the SVG always has enough room to render fully.
                        Legend is intentionally NOT inside the chart (recharts Legend causes
                        clipping issues with multi-line translated text) */}
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">

                            {/* Pie Chart For Career Demand */}
                            {type === 'careers' ? (
                                // Career Demand Level
                                <PieChart>
                                    <Pie
                                        data={stats.demandData || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="careers"
                                    >
                                        {/* Color each slice semantically */}
                                        {stats.demandData && stats.demandData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.name === 'High'
                                                        ? NEON_COLORS.success
                                                        : entry.name === 'Medium'
                                                            ? NEON_COLORS.primary
                                                            : '#cbd5e1'
                                                }
                                            />
                                        ))}
                                    </Pie>

                                    {/* Tooltip shown on hover */}
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: 'none',
                                            backgroundColor: 'rgba(255,255,255,0.95)',
                                            color: '#1e293b'
                                        }}
                                        formatter={(value: number | undefined) => [`${value} ${t('visuals.careers', 'careers')}`, null]}
                                    />

                                    {/* NOTE: <Legend> is intentionally removed from inside the chart.
                                        Recharts renders the legend inside the SVG bounding box, which
                                        causes the donut to get clipped when legend text is long (e.g. Chinese).
                                        We use a manual legend below instead. */}
                                </PieChart>
                            ) : (
                                // Course Cost
                                <PieChart>
                                    <Pie
                                        data={stats.costData || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="courses"
                                    >
                                        {/* Color each slice using the rotating COLORS palette */}
                                        {stats.costData && stats.costData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>

                                    {/* Tooltip shown on hover */}
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: 'none',
                                            backgroundColor: 'rgba(255,255,255,0.95)',
                                            color: '#1e293b'
                                        }}
                                        formatter={(value: number | undefined) => [`${value} ${t('visuals.courses', 'courses')}`, null]}
                                    />

                                    {/* NOTE: <Legend> intentionally removed — see comment above */}
                                </PieChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* ── Manual Legend (see comments above about why we don't use the built-in Legend component) ──
                        Rendered as normal HTML/CSS outside the SVG so it:
                        - Never clips the chart
                        - Wraps cleanly regardless of text length or language
                        - Scales properly on all screen sizes */}
                    <div className="flex flex-col gap-2 mt-4">
                        {legendData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                {/* Color dot matching the chart slice */}
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getLegendColor(entry, index) }}
                                />
                                {/* Label text — wraps naturally, no overflow */}
                                <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium leading-tight">
                                    {type === 'careers' && ['High', 'Medium', 'Low'].includes(entry.name) ? t(`visuals.demand.${entry.name}`, entry.name) : entry.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Bar Chart (Domain Popularity) */}
                <div className="lg:col-span-2 bg-slate-50/30 dark:bg-gray-800/30 p-6 rounded-3xl overflow-hidden relative h-full">

                    {/* Section title */}
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-gray-500 font-bold flex items-center gap-2">
                            {t('visuals.topFieldRep', 'Overall Top Field Representation')}
                        </h4>
                    </div>

                    {/* Horizontal bar chart container */}
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">

                            {/* Horizontal bar chart — one bar per domain, sorted by count */}
                            <BarChart
                                data={stats.domainData}
                                layout="vertical"
                                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                                barSize={12}
                            >
                                {/* X axis is numeric (count), hidden for cleanliness */}
                                <XAxis type="number" hide />

                                {/* Y axis shows domain name labels */}
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />

                                {/* Tooltip shown on bar hover */}
                                <Tooltip
                                    cursor={{ fill: 'rgba(124, 58, 237, 0.02)' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: 'none',
                                        backgroundColor: 'rgba(255,255,255,0.95)',
                                        color: '#1e293b'
                                    }}
                                    formatter={(value: number | undefined) => [
                                        `${value} ${type === 'careers' ? t('visuals.careers', 'careers') : t('visuals.courses', 'courses')}`,
                                        null
                                    ]}
                                />

                                {/* Bars — each bar gets a color from the rotating COLORS palette */}
                                <Bar dataKey={type === 'careers' ? 'careers' : 'courses'} radius={[0, 4, 4, 0]}>
                                    {stats.domainData && stats.domainData.map((_entry, index) => (
                                        <Cell
                                            key={`cell2-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Export the infographic header component
export default InfographicHeader;