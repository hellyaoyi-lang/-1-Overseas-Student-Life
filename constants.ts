
import { Difficulty, Country, GameStats, CharacterArchetype } from './types';

export const INITIAL_STATS: Record<Difficulty, GameStats> = {
  [Difficulty.HighSchool]: { intelligence: 30, stamina: 90, mood: 80, money: 60000, language: 20, social: 50 },
  [Difficulty.Undergraduate]: { intelligence: 50, stamina: 70, mood: 60, money: 40000, language: 40, social: 40 },
  [Difficulty.Masters]: { intelligence: 70, stamina: 50, mood: 40, money: 25000, language: 65, social: 25 },
  [Difficulty.PhD]: { intelligence: 90, stamina: 40, mood: 30, money: 12000, language: 85, social: 10 },
};

export const ARCHETYPE_MODS: Record<CharacterArchetype, Partial<GameStats> & { description: string; colors: string[] }> = {
  [CharacterArchetype.RichKid]: {
    money: 40000, social: 15, intelligence: -5,
    description: "家境优渥，无需为生计发愁，但需要平衡物质诱惑与学业追求。",
    colors: ['#f1c40f', '#f39c12'] 
  },
  [CharacterArchetype.Nerd]: {
    intelligence: 25, language: 15, social: -15, mood: -10,
    description: "天赋异禀的学术之星，沉浸在书本与实验中，是未来的科学巨匠。",
    colors: ['#2c3e50', '#34495e']
  },
  [CharacterArchetype.SocialButterfly]: {
    social: 35, language: 20, money: -8000, intelligence: -10,
    description: "社交达人，能迅速融入当地圈子，但要注意派对开销与精力分配。",
    colors: ['#e91e63', '#9c27b0']
  },
  [CharacterArchetype.HardWorker]: {
    stamina: 30, money: -5000, mood: 5, social: 10,
    description: "勤奋刻苦，生存能力极强，擅长从社会实践中积累经验与人脉。",
    colors: ['#795548', '#5d4037']
  }
};

export const COUNTRY_DATA: Record<Country, { label: string; flag: string; costMultiplier: number; stressModifier: number }> = {
  [Country.USA]: { label: '美国', flag: '🇺🇸', costMultiplier: 1.6, stressModifier: 4 },
  [Country.UK]: { label: '英国', flag: '🇬🇧', costMultiplier: 1.5, stressModifier: 4 },
  [Country.Canada]: { label: '加拿大', flag: '🇨🇦', costMultiplier: 1.3, stressModifier: 2 },
  [Country.Australia]: { label: '澳大利亚', flag: '🇦🇺', costMultiplier: 1.4, stressModifier: 3 },
  [Country.Japan]: { label: '日本', flag: '🇯🇵', costMultiplier: 1.2, stressModifier: 6 },
  [Country.Germany]: { label: '德国', flag: '🇩🇪', costMultiplier: 1.1, stressModifier: 5 },
  [Country.Singapore]: { label: '新加坡', flag: '🇸🇬', costMultiplier: 1.4, stressModifier: 5 },
};

export const ACTIONS = [
  { id: 'study', label: '沉浸学习', description: '智力++, 语言+, 心情--, 体力-', icon: 'BookOpen' },
  { id: 'work', label: '勤工俭学', description: '金钱++, 体力--, 心情-', icon: 'DollarSign' },
  { id: 'rest', label: '休息调整', description: '体力++, 心情+, 智力-', icon: 'Coffee' },
  { id: 'social', label: '社交聚会', description: '社交++, 语言+, 心情+, 金钱-', icon: 'Users' },
  { id: 'lang', label: '进阶语言', description: '语言++, 金钱-, 心情-', icon: 'MessageSquare' }
];
