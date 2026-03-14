// Chat Intent Types - Top-level categorization
export enum ChatIntent {
    DATA_RETRIEVAL = 'DATA_RETRIEVAL', // Database queries (Careers, Courses)
    SYSTEM_INFO = 'SYSTEM_INFO',       // Static info (Room guides, Help)
    GENERAL_CHAT = 'GENERAL_CHAT'      // Greetings, irrelevant stuff
}

// Data Intent Subtypes - Granular classification for discovery
export enum DataIntent {
    DOMAIN_EXPLORATION = 'DOMAIN_EXPLORATION',  // "I'm interested in art"
    COURSE_DISCOVERY = 'COURSE_DISCOVERY',      // "What courses can I take?"
    CAREER_DISCOVERY = 'CAREER_DISCOVERY',      // "What careers are there?"
    SPECIFIC_QUERY = 'SPECIFIC_QUERY'           // "Software engineering salary"
}

// Keywords for data retrieval
const DATA_KEYWORDS = [

    // English - Core terms
    'career', 'job', 'salary', 'work', 'profession', 'occupation', 'employment',
    'assistant', 'specialist', 'manager', 'executive', 'officer', 'consultant', 'analyst', 'architect',
    'course', 'degree', 'study', 'university', 'subject', 'learn', 'education', 'program', 'diploma', 'foundation',
    'skill', 'qualification', 'major', 'minor', 'field', 'industry', 'sector',
    // English - Domains
    'art', 'design', 'IT', 'tech', 'technology', 'law', 'legal', 'business', 'science', 'health', 'healthcare',
    'engineering', 'medicine', 'medical', 'finance', 'accounting', 'marketing', 'software', 'programming',
    'computing', 'hospitality', 'tourism', 'media', 'communication', 'psychology', 'nursing',
    // English - Question patterns
    'recommend', 'suggestion', 'option', 'available', 'offer', 'requirement', 'cost', 'fee', 'tuition',

    // Personality matching keywords 
    'suit', 'match', 'fit', 'personality', 'riasec', 'holland', 'best for me', 'right for me',
    'based on my', 'according to my', 'my results', 'my test', 'my type',

    // Career progression keywords 
    'path', 'progression', 'advance', 'promotion', 'future', 'prospect', 'outlook', 'growth',
    'become', 'pursue', 'roadmap', 'steps', 'journey',

    // Comparison keywords 
    'compare', 'versus', 'difference', 'better', 'which one', 'choose', 'pick',

    // Chinese (简体/繁體) - Core terms
    '课程', '課程', '大学', '大學', '职业', '職業', '工作', '薪水', '薪资', '薪資', '就业', '就業',
    '专业', '專業', '学习', '學習', '教育', '文凭', '文憑', '学位', '學位', '技能', '资格', '資格',
    // Chinese - Domains
    '工程', '设计', '設計', '商业', '商業', '医学', '醫學', '法律', '科技', '电脑', '電腦',
    '金融', '会计', '會計', '护理', '護理', '酒店', '旅游', '旅遊', '媒体', '媒體', '心理',
    // Chinese - Question patterns
    '推荐', '推薦', '建议', '建議', '选择', '選擇', '要求', '费用', '學費', '学费',
    // Chinese - Personality matching 
    '适合我', '適合我', '匹配', '性格', '个性', '個性', '我的结果', '我的結果',

    // Malay - Core terms
    'kursus', 'kerjaya', 'gaji', 'pekerjaan', 'universiti', 'belajar', 'jurusan', 'pendidikan',
    'diploma', 'ijazah', 'kemahiran', 'kelayakan', 'bidang', 'industri', 'kerja',
    // Malay - Domains
    'kejuruteraan', 'perubatan', 'perniagaan', 'undang-undang', 'teknologi', 'komputer',
    'perakaunan', 'pemasaran', 'kejururawatan', 'hospitaliti', 'pelancongan', 'media', 'psikologi',
    // Malay - Question patterns + Personality 
    'cadangan', 'pilihan', 'syarat', 'yuran', 'sesuai untuk saya', 'personaliti',

    // Tamil - Core terms
    'படிப்பு', 'பல்கலைக்கழகம்', 'தொழில்', 'வேலை', 'சம்பளம்', 'கல்வி', 'பட்டம்', 'திறன்',
    'தகுதி', 'துறை', 'தொழிற்சாலை', 'வேலைவாய்ப்பு', 'கற்றல்',
    // Tamil - Domains
    'பொறியியல்', 'மருத்துவம்', 'வணிகம்', 'கலை', 'அறிவியல்', 'தகவல்', 'சட்டம்',
    'கணக்கியல்', 'சந்தைப்படுத்தல்', 'செவிலியம்', 'உளவியல்', 'ஊடகம்'
];

// Keywords for system info
const SYSTEM_KEYWORDS = [
    // English - Core terms
    'room', 'virtual', 'create', 'join', 'host', 'study', 'pomodoro', 'timer', 'focus',
    'test', 'personality', 'riasec', 'score', 'result', 'quiz', 'assessment', 'holland',
    'website', 'app', 'in-aspired', 'platform', 'site', 'page', 'feature',
    // English - Help/Navigation
    'help', 'guide', 'navigate', 'how', 'what', 'where', 'use', 'work', 'start',
    // English - About/Creator
    'created', 'creator', 'developer', 'made', 'built', 'develop', 'who', 'team', 'founder',
    // English - Account
    'account', 'login', 'signup', 'register', 'password', 'email', 'profile', 'setting',
    // English - Cost/Access
    'free', 'cost', 'price', 'pay', 'subscription',

    // Chinese - Core terms
    '房间', '房間', '虚拟', '虛擬', '加入', '创建', '創建', '学习室', '學習室', '计时器', '計時器',
    '测试', '測試', '性格', '结果', '結果', '评估', '評估', '问卷', '問卷',
    '网站', '網站', '平台', '应用', '應用', '功能', '页面', '頁面',
    // Chinese - Help/Navigation
    '帮助', '幫助', '怎么', '怎麼', '如何', '什么', '什麼', '使用', '开始', '開始',
    // Chinese - About/Account
    '关于', '關於', '创始人', '創始人', '团队', '團隊', '账号', '賬號', '登录', '登錄', '注册', '註冊',

    // Malay - Core terms
    'bilik', 'maya', 'sertai', 'cipta', 'belajar', 'pemasa', 'fokus',
    'ujian', 'keputusan', 'penilaian', 'personaliti', 'keperibadian',
    'laman', 'web', 'aplikasi', 'ciri', 'halaman', 'fungsi', 'kegunaan',
    // Malay - Mixed English/Malay context
    'room', 'feature', 'virtual', 'study room', 'pomodoro', 'timer',
    // Malay - Help/Navigation
    'bantuan', 'panduan', 'bagaimana', 'apa', 'guna', 'mula',
    // Malay - About/Account
    'tentang', 'pengasas', 'pasukan', 'akaun', 'daftar', 'masuk', 'kata laluan',

    // Tamil - Core terms
    'அறை', 'மெய்நிகர்', 'சேர', 'உருவாக்கு', 'படிப்பறை', 'நேரமானி',
    'சோதனை', 'முடிவு', 'மதிப்பீடு', 'ஆளுமை', 'குணாதிசயம்',
    'இணையதளம்', 'செயலி', 'அம்சம்', 'பக்கம்',
    // Tamil - Help/Navigation
    'உதவி', 'வழிகாட்டி', 'எப்படி', 'என்ன', 'பயன்படுத்து', 'தொடங்கு',
    // Tamil - About/Account
    'பற்றி', 'நிறுவனர்', 'குழு', 'கணக்கு', 'பதிவு', 'உள்நுழை'
];

// Vague verbs that indicate ambiguous queries - expanded to catch more edge cases
const VAGUE_VERBS = [
    'learn', 'explore', 'know', 'stuff', 'thing', 'something', 'anything',
    'interested', 'curious', 'wondering', 'thinking', 'considering', 'looking',
    'options', 'opportunities', 'possibilities', 'ideas', 'paths'
];

// Analyze top-level intent
export const analyzeIntent = (message: string): ChatIntent => {
    const lowerMsg = message.toLowerCase();

    // Pattern-based detection for career queries (catches "what does a diplomat do")
    const careerPatterns = [
        /what does (?:a |an )?[\w\s]+ do/i,           // "what does a diplomat do"
        /what is (?:a |an )?[\w\s]+(?:'s)? role/i,   // "what is a diplomat's role"
        /how (?:to become|do i become) (?:a |an )?/i, // "how to become a diplomat"
        /tell me about (?:a |an )?[\w\s]+ career/i,   // "tell me about diplomat career"
        /[\w\s]+ salary/i,                            // "diplomat salary"
        /[\w\s]+ job/i,                               // "diplomat job"
        /career path/i,                               // "what's the career path for..."
        /education path/i,                            // "what's the education path for..."
        /progression/i,                               // "career progression"
        /advance(?:ment)?/i,                          // "how to advance in..."
        /(?:software|data|web|ai|machine learning)/i, // Common job keywords
    ];

    if (careerPatterns.some(pattern => pattern.test(lowerMsg))) {
        return ChatIntent.DATA_RETRIEVAL;
    }

    const dataScore = DATA_KEYWORDS.filter(k => lowerMsg.includes(k)).length;
    const systemScore = SYSTEM_KEYWORDS.filter(k => lowerMsg.includes(k)).length;

    if (dataScore > systemScore) return ChatIntent.DATA_RETRIEVAL;
    if (systemScore > dataScore) return ChatIntent.SYSTEM_INFO;
    if (dataScore > 0) return ChatIntent.DATA_RETRIEVAL;

    return ChatIntent.GENERAL_CHAT;
};

// Analyze data retrieval subtype (deterministic)
export const analyzeDataIntent = (message: string): DataIntent => {
    const lower = message.toLowerCase();

    if (/interested in|passion for|love|enjoy|into|like/.test(lower)) {
        return DataIntent.DOMAIN_EXPLORATION;
    }

    if (/what (courses?|degrees?|programs?|subjects?) (can|should|could|are|is)/i.test(lower)) {
        return DataIntent.COURSE_DISCOVERY;
    }

    if (/what (careers?|jobs?|professions?) (are|is|can|should) (there|under|in|i)/i.test(lower)) {
        return DataIntent.CAREER_DISCOVERY;
    }

    return DataIntent.SPECIFIC_QUERY;
};

// Explicit ambiguity detection to use LLM for edge cases
// Better to call Gemini for uncertain cases than give a bad deterministic response
export const isAmbiguousQuery = (
    message: string,
    extractedKeywords: string[],
    obviousIntent: ChatIntent
): boolean => {
    const lower = message.toLowerCase();
    const words = message.split(' ').filter(w => w.length > 0);

    // System info queries (never ambiguous, so skip LLM)
    const systemInfoIndicators = [
        'what is', 'who created', 'who made', 'who built', 'who develop',
        'how do i', 'can i', 'is this', 'is in-aspired',
        'contact', 'email', 'riasec', 'personality test',
        'virtual room', 'study room', 'pomodoro', 'free', 'cost'
    ];

    // Clear system query (use fast path)
    if (systemInfoIndicators.some(indicator => lower.includes(indicator))) {
        return false;
    }

    // Personality-based queries should use LLM for better reasoning
    const personalityPatterns = /suit(?:s|ed)?\s*(?:me|my)|match(?:es|ing)?\s*(?:my|me)|for me|best fit|right for|based on my|according to my/i;
    if (personalityPatterns.test(message)) {
        return true;
    }

    // Comparison queries need LLM reasoning
    const comparisonPatterns = /compare|versus|\bvs\b|difference|better|which\s*(?:one|is)|should\s*i\s*(?:choose|pick|go)/i;
    if (comparisonPatterns.test(message)) {
        return true;
    }

    // Career path / progression queries benefit from LLM
    const pathPatterns = /how\s*(?:to|do\s*i)\s*become|path\s*(?:to|for)|steps\s*to|roadmap|progression|what\s*(?:do\s*i|should\s*i)\s*study/i;
    if (pathPatterns.test(message)) {
        return true;
    }

    // Too short (< 4 words) but exclude clear domain keywords
    if (words.length < 4) {
        const clearDomainKeywords = ['engineering', 'business', 'computing', 'arts', 'media', 'nursing', 'law'];
        if (clearDomainKeywords.some(kw => lower.includes(kw))) {
            return false; // Clear domain query
        }
        return true;
    }

    // Contains vague verbs
    const hasVagueVerb = VAGUE_VERBS.some(v => lower.includes(v));
    if (hasVagueVerb) {
        return true; // Any vague verb now triggers LLM (previously required empty keywords)
    }

    // No domain match detected
    const hasDomainKeyword = DATA_KEYWORDS.some(k => lower.includes(k));
    if (!hasDomainKeyword && obviousIntent === ChatIntent.DATA_RETRIEVAL) {
        return true;
    }

    // Mixed/contradictory keywords
    const hasCourse = /course|degree|program|study/.test(lower);
    const hasCareer = /career|job|work|profession/.test(lower);
    if (hasCourse && hasCareer) {
        return true; // User wants both - let LLM clarify
    }

    // Catch edge cases, if query has question words but no clear domain, use LLM
    const hasQuestionWord = /^(what|which|how|where|who|can|should|would|could)/i.test(message.trim());
    if (hasQuestionWord && extractedKeywords.length === 0) {
        return true;
    }

    // Otherwise, it's clear enough
    return false;
};
