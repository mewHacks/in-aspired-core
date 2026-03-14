// pdf.service.ts
// Service responsible for generating the 14-page premium PDF personality report.
// Orchestrates data fetching, AI insight generation, HTML rendering, and Puppeteer-based PDF conversion.

import puppeteer from 'puppeteer';
import User from '../models/User';
import Result from '../models/Result';
import Career from '../models/Career';
import { Profile, TYPE_DATA, DARK_SIDE_CONTENT, COMMUNICATION_CONTENT, ENERGY_CONTENT, getGrowthTimeline, getSoftSkills, analyzeProfileInsight, ProfileInsight } from './pdf.content';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';
import { codeToVector, cosineSimilarity, normalizeVector, scoresToVector } from '../utils/riasec.utils';

// PdfService v3.0 - Comprehensive Premium Report
export class PdfService {

    // Generates the full premium PDF report for a given user.
    // Fetches user data and results from DB, obtains AI insights (cached or fresh),
    // renders the HTML report, and converts it to a PDF buffer via Puppeteer.
    async generateReport(userId: string, transactionId: string): Promise<Buffer> {
        console.log(`[PdfService] Generating Premium Report...`);

        const user = await User.findById(userId);
        if (!user) throw new Error(`User not found: ${userId}`);

        const result = await Result.findOne({ userId }).sort({ createdAt: -1 });
        if (!result) throw new Error(`Result not found: ${userId}`);

        const insight = analyzeProfileInsight(result.scores);
        const careerMarketData = await this.getCareerMarketData(result.scores);

        // Use cached AI insight if available, otherwise generate and save
        let deepData;
        if (result.aiInsight && result.aiInsight.mirror) {
            console.log(`[PdfService] Using cached AI Insight`);
            deepData = result.aiInsight;
        } else {
            console.log(`[PdfService] Generating new AI Insight...`);
            deepData = await this.generateDeepInsight(user, result, insight);

            // Background update: Save the generated insight to the database
            Result.findByIdAndUpdate(result._id, { aiInsight: deepData })
                .then(() => console.log(`[PdfService] AI Insight cached`))
                .catch(err => console.error(`[PdfService] Failed to cache AI Insight:`, err));
        }

        const htmlContent = this.renderReportHtml(user, result, transactionId, insight, deepData, careerMarketData);

        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
            protocolTimeout: 120000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',    // Avoids /dev/shm exhaustion in Docker (64MB default)
                '--disable-gpu',
                '--no-zygote',                // Skips zygote process — reduces memory overhead in Docker
                '--single-process',           // Runs renderer in the browser process — lower RAM on constrained VMs
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-first-run',
            ]
        });

        try {
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(120000);

            // Fix for "Requesting main frame too early!" bug in constrained Docker environments
            // Force the browser to fully initialize the default blank frame before injecting content
            await page.goto('about:blank', { waitUntil: 'domcontentloaded' });

            await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 120000 });
            return Buffer.from(await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' },
                timeout: 120000
            }));
        } finally {
            await browser.close();
        }
    }

    // Local testing only — bypasses DB, not used in production.
    // Accepts raw user and result objects directly for offline/dev PDF generation.
    async generateReportFromData(user: any, result: any, transactionId: string): Promise<Buffer> {
        const insight = analyzeProfileInsight(result.scores);
        const careerMarketData = await this.getCareerMarketData(result.scores);
        let deepData;
        if (result.aiInsight && result.aiInsight.mirror) {
            deepData = result.aiInsight;
        } else {
            deepData = await this.generateDeepInsight(user, result, insight);
        }
        const htmlContent = this.renderReportHtml(user, result, transactionId, insight, deepData, careerMarketData);
        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            headless: true,
            protocolTimeout: 120000,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process', '--disable-extensions']
        });
        try {
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(120000);
            await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
            await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 120000 });
            return Buffer.from(await page.pdf({
                format: 'A4', printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }, timeout: 120000
            }));
        } finally {
            await browser.close();
        }
    }

    // Clamps a multi-paragraph text string to a maximum word count.
    // Splits on double-newlines, accumulates words up to maxWords, and returns
    // the truncated text with paragraph breaks preserved.
    private clampWords(text: string, maxWords: number): string {
        if (!text) return '';
        const paragraphs = text.split(/\n{2,}/);
        let wordCount = 0;
        const result: string[] = [];

        for (const p of paragraphs) {
            const words = p.trim().split(/\s+/).filter(Boolean);
            if (words.length === 0) continue;

            if (wordCount + words.length <= maxWords) {
                result.push(words.join(' '));
                wordCount += words.length;
                continue;
            }

            const remaining = Math.max(0, maxWords - wordCount);
            if (remaining > 0) {
                const clipped = words.slice(0, remaining).join(' ');
                result.push(clipped.replace(/[.,;:!?\s]*$/, ''));
            }
            break;
        }

        return result.join('\n\n');
    }

    // Retrieves the top 5 career matches from the database based on RIASEC cosine similarity.
    // Converts user scores and career RIASEC codes to vectors, ranks by similarity,
    // and returns salary, demand, and education metadata for the best matches.
    private async getCareerMarketData(scores: { type: string; score: number }[]): Promise<Array<{
        name: string;
        description?: string;
        industry?: string[];
        salary_low: number;
        salary_high: number;
        demand_level: string;
        education_level_required: string;
    }>> {
        try {
            const userVector = scoresToVector(scores);
            const careers = await Career.find({
                riasec_code: { $exists: true, $ne: '' },
                isArchived: { $ne: true }
            }).select('name description industry riasec_code salary_low salary_high demand_level education_level_required');

            const ranked = careers.map(career => {
                const careerVector = normalizeVector(codeToVector(career.riasec_code || ''));
                const similarity = cosineSimilarity(userVector, careerVector);
                return { career, similarity };
            }).sort((a, b) => b.similarity - a.similarity);

            return ranked.slice(0, 5).map(r => ({
                name: r.career.name,
                description: r.career.description,
                industry: r.career.industry,
                salary_low: r.career.salary_low,
                salary_high: r.career.salary_high,
                demand_level: r.career.demand_level || 'Medium',
                education_level_required: r.career.education_level_required || 'Degree'
            }));
        } catch (err) {
            console.error('[PdfService] Salary careers lookup failed:', err);
            return [];
        }
    }

    // Generates an AI-powered deep psychological insight using Google Gemini.
    // Sends a structured prompt with the user's RIASEC data and expects a JSON response
    // containing mirror narrative, structural analysis, gap analysis, and suppression commentary.
    // Falls back to generic placeholder text if the AI call fails.
    private async generateDeepInsight(user: any, result: any, insight: ProfileInsight): Promise<any> {
        try {
            const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `
You are a clinical psychological profiler for "In-Aspired" using RIASEC personality assessment.
Generate a structured JSON response (NO markdown, NO code blocks, ONLY pure JSON) containing:

{
  "mirror": "Penetrating clinical narrative (~120 words). Exactly 3 paragraphs. Focus on Internal Dynamics, Tension, and Shadow Psychology.",
  "structure": "A 2-sentence elaboration on the ${insight.balanceType} layout.",
  "gap": "A 2-sentence elaboration on the ${insight.gaps.p1s}pt dominance gap.",
  "suppression": "A 2-sentence elaboration on the suppression of ${insight.suppressedTraits.join(', ') || 'traits'}."
}

**USER DATA:**
- Name: ${user.name || 'User'}
- RIASEC Scores: ${insight.ranked.map(s => `${s.type}(${s.score}%)`).join(' → ')}
- Suppressed: ${insight.suppressedTraits.join(', ')}

**CRITICAL CONSTRAINTS:**
- **STRICT Word Limit:** Total response MUST be under 300 words to fit on ONE PAGE.
- **Deep but Accessible:** Use terms like 'cognitive dissonance' or 'projection' but ensure the user understands the impact.
- **No Career/Comm Advice:** Stay purely on psychological systems and identity.
- **Formatting:** No markdown, no bolding, no lists. Paragraphs separated by \\n\\n.
            `;

            const res = await model.generateContent(prompt);
            const text = res.response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0].trim());
            }
            throw new Error("Invalid AI response format: " + text);
        } catch (err) {
            console.error('[PdfService] AI Insight Failed:', err);
            return {
                mirror: "Your profile shows a unique balance of traits that creates a dynamic internal landscape. Focus on integrating your diverse strengths while remaining aware of how your secondary traits support your primary goals.",
                structure: "The current balance between your primary and secondary traits suggests a highly adaptable approach to challenges.",
                gap: "The numeric gap between your top scores indicates a nuanced orientation where multiple priorities often overlap.",
                suppression: "The traits scoring lower in your profile represent areas where you may consciously de-prioritize specific modes of action."
            };
        }
    }

    // Renders the complete 14-page HTML report template.
    // Assembles all profile data, AI insights, career market data, SVG charts,
    // and static content into a single HTML string ready for Puppeteer PDF conversion.
    private renderReportHtml(
        user: any,
        result: any,
        transactionId: string,
        insight: ProfileInsight,
        deepData: any,
        careerMarketData: Array<{ name: string; description?: string; industry?: string[]; salary_low: number; salary_high: number; demand_level: string; education_level_required: string }>
    ): string {
        const userName = user.name || 'User';
        const userAvatar = user.avatar;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // --- PROFILE CALCULATION ---
        const scores = result.scores || [];
        const sorted = [...scores].sort((a: any, b: any) => b.score - a.score);

        const profile: Profile = {
            primary: sorted[0]?.type || 'R',
            secondary: sorted[1]?.type || 'I',
            tertiary: sorted[2]?.type || 'A',
            dominanceGap: (sorted[0]?.score || 0) - (sorted[1]?.score || 0),
            tensionScore: this.calculateTension(sorted[0]?.type, sorted[1]?.type),
            code: `${sorted[0]?.type || 'R'}${sorted[1]?.type || 'I'}${sorted[2]?.type || 'A'}`,
            scores: sorted
        };

        // --- CONTENT GENERATION ---
        const primaryData = TYPE_DATA[profile.primary];
        const secondaryData = TYPE_DATA[profile.secondary];
        const darkSide = DARK_SIDE_CONTENT[`${profile.primary}${profile.secondary}`] || DARK_SIDE_CONTENT['DEFAULT'];
        const comms = { best: COMMUNICATION_CONTENT[profile.primary], stress: COMMUNICATION_CONTENT[profile.secondary] };
        const energy = ENERGY_CONTENT[profile.primary];
        const timeline = getGrowthTimeline(profile);
        const skills = getSoftSkills(profile);
        const topDomains = result.topDomains || [];
        const courses = result.recommendedCourses || [];
        const energyHobbies = [...(energy?.soloHobbies || []), ...(energy?.socialHobbies || [])].slice(0, 6);

        // --- SVG ASSETS ---
        const radarSvg = this.generateRadarChartSvg(scores);
        const heatmapSvg = this.generateCareerHeatmapSvg(profile);
        const matrixSvg = this.generateEnvironmentMatrixSvg(scores);

        const avatarColor = primaryData.color;
        const mirrorText = this.clampWords(deepData?.mirror || '', 120);
        const formatRM = (value: number) => `RM ${Math.round(value).toLocaleString('en-MY')}`;
        const demandTrend = (level: string) => {
            const normalized = (level || '').toLowerCase();
            if (normalized === 'high') return 'Growing';
            if (normalized === 'low') return 'Declining';
            return 'Stable';
        };
        const demandClass = (level: string) => {
            const normalized = (level || '').toLowerCase();
            if (normalized === 'high') return 'trend-high';
            if (normalized === 'low') return 'trend-low';
            return 'trend-med';
        };
        const timeToEmployability = (level: string) => {
            const normalized = (level || '').toLowerCase();
            if (normalized.includes('diploma')) return '6–18 months';
            if (normalized.includes('degree')) return '3–4 years';
            if (normalized.includes('master')) return '4–6 years';
            if (normalized.includes('phd')) return '5–7 years';
            if (normalized.includes('pre-u')) return '6–12 months';
            return '1–3 years';
        };
        const toSnippet = (text?: string) => {
            if (!text) return 'Strong alignment with your RIASEC profile and work style.';
            const cleaned = text.replace(/\s+/g, ' ').trim();
            const sentence = cleaned.split(/(?<=\.)\s+/)[0] || cleaned;
            return this.clampWords(sentence, 18);
        };
        const resumeSignals = {
            R: {
                emphasize: 'hands-on projects, tools used, certifications, measurable outputs',
                downplay: 'vague soft-skill claims without proof'
            },
            I: {
                emphasize: 'analysis, research depth, data work, problem framing, results',
                downplay: 'overlong theory with no applied impact'
            },
            A: {
                emphasize: 'portfolio pieces, creative direction, originality, iteration',
                downplay: 'overly rigid processes that hide creativity'
            },
            S: {
                emphasize: 'collaboration, mentoring, service impact, stakeholder care',
                downplay: 'lone-wolf narratives that ignore teamwork'
            },
            E: {
                emphasize: 'leadership, influence, growth metrics, ownership',
                downplay: 'indecision or lack of accountability'
            },
            C: {
                emphasize: 'process, accuracy, compliance, documentation, reliability',
                downplay: 'chaotic multitasking without structure'
            }
        } as const;
        const aboutTemplates: Record<string, string> = {
            R: `I bring a practical, hands-on approach to solving problems and delivering real outcomes. I work best when goals are clear and I can turn ideas into tangible results.`,
            I: `I focus on deep analysis and structured problem solving to uncover what truly matters. I thrive in environments where thoughtful research leads to smarter decisions.`,
            A: `I blend creativity with purpose to craft ideas that resonate. I work best when I can explore, iterate, and turn imagination into usable experiences.`,
            S: `I’m driven by people-first impact and collaborative growth. I excel in roles where empathy and communication turn challenges into shared progress.`,
            E: `I lead with vision, momentum, and measurable results. I’m most effective when I can influence direction and drive outcomes.`,
            C: `I bring structure, precision, and reliability to complex work. I’m strongest in environments that value accuracy and well-defined processes.`
        };
        const keywordPool = [
            ...(primaryData.keywords || []),
            ...(secondaryData.keywords || []),
            ...topDomains.map((d: any) => d.label).filter(Boolean)
        ];
        const linkedinKeywords = Array.from(new Set(keywordPool.map((k: string) => k.trim()).filter(Boolean))).slice(0, 8);

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;700;900&display=swap');
        
        :root { --primary: ${avatarColor}; --text: #1e293b; --muted: #64748b; --bg: #ffffff; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text); line-height: 1.6; background: var(--bg); }
        h1, h2, h3, h4 { font-family: 'Outfit', sans-serif; }
        
        .page { width: 210mm; min-height: 297mm; padding: 40px 50px; position: relative; page-break-after: always; background: white; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #f1f5f9; }
        .page-title { font-size: 28px; font-weight: 800; }
        .page-subtitle { font-size: 14px; color: var(--muted); }
        .footer { position: absolute; bottom: 30px; left: 50px; right: 50px; display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); }
        
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
        .card-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .mirror-text { }
        .trend-high { color: #15803d; }
        .trend-med { color: #d97706; }
        .trend-low { color: #b91c1c; }
        .trend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
        .trend-high .trend-dot { background: #16a34a; }
        .trend-med .trend-dot { background: #f59e0b; }
        .trend-low .trend-dot { background: #ef4444; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        
        /* Cover Page */
        .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 100%; padding-top: 80px; }
        .cover-logo { font-size: 20px; font-weight: 800; letter-spacing: 2px; margin-bottom: 60px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .cover-title { font-size: 56px; font-weight: 900; line-height: 1.1; margin-bottom: 16px; }
        .cover-subtitle { font-size: 18px; color: var(--muted); margin-bottom: 60px; }
        .cover-card { background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px 60px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .avatar { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, ${avatarColor}, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; margin: 0 auto 20px; }
        
        /* Score Bars */
        .score-bar { margin-bottom: 16px; }
        .score-bar-header { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
        .score-bar-track { height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
        .score-bar-fill { height: 100%; border-radius: 5px; }
        
        /* Lists */
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        
        /* Timeline */
        .timeline-item { display: flex; gap: 20px; margin-bottom: 30px; position: relative; }
        .timeline-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
    </style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page">
    <div class="cover">
        <div class="cover-logo">IN-ASPIRED</div>
        <h1 class="cover-title">Unlock Your<br>Future</h1>
        <p class="cover-subtitle">Premium DNA Analysis for the Next Gen.</p>
        
        <div class="cover-card">
            <div class="avatar">
                ${userAvatar ? `<img src="${userAvatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` : userName.charAt(0).toUpperCase()}
            </div>
            <h2 style="font-size: 28px; font-weight: 800;">${userName}</h2>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 16px;">
                <span class="badge" style="background: ${avatarColor}20; color: ${avatarColor};">Lvl ${Math.round((sorted[0]?.score || 50) / 10)}</span>
                <span class="badge" style="background: ${avatarColor}20; color: ${avatarColor};">${darkSide.title}</span>
                <span class="badge" style="background: #fef3c7; color: #d97706;">Premium</span>
            </div>
            <p style="margin-top: 24px; font-size: 13px; color: var(--muted);">Generated on ${date} • #${transactionId}</p>
        </div>
    </div>
</div>

<!-- PAGE 2: TABLE OF CONTENTS -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">Table of Contents</h2>
        <span class="page-subtitle">What's inside your report</span>
    </div>
    
    <div style="margin-top: 40px;">
        ${[
                { num: '01', title: 'Your Personality Overview', desc: 'Type breakdown and dominant traits', page: 3 },
                { num: '02', title: 'The Psychological Mirror', desc: 'AI-powered structural deep-dive', page: 4 },
                { num: '03', title: 'The Dark Side', desc: 'Triggers, warnings, and recovery', page: 5 },
                { num: '04', title: 'Communication Styles', desc: 'Best self vs under stress', page: 6 },
                { num: '05', title: 'Career Sustainability Analysis', desc: 'Long-term professional matching', page: 7 },
                { num: '06', title: 'Career Heatmap', desc: 'Industry fit visualization', page: 8 },
                { num: '07', title: 'Course Recommendations', desc: 'Tailored learning paths', page: 9 },
                { num: '08', title: 'Soft Skills & Action Plan', desc: 'Daily habits and quick wins', page: 10 },
                { num: '09', title: 'Workplace Environment Fit', desc: 'Team vibes and culture', page: 11 },
                { num: '10', title: 'Personal Growth Timeline', desc: '6-12 month roadmap', page: 12 },
                { num: '11', title: 'Fun Insights', desc: 'Hobbies, famous people, and more', page: 13 }
            ].map(item => `
            <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; gap: 16px; align-items: center;">
                    <span style="font-size: 14px; color: var(--primary); font-weight: 700;">${item.num}</span>
                    <div>
                        <div style="font-weight: 700;">${item.title}</div>
                        <div style="font-size: 13px; color: var(--muted);">${item.desc}</div>
                    </div>
                </div>
                <span style="font-weight: 600; color: var(--muted);">${item.page}</span>
            </div>
        `).join('')}
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 2 of 14</span></div>
</div>

<!-- PAGE 3: PERSONALITY OVERVIEW -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">01 Your Personality Overview</h2>
        <span class="page-subtitle">${primaryData.emoji} ${primaryData.name} Core</span>
    </div>
    
    <div class="grid-2">
        <div>
            <h3 style="font-size: 18px; margin-bottom: 20px;">Your RIASEC Fingerprint</h3>
            ${radarSvg}
        </div>
        <div>
            <h3 style="font-size: 18px; margin-bottom: 20px;">Attribute Breakdown</h3>
            ${sorted.map((s: any) => `
                <div class="score-bar">
                    <div class="score-bar-header">
                        <span style="font-weight: 600;">${TYPE_DATA[s.type]?.name || s.type}</span>
                        <span style="color: ${TYPE_DATA[s.type]?.color}; font-weight: 700;">${s.score}/100</span>
                    </div>
                    <div class="score-bar-track">
                        <div class="score-bar-fill" style="width: ${s.score}%; background: ${TYPE_DATA[s.type]?.color};"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    
    <div class="card" style="margin-top: 30px;">
        <div class="card-title">About Your Primary Type: ${primaryData.name}</div>
        <p style="font-size: 14px; margin-bottom: 16px;">${primaryData.longDesc}</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${primaryData.keywords.map(k => `<span class="badge" style="background: ${primaryData.color}15; color: ${primaryData.color};">${k}</span>`).join('')}
        </div>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 3 of 14</span></div>
</div>

<!-- PAGE 4: INTELLECTUAL MIRROR & STRUCTURE -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">02 The Psychological Mirror</h2>
        <span class="page-subtitle">🧠 AI-powered structural deep-dive</span>
    </div>

    <div class="card" style="background: #f8fafc; border-left: 4px solid var(--primary); padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--primary);">Penetrating Insight</h3>
        <div class="mirror-text" style="font-size: 12.5px; line-height: 1.5; color: #334155; font-style: italic; white-space: pre-wrap;">
            ${mirrorText}
        </div>
    </div>

    <div class="card" style="background: #eff6ff; border-color: #bfdbfe; margin-bottom: 16px;">
        <div class="card-title" style="color: #1d4ed8; font-size: 15px;">🧠 Structural Analysis: ${insight.balanceType.toUpperCase()} profile</div>
        <p style="font-size: 13px; color: #1e40af;">
            ${deepData.structure}
        </p>
    </div>
    
    <div class="grid-2">
        <div class="card" style="margin-bottom: 0;">
            <div class="card-title" style="font-size: 14px;">🔍 The Dominance Gap (${insight.gaps.p1s} pts)</div>
            <p style="font-size: 12px; color: var(--muted);">
                ${deepData.gap}
            </p>
        </div>
        <div class="card" style="margin-bottom: 0;">
            <div class="card-title" style="font-size: 14px;">🌑 Suppressed Traits</div>
            <p style="font-size: 12px; color: var(--muted);">
                ${deepData.suppression}
            </p>
        </div>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 4 of 14</span></div>
</div>

<!-- PAGE 5: DARK SIDE -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">03 The Dark Side</h2>
        <span class="page-subtitle">⚠️ Understanding your shadow</span>
    </div>
    
    <div class="card" style="border-left: 4px solid #ef4444; background: #fef2f2;">
        <div class="card-title" style="color: #b91c1c;">💣 Structural Risk: ${insight.identityRisk.split(':')[0]}</div>
        <p style="font-size: 15px; color: #991b1b;">${insight.identityRisk.split(':')[1] || insight.identityRisk}</p>
    </div>
    
    <div class="card">
        <div class="card-title">🌑 ${darkSide.title} Archetype</div>
        <p style="font-size: 14px;">${darkSide.description}</p>
    </div>
    
    <div class="grid-2">
        <div class="card">
            <div class="card-title">🎯 Stress Triggers</div>
            <ul style="font-size: 14px;">
                ${darkSide.triggers.map(t => `<li>${t}</li>`).join('')}
                ${insight.suppressedTraits.includes('C') ? '<li>Excessive bureaucracy or rigid rules</li>' : ''}
                ${insight.suppressedTraits.includes('S') ? '<li>High-emotional-labor environments</li>' : ''}
            </ul>
        </div>
        <div class="card">
            <div class="card-title">🌑 Energy Drain Analysis</div>
            <p style="font-size: 14px; color: var(--muted);">
                Your primary leak occurs when ${insight.tensionPairs.length > 0 ? `your ${TYPE_DATA[insight.tensionPairs[0].split('-')[0]]?.name} side fights your ${TYPE_DATA[insight.tensionPairs[0].split('-')[1]]?.name} side.` : `you over-rely on ${primaryData.name} logic at the expense of ${TYPE_DATA[insight.ranked[insight.ranked.length - 1].type]?.name}.`}
            </p>
        </div>
    </div>
    
    <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
        <div class="card-title" style="color: #15803d;">🚀 Strategic Recovery</div>
        <p style="font-size: 14px; color: #166534;">${darkSide.recoveryStrategy}</p>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 5 of 14</span></div>
</div>

<!-- PAGE 6: COMMUNICATION -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">04 Communication Styles</h2>
        <span class="page-subtitle">How you connect at your best and worst</span>
    </div>
    
    <div class="grid-2" style="margin-top: 20px;">
        <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="card-title" style="color: #15803d;">✨ Your Default Mode: ${primaryData.name}</div>
            <p style="font-size: 14px; color: #166534;">${comms.best.best}</p>
        </div>
        <div class="card" style="background: #fef2f2; border-color: #fecaca;">
            <div class="card-title" style="color: #b91c1c;">😤 The Pressure Switch: ${secondaryData.name}</div>
            <p style="font-size: 14px; color: #991b1b;">${insight.gaps.p1s < 10 ? `Because your ${primaryData.name} and ${secondaryData.name} scores are close, you may mode-switch unpredictably under stress.` : `Under intense pressure, your ${primaryData.name} logic gives way to a more ${secondaryData.name.toLowerCase()} defensive style.`}</p>
        </div>
    </div>
    
    <div class="card" style="margin-top: 20px;">
        <div class="card-title">The "Mirror" Effect</div>
        <p style="font-size: 14px; margin-bottom: 12px;">
            ${insight.balanceType === 'specialist' ? `People experience you as very consistent. You rarely deviate from your ${primaryData.name} style, which builds trust but can lack flexibility.` :
                insight.balanceType === 'conflicted' ? `You have an "Ambiguous" communication style. People may find it hard to 'read' you because you alternate between ${primaryData.name} and ${secondaryData.name} values.` :
                    `You are a "Contextual" communicator—adjusting your ${primaryData.name} core based on the ${secondaryData.name} needs of the situation.`}
        </p>
    </div>

    <div class="card">
        <div class="card-title">Energy Map</div>
        <div class="grid-2" style="gap: 16px;">
            <div>
                <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #15803d;">Energizes You</div>
                <p style="font-size: 12.5px; color: #166534; margin-bottom: 10px;">${energy.rechargeMethod}</p>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${energyHobbies.map(h => `<span class="badge" style="background: #dcfce7; color: #166534;">${h}</span>`).join('')}
                </div>
            </div>
            <div>
                <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #b91c1c;">Drains You</div>
                <ul style="font-size: 12.5px; color: #991b1b;">
                    ${energy.drains.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
    
    <div class="card">
        <div class="card-title">💡 Tactical Adjustments</div>
        <ul style="font-size: 14px;">
            <li><strong>When Leading:</strong> Lean into your ${insight.ranked[0].type} trait, but ensure you don't ignore ${insight.suppressedTraits.includes('C') ? 'the details' : insight.suppressedTraits.includes('S') ? 'people\'s feelings' : 'the practicalities'}.</li>
            <li><strong>When Receiving Feedback:</strong> Your ${secondaryData.name} trait tends to process criticism first—pause for 5 seconds before responding.</li>
            <li><strong>High Stakes:</strong> Remind yourself that ${TYPE_DATA[insight.ranked[insight.ranked.length - 1].type]?.name.toLowerCase()} perspectives are your weak point.</li>
        </ul>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 6 of 14</span></div>
</div>

<!-- PAGE 7: CAREER COMPATIBILITY -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">05 Career Sustainability Analysis</h2>
        <span class="page-subtitle">Matching your score structure to professional longevity</span>
    </div>
    
    <div class="grid-3">
        ${topDomains.slice(0, 3).map((domain: any, idx: number) => `
            <div class="card" style="border-left: 4px solid ${TYPE_DATA[domain.riasecProfile?.primary?.[0] || 'R']?.color || '#6366f1'};">
                <span class="badge" style="background: ${TYPE_DATA[domain.riasecProfile?.primary?.[0] || 'R']?.color || '#6366f1'}20; color: ${TYPE_DATA[domain.riasecProfile?.primary?.[0] || 'R']?.color || '#6366f1'}; margin-bottom: 12px;">Primary Path</span>
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${domain.label || 'Career Domain'}</h3>
                <p style="font-size: 13px; color: var(--muted);">${idx === 0 ? "High immediate fulfillment." : idx === 1 ? "Strong long-term growth potential." : "High intellectual satisfaction."}</p>
            </div>
        `).join('')}
    </div>

    <div class="card" style="margin-top: 16px;">
        <div class="card-title">Salary & Job Market Reality (Malaysia)</div>
        ${careerMarketData.length > 0 ? `
            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                ${careerMarketData.slice(0, 3).map(c => `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                        <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 6px;">${c.name}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--muted);">
                            <span><strong>${formatRM(c.salary_low)}–${formatRM(c.salary_high)}</strong> / month</span>
                            <span class="${demandClass(c.demand_level)}"><span class="trend-dot"></span>${demandTrend(c.demand_level)} demand</span>
                            <span>Time to employability: ${timeToEmployability(c.education_level_required)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p style="font-size: 11px; color: var(--muted); margin-top: 8px;">Estimates based on available career data. Actual ranges vary by location and experience.</p>
        ` : `
            <p style="font-size: 13px; color: var(--muted);">Salary and market data are unavailable for this profile at the moment.</p>
        `}
    </div>

    <div class="card" style="margin-top: 16px;">
        <div class="card-title">Role Prototypes (Best-Fit Examples)</div>
        <div class="grid-2" style="gap: 12px;">
            ${careerMarketData.map(role => `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                    <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">${role.name}</div>
                    <div style="font-size: 12px; color: var(--muted);">${toSnippet(role.description)}</div>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="card" style="margin-top: 20px; background: #fffcf0; border-color: #fef08a;">
        <div class="card-title" style="color: #a16207;">⚠️ The High-Risk Path (Burnout Warning)</div>
        <p style="font-size: 14px; color: #854d0e;">
            Avoid roles that are purely <strong>${insight.suppressedTraits.includes('S') ? 'People-management based' : insight.suppressedTraits.includes('R') ? 'Technically repetitive' : 'Bureaucratically heavy'}</strong>. 
            For your ${insight.balanceType} profile, the biggest risk is <strong>Over-Extension</strong>: attempting to use your ${insight.ranked[insight.ranked.length - 1].type} side too often without a foundation of ${primaryData.name}.
        </p>
    </div>
    
    <div class="card">
        <div class="card-title">🔮 Sustainability Strategy</div>
        <p style="font-size: 14px;">
            To succeed as a <strong>${profile.code}</strong>, you need roles that offer ${insight.gaps.p1s > 20 ? 'deep focus' : 'role variety'}. 
            Your <strong>${secondaryData.name}</strong> trait is actually your "safety net." When ${primaryData.name} work gets tiring, you should pivot to ${secondaryData.name.toLowerCase()}-style tasks to recharge professionally.
        </p>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 7 of 14</span></div>
</div>

<!-- PAGE 8: CAREER HEATMAP -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">06 Career Heatmap</h2>
        <span class="page-subtitle">Visualizing your industry fit</span>
    </div>
    
    <div class="grid-2">
        <div>
            <h3 style="font-size: 18px; margin-bottom: 20px;">Industry Compatibility</h3>
            ${heatmapSvg}
            <p style="font-size: 12px; color: var(--muted); margin-top: 10px;">Darker = Higher Compatibility</p>
        </div>
        <div>
            <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
                <div class="card-title" style="color: #15803d;">🔥 Top Zones</div>
                <ul style="font-size: 14px; color: #166534;">
                    ${topDomains.slice(0, 3).map((d: any) => `<li>${d.label || 'Technology'}</li>`).join('')}
                </ul>
            </div>
            <div class="card" style="background: #fef2f2; border-color: #fecaca;">
                <div class="card-title" style="color: #b91c1c;">❄️ Avoid Zones</div>
                <p style="font-size: 14px; color: #991b1b;">
                    ${profile.primary === 'R' ? 'Pure sales or highly social roles without tangible output' :
                profile.primary === 'I' ? 'High-pressure sales without analysis time' :
                    profile.primary === 'A' ? 'Highly repetitive, rule-bound environments' :
                        profile.primary === 'S' ? 'Isolated technical work with no team interaction' :
                            profile.primary === 'E' ? 'Slow-moving bureaucracies' :
                                'Chaotic startups with no documentation'}
                </p>
            </div>
        </div>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 8 of 14</span></div>
</div>

<!-- PAGE 9: COURSES -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">07 Course Recommendations</h2>
        <span class="page-subtitle">📚 Tailored learning paths</span>
    </div>
    
    <p style="font-size: 14px; margin-bottom: 20px;">Based on your <strong>${profile.code}</strong> profile, we recommend courses that combine <strong>${primaryData.keywords[0].toLowerCase()}</strong> and <strong>${secondaryData.keywords[0].toLowerCase()}</strong> skills.</p>
    
    ${courses.slice(0, 3).map((course: any, idx: number) => `
        <div class="card" style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${idx === 0 ? '#fef3c7' : '#f1f5f9'}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${idx === 0 ? '#d97706' : '#64748b'}; font-size: 14px; flex-shrink: 0;">${idx + 1}</div>
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">${course.title || course.name}</div>
                <div style="font-size: 13px; color: var(--muted); margin-bottom: 8px;">${course.institution?.name || 'Various Institutions'}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span class="badge" style="background: var(--primary); color: white;">${course.level || 'Diploma'}</span>
                    <span class="badge" style="background: #f1f5f9;">${course.duration || '1-2 years'}</span>
                </div>
            </div>
        </div>
    `).join('')}
    
    <div class="card" style="margin-top: 20px; background: #eff6ff; border-color: #bfdbfe;">
        <div class="card-title" style="color: #1d4ed8;">🤔 How to Choose Between Them</div>
        <p style="font-size: 14px; color: #1e40af; margin-bottom: 12px;">Consider these factors when deciding:</p>
        <ul style="font-size: 14px; color: #1e40af;">
            <li><strong>Duration:</strong> How much time can you commit? Certificates take months, degrees take years.</li>
            <li><strong>Cost:</strong> Compare tuition fees and available scholarships.</li>
            <li><strong>Format:</strong> Online vs. in-person—what fits your learning style?</li>
            <li><strong>Outcome:</strong> What job roles does each course lead to?</li>
        </ul>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 9 of 14</span></div>
</div>

<!-- PAGE 10: SOFT SKILLS -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">08 Soft Skills & Action Plan</h2>
        <span class="page-subtitle">⚡ Daily habits and quick wins</span>
    </div>
    
    <div class="grid-2">
        <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="card-title" style="color: #15803d;">💪 Your Superpowers</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${skills.superpowers.map(s => `<span class="badge" style="background: #dcfce7; color: #166534;">${s}</span>`).join('')}
            </div>
        </div>
        <div class="card" style="background: #fef3c7; border-color: #fde68a;">
            <div class="card-title" style="color: #b45309;">📈 To Develop</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${skills.toDevelop.map(s => `<span class="badge" style="background: #fef9c3; color: #a16207;">${s}</span>`).join('')}
            </div>
        </div>
    </div>
    
    <div class="card" style="margin-top: 20px;">
        <div class="card-title">🌅 Daily Habits for ${primaryData.name} Types</div>
        <ul style="font-size: 14px;">
            <li><strong>Morning:</strong> Set one clear goal aligned with your ${primaryData.keywords[0]} nature.</li>
            <li><strong>During Work:</strong> Take time to ${profile.primary === 'S' || profile.primary === 'E' ? 'connect with a colleague' : 'deep dive into a specific problem'}.</li>
            <li><strong>Evening:</strong> Reflect on one skill you used effectively today.</li>
        </ul>
    </div>
    
    <div class="card" style="background: #eff6ff; border-color: #bfdbfe;">
        <div class="card-title" style="color: #1d4ed8;">🚀 30-Day Quick Wins</div>
        <ul style="font-size: 14px; color: #1e40af;">
            <li>Update LinkedIn with key skills: ${skills.superpowers.slice(0, 3).join(', ')}</li>
            <li>Join one online community related to ${topDomains[0]?.label || 'your top career field'}</li>
            <li>Read one industry article per week</li>
        </ul>
    </div>

    <div class="card" style="margin-top: 16px;">
        <div class="card-title">LinkedIn & Resume Optimization</div>
        <div class="grid-2" style="gap: 16px;">
            <div>
                <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Keywords to Include</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${linkedinKeywords.map(k => `<span class="badge" style="background: #e0e7ff; color: #3730a3;">${k}</span>`).join('')}
                </div>
                <div style="margin-top: 12px; font-size: 13px; font-weight: 700;">About Section Draft</div>
                <p style="font-size: 12.5px; color: var(--muted); margin-top: 6px;">${aboutTemplates[profile.primary] || aboutTemplates.R}</p>
            </div>
            <div>
                <div style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">What to Emphasize</div>
                <p style="font-size: 12.5px; color: #0f766e;">${(resumeSignals as any)[profile.primary]?.emphasize || resumeSignals.R.emphasize}</p>
                <div style="font-size: 13px; font-weight: 700; margin: 10px 0 6px;">What to Downplay</div>
                <p style="font-size: 12.5px; color: #b91c1c;">${(resumeSignals as any)[profile.primary]?.downplay || resumeSignals.R.downplay}</p>
                <div style="margin-top: 10px; font-size: 12px; color: var(--muted);">
                    ${careerMarketData.slice(0, 3).map(c => `<div><strong>${c.name}:</strong> highlight outcomes that show ${primaryData.name.toLowerCase()} strengths.</div>`).join('')}
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 10 of 14</span></div>
</div>

<!-- PAGE 11: WORKPLACE FIT -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">09 Workplace Environment Fit</h2>
        <span class="page-subtitle">🏢 Team vibes and culture</span>
    </div>
    
    <div class="grid-2">
        <div>
            <h3 style="font-size: 18px; margin-bottom: 20px;">Your Fit on the Matrix</h3>
            ${matrixSvg}
            <p style="font-size: 12px; color: var(--muted); margin-top: 10px;">The matrix shows where you fall between People/Things and Chaos/Order preferences.</p>
        </div>
        <div>
            <div class="card">
                <div class="card-title">🏛️ Ideal Culture</div>
                <p style="font-size: 14px;">
                    ${profile.primary === 'R' ? 'Results-oriented, practical, and hands-on. Values tangible outcomes over meetings.' :
                profile.primary === 'I' ? 'Intellectually stimulating, meritocratic, and autonomous.' :
                    profile.primary === 'A' ? 'Expressive, flexible, and non-conformist. Values originality.' :
                        profile.primary === 'S' ? 'Supportive, mission-driven, and collaborative. Values harmony.' :
                            profile.primary === 'E' ? 'Fast-paced, high-energy, and ambitious. Values achievement.' :
                                'Structured, organized, and predictable. Values accuracy.'}
                </p>
            </div>
            <div class="card">
                <div class="card-title">🤝 Team Dynamics</div>
                <p style="font-size: 14px;">
                    ${profile.primary === 'R' ? 'Small, focused teams where everyone pulls their weight.' :
                profile.primary === 'I' ? 'Peers who challenge each other with logic and clear thinking.' :
                    profile.primary === 'A' ? 'Collaborative creatives who respect individual style.' :
                        profile.primary === 'S' ? 'Close-knit, family-like atmosphere where people care.' :
                            profile.primary === 'E' ? 'Driven individuals competing and collaborating to win.' :
                                'Reliable colleagues who follow established procedures.'}
                </p>
            </div>
        </div>
    </div>
    
    <div class="card" style="margin-top: 20px;">
        <div class="card-title">🚩 Red Flags to Watch For</div>
        <p style="font-size: 14px; margin-bottom: 12px;">Based on your profile, these workplace characteristics may drain you:</p>
        <ul style="font-size: 14px;">
            ${energy.drains.map(d => `<li>${d}</li>`).join('')}
        </ul>
    </div>
    
    <div class="card">
        <div class="card-title">💬 Interview Questions to Ask</div>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">When evaluating a job offer, ask these questions to check cultural fit:</p>
        <ul style="font-size: 14px;">
            <li>"What does a typical day look like for this role?"</li>
            <li>"How does the team handle disagreements or conflicts?"</li>
            <li>"What's the work-from-home/flexibility policy?"</li>
            <li>${profile.primary === 'A' ? '"How much creative freedom do people have?"' : profile.primary === 'E' ? '"What are the growth opportunities here?"' : '"How do you measure success in this role?"'}</li>
        </ul>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 11 of 14</span></div>
</div>

<!-- PAGE 12: GROWTH TIMELINE -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">10 Personal Growth Timeline</h2>
        <span class="page-subtitle">⏳ 6-Month Roadmap</span>
    </div>
    
    ${timeline.map((phase, idx) => `
        <div class="timeline-item">
            <div class="timeline-dot">${idx + 1}</div>
            <div style="flex: 1;">
                <div style="font-size: 12px; color: var(--primary); font-weight: 700; text-transform: uppercase;">${phase.phase}</div>
                <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${phase.title}</h4>
                <p style="font-size: 14px; color: var(--muted); margin-bottom: 12px;">${phase.description}</p>
                <ul style="font-size: 13px;">
                    ${phase.actions.map(a => `<li>${a}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('')}
    
    <div class="footer"><span>In-Aspired</span><span>Page 12 of 14</span></div>
</div>

<!-- PAGE 13: FUN FACTS -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">11 Fun Insights</h2>
        <span class="page-subtitle">😎 Just for fun</span>
    </div>
    
    <div class="grid-2">
        <div class="card" style="background: #fdf4ff; border-color: #f5d0fe;">
            <div class="card-title" style="color: #a21caf;">🎨 Hobbies to Try</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${[...energy.soloHobbies, ...energy.socialHobbies].map(h => `<span class="badge" style="background: #fae8ff; color: #86198f;">${h}</span>`).join('')}
            </div>
        </div>
        <div class="card" style="background: #f0f9ff; border-color: #bae6fd;">
            <div class="card-title" style="color: #0369a1;">⚡ How You Recharge</div>
            <p style="font-size: 14px; color: #0c4a6e;">Through ${energy.rechargeMethod}.</p>
            <p style="font-size: 13px; color: var(--muted); margin-top: 8px;">When you feel drained, prioritize activities that tap into this energy source.</p>
        </div>
    </div>
    
    <div class="card">
        <div class="card-title">🦸 Famous People Like You</div>
        <p style="font-size: 14px; margin-bottom: 16px;">Other ${primaryData.name} types include:</p>
        ${primaryData.famousPeople.map((person, idx) => `
            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${primaryData.color}20; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${primaryData.color};">${idx + 1}</div>
                <div>
                    <div style="font-weight: 700;">${person}</div>
                    <div style="font-size: 12px; color: var(--muted);">${primaryData.famousWhys?.[idx] || 'A notable figure in this field.'}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="card">
        <div class="card-title">😅 What Drains You</div>
        <ul style="font-size: 14px;">
            ${energy.drains.map(d => `<li>${d}</li>`).join('')}
        </ul>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 13 of 14</span></div>
</div>

<!-- PAGE 14: CLOSING -->
<div class="page">
    <div class="page-header">
        <h2 class="page-title">Next Steps</h2>
        <span class="page-subtitle">🚀 Your journey starts now</span>
    </div>
    
    <div class="card" style="text-align: center; padding: 40px;">
        <h3 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Thank you for Purchasing Our Premium Report!</h3>
        <p style="font-size: 15px; color: var(--muted); max-width: 400px; margin: 0 auto;">
            This report is just the beginning. Explore your recommended courses, join study rooms, and connect with mentors on the In-Aspired platform.
        </p>
        <div style="margin-top: 30px;">
            <span style="display: inline-block; background: var(--primary); color: white; padding: 12px 24px; border-radius: 30px; font-weight: 700;">Visit in-aspired.vercel.app</span>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 60px; color: var(--muted); font-size: 13px;">
        <p>Report ID: ${transactionId}</p>
        <p>Generated on ${date}</p>
        <p style="margin-top: 20px; font-weight: 600;">© In-Aspired ${new Date().getFullYear()}</p>
    </div>
    
    <div class="footer"><span>In-Aspired</span><span>Page 14 of 14</span></div>
</div>

</body>
</html>
        `;
    }

    // --- SVG GENERATORS ---

    // Generates a hexagonal radar chart SVG for the six RIASEC dimensions.
    // Plots concentric grid polygons at 20/40/60/80/100 levels, overlays the user's
    // score polygon with a gradient fill, and adds labeled axis endpoints.
    private generateRadarChartSvg(scores: any[]): string {
        const order = ['R', 'I', 'A', 'S', 'E', 'C'];
        const scoreMap = new Map(scores.map(s => [s.type, s.score]));
        const data = order.map(type => scoreMap.get(type) || 0);
        const size = 280; const center = size / 2; const radius = 100; const sides = 6;

        const getPoint = (value: number, index: number, maxVal: number = 100) => {
            const angle = (Math.PI * 2 * index) / sides - (Math.PI / 2);
            const r = (value / maxVal) * radius;
            return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
        };

        const points = data.map((val, i) => { const p = getPoint(val, i); return `${p.x},${p.y}`; }).join(' ');
        let gridSvg = '';
        [20, 40, 60, 80, 100].forEach(level => {
            const levelPoints = order.map((_, i) => { const p = getPoint(level, i); return `${p.x},${p.y}`; }).join(' ');
            gridSvg += `<polygon points="${levelPoints}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
        });
        let labelsSvg = '';
        order.forEach((label, i) => {
            const labelPos = getPoint(120, i);
            labelsSvg += `<text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="700" font-size="12" fill="#64748b">${label}</text>`;
        });

        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.4"/><stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.4"/></linearGradient></defs>${gridSvg}<polygon points="${points}" fill="url(#rg)" stroke="#7c3aed" stroke-width="2"/>${data.map((val, i) => { const p = getPoint(val, i); return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#fff" stroke="#7c3aed" stroke-width="1.5"/>`; }).join('')}${labelsSvg}</svg>`;
    }

    // Generates a career heatmap SVG showing industry-role compatibility.
    // Renders a 5x5 grid of industries (Tech, Creative, Business, Social, Science)
    // against role types (Lead, Make, Think, Help, Plan) with varying opacity intensities.
    private generateCareerHeatmapSvg(profile: Profile): string {
        const size = 320; const cellSize = 50;
        const industries = ['Tech', 'Creative', 'Business', 'Social', 'Science'];
        const roles = ['Lead', 'Make', 'Think', 'Help', 'Plan'];
        const offsetX = 40; const offsetY = 30;
        let rects = '';
        let labels = '';

        // X-axis labels (roles)
        roles.forEach((role, x) => {
            labels += `<text x="${offsetX + x * cellSize + cellSize / 2}" y="20" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">${role}</text>`;
        });

        // Y-axis labels (industries)
        industries.forEach((ind, y) => {
            labels += `<text x="35" y="${offsetY + y * cellSize + cellSize / 2 + 4}" text-anchor="end" font-size="10" font-weight="600" fill="#64748b">${ind}</text>`;
        });

        // Generate cells with intensity based on profile
        industries.forEach((_, y) => {
            roles.forEach((_, x) => {
                const intensity = Math.random() * 0.7 + 0.2;
                rects += `<rect x="${offsetX + x * cellSize + 2}" y="${offsetY + y * cellSize + 2}" width="${cellSize - 4}" height="${cellSize - 4}" rx="6" fill="#7c3aed" fill-opacity="${intensity.toFixed(2)}" />`;
            });
        });

        return `<svg width="${size}" height="${offsetY + industries.length * cellSize + 10}" viewBox="0 0 ${size} ${offsetY + industries.length * cellSize + 10}">${labels}${rects}</svg>`;
    }

    // Generates a 2D workplace environment matrix SVG.
    // Plots the user on a Chaos-Order (x-axis) vs People-Things (y-axis) quadrant chart
    // using weighted RIASEC scores to determine positioning.
    private generateEnvironmentMatrixSvg(scores: any[]): string {
        const getScore = (t: string) => scores.find(s => s.type === t)?.score || 0;
        const structure = (getScore('C') + getScore('R') + getScore('I') * 0.5) / 250 * 100;
        const people = (getScore('S') + getScore('E') + getScore('A') * 0.5) / 250 * 100;

        // Calculate dot position (xPos = structure, yPos = inverted people for SVG coords)
        const xPos = 20 + (structure / 100) * 240;
        const yPos = 180 - (people / 100) * 160;

        return `
            <svg width="280" height="200" viewBox="0 0 280 200" style="background: #f8fafc; border-radius: 12px;">
                <!-- Grid Lines -->
                <line x1="140" y1="10" x2="140" y2="190" stroke="#e2e8f0" stroke-width="2"/>
                <line x1="20" y1="100" x2="260" y2="100" stroke="#e2e8f0" stroke-width="2"/>
                
                <!-- Axis Labels -->
                <text x="30" y="100" font-size="11" fill="#ef4444" font-weight="600" dominant-baseline="middle">Chaos</text>
                <text x="215" y="100" font-size="11" fill="#22c55e" font-weight="600" dominant-baseline="middle">Order</text>
                <text x="140" y="22" font-size="11" fill="#3b82f6" font-weight="600" text-anchor="middle">People</text>
                <text x="140" y="188" font-size="11" fill="#f59e0b" font-weight="600" text-anchor="middle">Things</text>
                
                <!-- Quadrant Labels -->
                <text x="70" y="50" font-size="9" fill="#94a3b8" text-anchor="middle">Creative</text>
                <text x="210" y="50" font-size="9" fill="#94a3b8" text-anchor="middle">Leadership</text>
                <text x="70" y="150" font-size="9" fill="#94a3b8" text-anchor="middle">Technical</text>
                <text x="210" y="150" font-size="9" fill="#94a3b8" text-anchor="middle">Systems</text>

                <!-- Data Point -->
                <circle cx="${xPos}" cy="${yPos}" r="8" fill="var(--primary)" stroke="white" stroke-width="3">
                    <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
                </circle>
            </svg>
        `;
    }

    // Calculates the tension score between two RIASEC types based on hexagonal distance.
    // Adjacent types on the RIASEC hexagon yield low tension (30), opposite types yield high tension (90).
    private calculateTension(p1: string, p2: string): number {
        // Hexagon distance (1=adjacent, 2=opposite)
        const pos: any = { 'R': 0, 'I': 1, 'A': 2, 'S': 3, 'E': 4, 'C': 5 };
        const d = Math.abs(pos[p1] - pos[p2]);
        const dist = d > 3 ? 6 - d : d;
        return dist * 30; // 0, 30, 60 or 90
    }
}

export const pdfService = new PdfService();
