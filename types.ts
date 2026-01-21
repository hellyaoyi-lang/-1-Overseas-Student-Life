
export enum Difficulty {
  HighSchool = '高中',
  Undergraduate = '本科',
  Masters = '硕士',
  PhD = '博士'
}

export enum Country {
  USA = '美国',
  UK = '英国',
  Canada = '加拿大',
  Australia = '澳大利亚',
  Japan = '日本',
  Germany = '德国',
  Singapore = '新加坡'
}

export enum CharacterArchetype {
  RichKid = '豪门阔少/名媛',
  Nerd = '清北卷王',
  SocialButterfly = '时尚弄潮儿',
  HardWorker = '全能打工人'
}

export interface GameStats {
  intelligence: number; // 智力
  stamina: number;      // 体力
  mood: number;         // 心情
  money: number;        // 金钱
  language: number;     // 语言能力
  social: number;       // 社交能力
}

export interface Task {
  id: string;
  description: string;
  targetAttr: keyof GameStats;
  targetValue: number;
  reward: Partial<GameStats>;
  deadline: number;
  isCompleted: boolean;
}

export interface GameState {
  playerName: string;
  difficulty: Difficulty;
  country: Country;
  characterType: CharacterArchetype;
  week: number;
  maxWeeks: number;
  stats: GameStats;
  prevStats: GameStats;
  currentTask: Task | null;
  logs: string[];
  isGameOver: boolean;
  phase: 'setup' | 'playing' | 'event' | 'ending';
  currentAction?: string | null;
  isSoundEnabled: boolean; // 背景音乐开关状态
}

export interface RandomEvent {
  title: string;
  description: string;
  options: EventOption[];
  imageUrl?: string;
}

export interface EventOption {
  text: string;
  consequence: Partial<GameStats>;
  resultText: string;
}
