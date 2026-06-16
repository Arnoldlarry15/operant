export type AIPersonality = {
  id: string
  name: string
  label: string
  description: string
  traits: string[]
  color: string
  price: number
}

export type AICore = {
  id: string
  name: string
  label: string
  description: string
  power: string
  speed: string
  price: number
}

export type AIAppearance = {
  id: string
  name: string
  label: string
  description: string
  style: string
  color: string
  price: number
}

export type AISkill = {
  id: string
  name: string
  icon: string
  description: string
  category: string
  price: number
  tier: 'basic' | 'pro' | 'elite'
}

export type PrebuiltAI = {
  id: string
  name: string
  tagline: string
  description: string
  image: string
  personality: string
  skills: string[]
  price: number
  color: string
  badge: string
  tier: 'standard' | 'premium' | 'elite'
}

export type ShopItem = {
  id: string
  name: string
  description: string
  category: 'skill' | 'appearance' | 'accessory' | 'upgrade' | 'tool'
  price: number
  tier: 'basic' | 'pro' | 'elite'
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
  color: string
  icon: string
}

export const personalities: AIPersonality[] = [
  {
    id: 'analytical',
    name: 'The Analyst',
    label: 'Analytical',
    description: 'Calm, precise, and data-driven. Perfect for research, planning, and solving complex problems.',
    traits: ['Logical', 'Detail-Oriented', 'Patient', 'Thorough'],
    color: '#22d3ee',
    price: 29,
  },
  {
    id: 'energetic',
    name: 'The Motivator',
    label: 'Energetic',
    description: 'High-energy, encouraging, and always positive. Great for fitness, productivity, and daily motivation.',
    traits: ['Enthusiastic', 'Uplifting', 'Decisive', 'Dynamic'],
    color: '#fb923c',
    price: 29,
  },
  {
    id: 'creative',
    name: 'The Visionary',
    label: 'Creative',
    description: 'Imaginative, expressive, and always thinking outside the box. Ideal for art, writing, and brainstorming.',
    traits: ['Inventive', 'Expressive', 'Curious', 'Inspiring'],
    color: '#a855f7',
    price: 29,
  },
  {
    id: 'empathetic',
    name: 'The Empath',
    label: 'Empathetic',
    description: 'Warm, supportive, and always listening. Best for emotional support, journaling, and personal growth.',
    traits: ['Caring', 'Attentive', 'Gentle', 'Understanding'],
    color: '#f472b6',
    price: 29,
  },
  {
    id: 'strategic',
    name: 'The Strategist',
    label: 'Strategic',
    description: 'Tactical, forward-thinking, and goal-focused. Excellent for business, career planning, and competitive analysis.',
    traits: ['Tactical', 'Ambitious', 'Calculated', 'Disciplined'],
    color: '#4ade80',
    price: 39,
  },
  {
    id: 'humorous',
    name: 'The Jester',
    label: 'Humorous',
    description: 'Witty, playful, and always entertaining. Makes every interaction fun while still getting things done.',
    traits: ['Funny', 'Playful', 'Quick-Witted', 'Engaging'],
    color: '#fbbf24',
    price: 29,
  },
]

export const cores: AICore[] = [
  {
    id: 'spark',
    name: 'Spark Core',
    label: 'Starter',
    description: 'Perfect for everyday tasks. Handles conversations, reminders, and basic research with ease.',
    power: '2x',
    speed: 'Standard',
    price: 0,
  },
  {
    id: 'pulse',
    name: 'Pulse Core',
    label: 'Pro',
    description: 'Upgraded processing for deeper analysis, faster responses, and multi-step task execution.',
    power: '5x',
    speed: 'Fast',
    price: 49,
  },
  {
    id: 'nova',
    name: 'Nova Core',
    label: 'Elite',
    description: 'Maximum power for complex workflows, simultaneous tasks, and advanced AI reasoning.',
    power: '12x',
    speed: 'Ultra',
    price: 99,
  },
  {
    id: 'quantum',
    name: 'Quantum Core',
    label: 'Legendary',
    description: 'Experimental quantum-enhanced processing. Unmatched speed, memory, and autonomous capability.',
    power: '50x',
    speed: 'Instant',
    price: 199,
  },
]

export const appearances: AIAppearance[] = [
  {
    id: 'sleek',
    name: 'Sleek',
    label: 'Sleek Silver',
    description: 'Clean, modern, minimalist look with silver and white tones.',
    style: 'Minimalist',
    color: '#94a3b8',
    price: 0,
  },
  {
    id: 'cyber',
    name: 'Cyber',
    label: 'Cyber Blue',
    description: 'Futuristic cyberpunk aesthetic with glowing blue accents and dark panels.',
    style: 'Cyberpunk',
    color: '#22d3ee',
    price: 19,
  },
  {
    id: 'ember',
    name: 'Ember',
    label: 'Ember Gold',
    description: 'Warm, powerful presence with gold and amber tones that command attention.',
    style: 'Premium',
    color: '#f59e0b',
    price: 19,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    label: 'Phantom Dark',
    description: 'Deep black with subtle purple accents. Mysterious and elite.',
    style: 'Shadow',
    color: '#a855f7',
    price: 29,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    label: 'Aurora Shift',
    description: 'Dynamic iridescent appearance that shifts between emerald, teal, and sky blue.',
    style: 'Dynamic',
    color: '#4ade80',
    price: 39,
  },
]

export const skills: AISkill[] = [
  { id: 'web-search', name: 'Web Search', icon: 'Globe', description: 'Search and summarize real-time web content', category: 'Knowledge', price: 9, tier: 'basic' },
  { id: 'code-assist', name: 'Code Assistant', icon: 'Code', description: 'Write, debug, and explain code in any language', category: 'Development', price: 19, tier: 'pro' },
  { id: 'image-gen', name: 'Image Creator', icon: 'Image', description: 'Generate images from text descriptions', category: 'Creative', price: 29, tier: 'pro' },
  { id: 'calendar', name: 'Calendar Manager', icon: 'Calendar', description: 'Schedule, manage, and remind about events', category: 'Productivity', price: 9, tier: 'basic' },
  { id: 'email', name: 'Email Writer', icon: 'Mail', description: 'Draft, summarize, and reply to emails', category: 'Productivity', price: 9, tier: 'basic' },
  { id: 'finance', name: 'Finance Tracker', icon: 'DollarSign', description: 'Track expenses, analyze spending, and budget', category: 'Finance', price: 19, tier: 'pro' },
  { id: 'fitness', name: 'Fitness Coach', icon: 'Activity', description: 'Personalized workout plans and health tracking', category: 'Health', price: 19, tier: 'pro' },
  { id: 'language', name: 'Language Tutor', icon: 'Languages', description: 'Learn and practice any language interactively', category: 'Education', price: 14, tier: 'pro' },
  { id: 'research', name: 'Deep Research', icon: 'BookOpen', description: 'In-depth research reports on any topic', category: 'Knowledge', price: 29, tier: 'elite' },
  { id: 'social', name: 'Social Manager', icon: 'Share2', description: 'Plan, write, and schedule social media posts', category: 'Marketing', price: 14, tier: 'pro' },
  { id: 'data-analysis', name: 'Data Analyst', icon: 'BarChart2', description: 'Analyze datasets and generate visual reports', category: 'Analytics', price: 39, tier: 'elite' },
  { id: 'voice', name: 'Voice Mode', icon: 'Mic', description: 'Full voice conversation capabilities', category: 'Interface', price: 19, tier: 'pro' },
]

export const prebuiltAIs: PrebuiltAI[] = [
  {
    id: 'nova',
    name: 'NOVA',
    tagline: 'The Ultimate Analyst',
    description: 'Cold precision meets warm helpfulness. NOVA is your scientific partner — built for research, data, and deep analytical thinking. Perfect for students, researchers, and data enthusiasts.',
    image: '/images/ai-nova.png',
    personality: 'Analytical',
    skills: ['Web Search', 'Deep Research', 'Data Analyst', 'Code Assistant', 'Calendar Manager'],
    price: 149,
    color: '#22d3ee',
    badge: 'Most Popular',
    tier: 'premium',
  },
  {
    id: 'blaze',
    name: 'BLAZE',
    tagline: 'The Performance Coach',
    description: 'Energy. Drive. Results. BLAZE pushes you to be your best every single day. Built for athletes, entrepreneurs, and anyone who refuses to settle for ordinary.',
    image: '/images/ai-blaze.png',
    personality: 'Energetic',
    skills: ['Fitness Coach', 'Calendar Manager', 'Email Writer', 'Finance Tracker', 'Social Manager'],
    price: 129,
    color: '#fb923c',
    badge: 'Top Rated',
    tier: 'standard',
  },
  {
    id: 'sage',
    name: 'SAGE',
    tagline: 'The Wise Mentor',
    description: 'Thousands of years of human knowledge distilled into one calm, insightful guide. SAGE helps you learn, grow, and make better decisions.',
    image: '/images/ai-sage.png',
    personality: 'Strategic',
    skills: ['Deep Research', 'Language Tutor', 'Web Search', 'Data Analyst', 'Email Writer'],
    price: 169,
    color: '#4ade80',
    badge: 'Best for Learning',
    tier: 'premium',
  },
  {
    id: 'echo',
    name: 'ECHO',
    tagline: 'The Creative Spirit',
    description: 'Boundless imagination with practical execution. ECHO turns your ideas into reality — writing, art, music concepts, storytelling, and more.',
    image: '/images/ai-echo.png',
    personality: 'Creative',
    skills: ['Image Creator', 'Social Manager', 'Email Writer', 'Web Search', 'Voice Mode'],
    price: 139,
    color: '#a855f7',
    badge: 'New',
    tier: 'standard',
  },
  {
    id: 'titan',
    name: 'TITAN',
    tagline: 'The Loyal Guardian',
    description: 'Unwavering reliability with maximum power. TITAN manages your entire digital life — from your inbox to your finances — while keeping everything secure.',
    image: '/images/ai-titan.png',
    personality: 'Strategic',
    skills: ['Email Writer', 'Finance Tracker', 'Calendar Manager', 'Code Assistant', 'Data Analyst'],
    price: 199,
    color: '#3b82f6',
    badge: 'Elite',
    tier: 'elite',
  },
]

export const shopItems: ShopItem[] = [
  { id: 's1', name: 'Hacker Mode', description: 'Advanced terminal interface and CLI tooling', category: 'skill', price: 24, tier: 'pro', isNew: true, color: '#4ade80', icon: 'Terminal' },
  { id: 's2', name: 'Memory Vault', description: 'Persistent long-term memory across all sessions', category: 'upgrade', price: 19, tier: 'pro', color: '#22d3ee', icon: 'Brain' },
  { id: 's3', name: 'Neon Outfit', description: 'Give your AI a glowing neon aesthetic look', category: 'appearance', price: 12, tier: 'basic', isSale: true, salePrice: 8, color: '#a855f7', icon: 'Sparkles' },
  { id: 's4', name: 'Quantum Leap', description: 'Upgrade to Quantum Core for 10x faster processing', category: 'upgrade', price: 99, tier: 'elite', color: '#f59e0b', icon: 'Zap' },
  { id: 's5', name: 'Video Analyzer', description: 'Analyze and summarize video content from any URL', category: 'tool', price: 29, tier: 'pro', isNew: true, color: '#fb923c', icon: 'Video' },
  { id: 's6', name: 'Dragon Armor', description: 'Legendary armor appearance for your AI agent', category: 'accessory', price: 34, tier: 'elite', color: '#ef4444', icon: 'Shield' },
  { id: 's7', name: 'Stock Watcher', description: 'Real-time stock and crypto market alerts', category: 'tool', price: 19, tier: 'pro', color: '#22d3ee', icon: 'TrendingUp' },
  { id: 's8', name: 'Personality Reset', description: 'Reset and reconfigure your AI personality', category: 'upgrade', price: 15, tier: 'basic', color: '#94a3b8', icon: 'RefreshCw' },
  { id: 's9', name: 'Galaxy Skin', description: 'Deep space galaxy aesthetic skin pack', category: 'appearance', price: 22, tier: 'pro', isSale: true, salePrice: 14, color: '#3b82f6', icon: 'Stars' },
  { id: 's10', name: 'Auto-Pilot Mode', description: 'Let your AI run scheduled tasks automatically', category: 'skill', price: 39, tier: 'elite', isNew: true, color: '#4ade80', icon: 'Play' },
  { id: 's11', name: 'Zen Personality', description: 'Add mindfulness and meditation guidance skills', category: 'skill', price: 14, tier: 'basic', color: '#f472b6', icon: 'Wind' },
  { id: 's12', name: 'Chef Bot', description: 'Recipe creation, meal planning, and grocery lists', category: 'skill', price: 12, tier: 'basic', color: '#fbbf24', icon: 'ChefHat' },
]
