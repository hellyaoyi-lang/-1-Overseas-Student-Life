
import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, Country, CharacterArchetype, GameState, RandomEvent, EventOption, GameStats, Task } from './types';
import { INITIAL_STATS, COUNTRY_DATA, ACTIONS, ARCHETYPE_MODS } from './constants';
import { PixelCard } from './components/PixelCard';
import { CharacterView } from './components/CharacterView';
import { generateRandomEvent, generateGameEnding, generateEventImage } from './services/geminiService';
import { 
  Wallet, HeartPulse, Users, Smile, BookOpen, Coffee, DollarSign, MessageSquare, Brain, Target, Trophy, Save, Sparkles, Settings, X, Volume2, VolumeX, Plane, Map, UserCircle, Camera, Loader2 
} from 'lucide-react';

const SAVE_KEY = 'survival_challenge_autosave_v4';
const MAX_LOGS = 30;
const BGM_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_098d6006f8.mp3'; 

const GameLogo = () => (
  <div className="relative flex items-center justify-center transition-transform duration-300 hover:scale-110">
    <div className="w-14 h-14 bg-[#45aaf2] border-[3px] border-black rounded-full relative shadow-[3px_3px_0_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
      <div className="absolute top-2 left-2 w-5 h-4 bg-[#26de81] rounded-full opacity-60" />
      <div className="flex flex-col items-center gap-1 z-10">
        <div className="flex gap-2"><div className="w-1.5 h-1.5 bg-black rounded-full" /><div className="w-1.5 h-1.5 bg-black rounded-full" /></div>
        <div className="w-3 h-1.5 border-b-2 border-black rounded-full" />
      </div>
    </div>
  </div>
);

const StatFeedback: React.FC<{ current: number; prev: number }> = ({ current, prev }) => {
  const diff = current - prev;
  if (diff === 0) return null;
  return (
    <div className="absolute -top-12 right-0 pointer-events-none z-[110] animate-float flex items-center gap-1 font-bold whitespace-nowrap text-sm">
       {diff > 0 ? (
         <span className="text-green-500 bg-black/90 px-3 py-1.5 border-2 border-green-500 shadow-lg">+{diff.toFixed(0)} ✨</span>
       ) : (
         <span className="text-red-500 bg-black/90 px-3 py-1.5 border-2 border-red-500 shadow-lg">{diff.toFixed(0)} 💢</span>
       )}
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    playerName: '新同学',
    difficulty: Difficulty.Undergraduate,
    country: Country.USA,
    characterType: CharacterArchetype.HardWorker,
    week: 1,
    maxWeeks: 50,
    stats: INITIAL_STATS[Difficulty.Undergraduate],
    prevStats: INITIAL_STATS[Difficulty.Undergraduate],
    currentTask: null,
    logs: ['欢迎来到留学生存大挑战！'],
    isGameOver: false,
    phase: 'setup',
    currentAction: null,
    isSoundEnabled: true
  });

  const [currentEvent, setCurrentEvent] = useState<RandomEvent | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isEventLoading, setIsEventLoading] = useState(false);
  const [endingText, setEndingText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    if (localStorage.getItem(SAVE_KEY)) setHasSavedGame(true);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState.phase === 'playing' || gameState.phase === 'event') localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [gameState.logs]);

  const applyConsequence = (con: Partial<GameStats>, logMsg?: string) => {
    setGameState(prev => {
      const nextStats = { ...prev.stats };
      const nextLogs = logMsg ? [...prev.logs, logMsg] : [...prev.logs];
      Object.keys(con).forEach((key) => {
        const k = key as keyof GameStats;
        const val = con[k];
        if (typeof val === 'number') nextStats[k] = parseFloat((nextStats[k] + val).toFixed(1));
      });
      nextStats.stamina = Math.min(100, Math.max(0, nextStats.stamina));
      nextStats.mood = Math.min(100, Math.max(0, nextStats.mood));
      let newTask = prev.currentTask;
      if (newTask && !newTask.isCompleted && nextStats[newTask.targetAttr] >= newTask.targetValue) {
        newTask = { ...newTask, isCompleted: true };
        nextLogs.push(`🌟 达成目标：${newTask.description}！`);
        Object.keys(newTask.reward).forEach(k => {
          const key = k as keyof GameStats;
          nextStats[key] += (newTask!.reward[key] || 0);
        });
      }
      return { ...prev, prevStats: prev.stats, stats: nextStats, currentTask: newTask, logs: nextLogs.slice(-MAX_LOGS) };
    });
  };

  const generateTask = (difficulty: Difficulty, characterType: CharacterArchetype, week: number): Task | null => {
    // 身份政治：豪门阔少/名媛不需要生存指标，他们是来享受生活的
    if (characterType === CharacterArchetype.RichKid) return null;

    const goals: Record<CharacterArchetype, Array<{desc: string, attr: keyof GameStats, val: number}>> = {
      [CharacterArchetype.Nerd]: [
        { desc: "维持全A成绩单", attr: "intelligence", val: 120 },
        { desc: "学术论文发表", attr: "intelligence", val: 150 },
        { desc: "外语沟通无障碍", attr: "language", val: 90 }
      ],
      [CharacterArchetype.SocialButterfly]: [
        { desc: "成为校园社交明星", attr: "social", val: 100 },
        { desc: "在当地社区建立名望", attr: "social", val: 120 },
        { desc: "掌握流利社交用语", attr: "language", val: 75 }
      ],
      [CharacterArchetype.HardWorker]: [
        { desc: "攒够下月房租", attr: "money", val: 5000 },
        { desc: "应对繁重课业", attr: "intelligence", val: 70 },
        { desc: "保持体能充沛", attr: "stamina", val: 80 }
      ],
      [CharacterArchetype.RichKid]: [] 
    };
    
    const pool = goals[characterType] || goals[CharacterArchetype.HardWorker];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { id: Math.random().toString(36), description: pick.desc, targetAttr: pick.attr, targetValue: pick.val, reward: { mood: 20, money: 1200, intelligence: 15 }, deadline: week + 12, isCompleted: false };
  };

  const handleStartGame = () => {
    let stats = { ...INITIAL_STATS[gameState.difficulty] };
    const mods = ARCHETYPE_MODS[gameState.characterType];
    Object.keys(mods).forEach(k => {
      const key = k as keyof GameStats;
      if (typeof mods[key] === 'number') stats[key] = (stats[key] || 0) + (mods[key] as number);
    });
    const firstTask = generateTask(gameState.difficulty, gameState.characterType, 1);
    setGameState(prev => ({ ...prev, week: 1, stats, prevStats: stats, currentTask: firstTask, logs: [`${prev.playerName}，欢迎来到${prev.country}开启你的留学生活！`], phase: 'playing' }));
  };

  const getActionLabel = (actionId: string) => {
    const isRich = gameState.characterType === CharacterArchetype.RichKid;
    const isNerd = gameState.characterType === CharacterArchetype.Nerd;
    const isButterfly = gameState.characterType === CharacterArchetype.SocialButterfly;

    switch (actionId) {
      case 'study': return isNerd ? '科研攻关' : (isRich ? '私人私塾' : '沉浸学习');
      case 'work': return isRich ? '家族见习' : (isNerd ? '学术助教' : '勤工俭学');
      case 'rest': return isRich ? '顶级SPA' : '修身养性';
      case 'social': return isRich ? '名流舞会' : (isButterfly ? '网红聚餐' : '社交派对');
      default: return ACTIONS.find(a => a.id === actionId)?.label || actionId;
    }
  };

  const handleAction = async (actionId: string) => {
    if (loading || gameState.currentAction) return;
    setLoading(true);
    setGameState(prev => ({ ...prev, currentAction: actionId }));
    
    let con: Partial<GameStats> = {};
    let logMsg = "";
    const countryInfo = COUNTRY_DATA[gameState.country];
    const { characterType } = gameState;

    switch (actionId) {
      case 'study': 
        con = { intelligence: 7, language: 2, mood: -10, stamina: -15 }; 
        logMsg = characterType === CharacterArchetype.RichKid ? "在私人导师的指导下研读跨国财团的架构。" : "在图书馆的灯光下，你感到大脑在飞速运转。"; 
        break;
      case 'work': 
        if (characterType === CharacterArchetype.RichKid) {
          con = { social: 15, money: -5000 * countryInfo.costMultiplier, mood: 10, stamina: -10 }; 
          logMsg = "在家族分公司的跨国会议中列席，顺便结交了一些精英。"; 
        } else if (characterType === CharacterArchetype.Nerd) {
          con = { money: 2500, intelligence: 5, stamina: -15 };
          logMsg = "作为有偿助教批改试卷，顺便巩固了基础理论。";
        } else {
          con = { money: 1800 / countryInfo.costMultiplier, stamina: -20, mood: -8, social: 2 }; 
          logMsg = "在忙碌的兼职中体验社会冷暖，赚取生活费。"; 
        }
        break;
      case 'rest': 
        if (characterType === CharacterArchetype.RichKid) {
          con = { stamina: 50, mood: 30, money: -3000 * countryInfo.costMultiplier }; 
          logMsg = "包下海滨酒店进行疗养，管家服务非常贴心。"; 
        } else {
          con = { stamina: 35, mood: 20, intelligence: -2 }; 
          logMsg = "在宁静的午后，你决定彻底放空自己。"; 
        }
        break;
      case 'social': 
        con = { social: 18, language: 8, money: -1000 * countryInfo.costMultiplier, mood: 15 }; 
        logMsg = characterType === CharacterArchetype.RichKid ? "在米其林餐厅举办了小型沙龙，嘉宾皆是名流。" : "在充满活力的派对中，你结交了志同道合的新朋友。"; 
        break;
      case 'lang': 
        con = { language: 15, money: -800 * countryInfo.costMultiplier, mood: -5 }; 
        logMsg = "通过与当地人深度交流，你的表达能力飞速提升。"; 
        break;
    }

    const shouldTriggerEvent = gameState.week % 4 === 0 || Math.random() > 0.88;
    let eventPromise: Promise<RandomEvent> | null = null;
    
    // 【抢跑逻辑】立即发起事件生成
    if (shouldTriggerEvent) {
      setIsEventLoading(true);
      eventPromise = generateRandomEvent(gameState.difficulty, gameState.country, gameState.week, gameState.stats, gameState.characterType);
    }

    setTimeout(async () => {
      applyConsequence(con, logMsg);
      if (shouldTriggerEvent && eventPromise) {
        const ev = await eventPromise;
        setCurrentEvent(ev);
        setIsEventLoading(false);
        setGameState(prev => ({ ...prev, phase: 'event', currentAction: null }));
        setLoading(false);
        setIsImageLoading(true);
        generateEventImage(ev.title, ev.description).then(url => {
          if (url) setCurrentEvent(prev => prev ? { ...prev, imageUrl: url } : null);
          setIsImageLoading(false);
        });
      } else {
        setLoading(false);
        setGameState(prev => ({ ...prev, currentAction: null }));
        nextWeek();
      }
    }, 800);
  };

  const nextWeek = () => {
    setGameState(prev => {
      const nextWeekCount = prev.week + 1;
      const { stamina, money, mood } = prev.stats;
      
      if (stamina <= 0 || money <= -20000 || mood <= 0) {
        setEndingText("身心承受能力已达极限。这一段旅程虽然中断，但所有经历都将化作明日的勇气。");
        return { ...prev, phase: 'ending' };
      }
      
      if (nextWeekCount > prev.maxWeeks) { handleEndGame(); return { ...prev, phase: 'ending' }; }
      
      let newTask = prev.currentTask;
      if (prev.characterType !== CharacterArchetype.RichKid) {
        if (!newTask || newTask.isCompleted || nextWeekCount > newTask.deadline) {
          newTask = generateTask(prev.difficulty, prev.characterType, nextWeekCount);
        }
      }
      return { ...prev, week: nextWeekCount, currentTask: newTask };
    });
  };

  const handleEndGame = async () => {
    setLoading(true);
    const summary = await generateGameEnding(gameState);
    setEndingText(summary);
    setLoading(false);
  };

  const renderStat = (icon: any, key: keyof GameStats, color: string, unit: string = "") => (
    <div className={`relative flex items-center gap-1.5 bg-black/70 p-1.5 md:p-2 border-2 border-black flex-1 min-w-[75px] h-11 md:h-14 shadow-lg`}>
      <span className={`${color} shrink-0`}>{icon}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[12px] md:text-sm font-bold text-white leading-none mb-1.5 truncate">{gameState.stats[key].toFixed(0)}{unit}</span>
        <div className="w-full h-1 md:h-2 bg-gray-800 border border-black/50 rounded-full overflow-hidden">
           <div className={`h-full transition-all duration-700 ${color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, (gameState.stats[key] / (key === 'money' ? 80000 : 200)) * 100)}%` }} />
        </div>
      </div>
      <StatFeedback current={gameState.stats[key]} prev={gameState.prevStats[key]} />
    </div>
  );

  if (gameState.phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 bg-[#1a1a1a] w-full h-full overflow-hidden relative">
        <PixelCard className="w-full max-w-6xl h-full md:h-auto max-h-[100dvh] flex flex-col bg-[#2d3436] overflow-hidden border-[#fab1a0] border-4 shadow-xl">
          <div className="bg-[#fdcb6e] p-4 md:p-6 border-b-4 border-black flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3"><GameLogo /><div className="text-left animate-cute"><h1 className="text-[12px] md:text-[16px] pixel-title-sub-cute uppercase leading-none mb-1">Overseas Student Life</h1><h1 className="text-[20px] md:text-[32px] pixel-title-cute uppercase leading-none">留学生存大挑战!</h1></div></div>
             {hasSavedGame && <button onClick={() => { const saved = localStorage.getItem(SAVE_KEY); if (saved) setGameState(JSON.parse(saved)); }} className="pixel-btn pixel-btn-primary px-4 py-2 text-xs md:px-8 md:text-lg"><Save size={18} className="mr-2"/> 载入旧档</button>}
          </div>
          <div className={`flex-1 flex flex-col ${isLandscape ? 'md:flex-row' : ''} overflow-hidden min-h-0`}>
            <div className={`${isLandscape ? 'w-1/3' : 'hidden'} bg-[#636e72] border-r-4 border-black relative flex flex-col shrink-0`}><div className="flex-1 relative"><CharacterView country={gameState.country} stats={gameState.stats} characterType={gameState.characterType} currentAction={null} week={1} /></div><div className="p-4 bg-black/50 border-t-4 border-black shrink-0"><p className="text-[#fdcb6e] font-bold text-sm">【{gameState.characterType}】</p><p className="text-gray-200 text-[12px] italic">{ARCHETYPE_MODS[gameState.characterType].description}</p></div></div>
            <div className="flex-1 flex flex-col bg-[#dfe6e9] text-black overflow-y-auto custom-scroll p-5 md:p-8 space-y-6">
              <div className="space-y-3"><label className="block text-xs font-black uppercase text-gray-500">同学姓名</label><input type="text" value={gameState.playerName} onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value.slice(0, 10) }))} className="w-full border-4 border-black p-3 text-xl font-bold rounded-xl" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3"><label className="block text-xs font-black text-gray-500">学段难度</label><div className="grid grid-cols-2 gap-2">{Object.values(Difficulty).map(d => (<button key={d} onClick={() => setGameState(prev => ({ ...prev, difficulty: d }))} className={`pixel-btn py-3 text-sm ${gameState.difficulty === d ? 'pixel-btn-secondary' : 'bg-white'}`}>{d}</button>))}</div></div>
                <div className="space-y-3"><label className="block text-xs font-black text-gray-500">留学目标</label><div className="grid grid-cols-2 gap-2">{Object.values(Country).map(c => (<button key={c} onClick={() => setGameState(prev => ({ ...prev, country: c }))} className={`pixel-btn py-3 text-sm ${gameState.country === c ? 'pixel-btn-secondary' : 'bg-white'}`}>{COUNTRY_DATA[c].flag} {c}</button>))}</div></div>
              </div>
              <div className="space-y-3"><label className="block text-xs font-black text-gray-500">天赋背景</label><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.values(CharacterArchetype).map(type => (<button key={type} onClick={() => setGameState(prev => ({ ...prev, characterType: type }))} className={`p-3 border-4 border-black rounded-xl transition-all ${gameState.characterType === type ? 'bg-pink-300 -translate-y-1' : 'bg-white'}`}>{type}</button>))}</div></div>
              <button onClick={handleStartGame} className="w-full pixel-btn pixel-btn-danger py-5 font-black text-2xl shadow-xl">✨ 开始挑战!</button>
            </div>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} bg-[#121212] overflow-hidden h-full relative w-full`}>
      {isEventLoading && <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center backdrop-blur-sm"><div className="bg-black/80 p-6 pixel-border border-yellow-500 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-yellow-400" size={40} /><span className="text-yellow-400 font-bold uppercase tracking-widest">命运正在显影中...</span></div></div>}
      
      <div className={`${isLandscape ? 'w-[55%] h-full border-r-4 border-black' : 'h-[42dvh]'} relative flex flex-col min-h-0`}>
        <div className="bg-black/95 p-2 flex flex-wrap gap-2 shrink-0 z-30 shadow-2xl border-b-4 border-black">
          {renderStat(<Brain size={18}/>, "intelligence", "text-purple-400")}
          {renderStat(<Wallet size={18}/>, "money", "text-yellow-400", "$")}
          {renderStat(<HeartPulse size={18}/>, "stamina", "text-red-400")}
          {renderStat(<Smile size={18}/>, "mood", "text-pink-400")}
          {renderStat(<MessageSquare size={18}/>, "language", "text-green-400")}
          {renderStat(<Users size={18}/>, "social", "text-blue-400")}
        </div>
        <div className="flex-1 relative bg-[#222] m-2 overflow-hidden border-2 border-black rounded-xl shadow-inner">
          <CharacterView country={gameState.country} stats={gameState.stats} characterType={gameState.characterType} currentAction={gameState.currentAction} week={gameState.week} />
          {gameState.currentTask && (
            <div className="absolute top-2 left-2 right-2 bg-black/85 p-3 pixel-border-sm flex items-center gap-3 z-20 shadow-2xl border-l-8 border-yellow-500 max-w-[92%] md:max-w-[400px] rounded-r-xl">
              <div className="bg-yellow-500 p-2 border-2 border-black shrink-0"><Target size={16} className="text-black font-bold"/></div>
              <div className="min-w-0 flex-1"><p className="text-[10px] text-yellow-500 font-bold uppercase">当前目标</p><p className={`text-sm font-bold truncate ${gameState.currentTask.isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{gameState.currentTask.description}</p></div>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(true)} className="absolute bottom-3 right-3 p-3 pixel-btn z-40 bg-gray-800/95 text-white border-4"><Settings size={20}/></button>
        </div>
      </div>

      <div className={`${isLandscape ? 'flex-1 h-full' : 'flex-1'} flex flex-col p-2 gap-2 bg-[#222] min-h-0`}>
        <div className="bg-black/40 p-2 pixel-border shrink-0">
          <div className="flex overflow-x-auto custom-scroll gap-3 pb-2">
            {ACTIONS.map(action => {
              const Icon = { BookOpen, DollarSign, Coffee, Users, MessageSquare }[action.icon as any] as any;
              return (
                <button key={action.id} disabled={loading || !!gameState.currentAction} onClick={() => handleAction(action.id)} 
                  className={`pixel-btn h-16 flex-1 min-w-[85px] flex flex-col items-center justify-center gap-1 border-4 ${gameState.currentAction === action.id ? 'bg-yellow-400' : 'bg-white'}`}>
                  <Icon size={20} /><span className="text-[10px] font-black uppercase text-center leading-tight">{getActionLabel(action.id)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-[#0d0d0d] pixel-border flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
            {gameState.logs.map((log, i) => (
              <div key={i} className="border-l-4 border-indigo-500 pl-4 py-2 text-sm bg-white/5 text-gray-200 animate-in slide-in-from-right duration-300">{log}</div>
            ))}
          </div>
          <div className="p-3 bg-black text-center border-t-4 border-gray-900 flex justify-between px-6 items-center shrink-0">
             <span className="text-[10px] text-indigo-400 font-bold uppercase">Survival Challenge</span>
             <span className="text-sm text-yellow-500 font-bold">WEEK {gameState.week} / 50</span>
          </div>
        </div>
      </div>

      {gameState.phase === 'event' && currentEvent && (
        <div className="fixed inset-0 z-[120] bg-black/98 p-4 flex items-center justify-center animate-in zoom-in duration-200">
          <div className="flex flex-col max-h-[95dvh] bg-[#4e342e] pixel-border border-yellow-600 w-full max-w-2xl overflow-hidden relative">
            <div className="bg-[#5d4037] border-b-4 border-black p-4 flex items-center gap-3 shrink-0"><Sparkles size={20} className="text-yellow-400"/><h3 className="text-yellow-400 font-black text-lg truncate uppercase tracking-widest">{currentEvent.title}</h3></div>
            <div className="flex-1 overflow-y-auto custom-scroll flex flex-col">
              <div className="w-full bg-black/80 flex items-center justify-center p-4 min-h-[160px] border-b-4 border-black">
                 {isImageLoading ? <div className="flex flex-col items-center gap-2 animate-pulse"><Camera size={32} className="text-yellow-600" /><span className="text-yellow-600 text-[10px] font-bold uppercase tracking-widest">描绘场景中...</span></div> : currentEvent.imageUrl && <img src={currentEvent.imageUrl} className="pixel-border-sm max-h-[30vh] object-contain rounded-lg shadow-2xl" alt="Event" />}
              </div>
              <div className="p-6 bg-black/10 flex flex-col gap-6">
                <p className="text-lg text-gray-100 font-bold italic border-l-4 border-yellow-500 pl-4 leading-relaxed">{currentEvent.description}</p>
                <div className="flex flex-col gap-4 pb-4">
                  {currentEvent.options.map((opt, idx) => (
                    <button key={idx} onClick={() => { applyConsequence(opt.consequence, `决策：${opt.resultText}`); setCurrentEvent(null); setGameState(prev => ({ ...prev, phase: 'playing' })); nextWeek(); }} className="pixel-btn pixel-btn-secondary text-left px-6 py-4 text-sm md:text-lg font-black w-full border-4 hover:scale-102 active:bg-blue-600">{opt.text}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-sm flex items-center justify-center p-8">
          <PixelCard title="系统设置" className="w-full max-w-[400px] space-y-4 bg-[#333]">
            <button onClick={() => { const newState = !gameState.isSoundEnabled; setGameState(prev => ({ ...prev, isSoundEnabled: newState })); if (bgmRef.current) { if (newState) bgmRef.current.play(); else bgmRef.current.pause(); } }} className={`w-full pixel-btn py-4 flex items-center justify-center gap-4 ${gameState.isSoundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>{gameState.isSoundEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>} 音乐: {gameState.isSoundEnabled ? '开启' : '关闭'}</button>
            <button onClick={() => { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }} className="w-full pixel-btn py-4 bg-white"><Save size={24} className="mr-2"/> {saveStatus === 'saved' ? '存档完成' : '保存进度'}</button>
            <button onClick={() => setIsMenuOpen(false)} className="w-full pixel-btn bg-blue-500 text-white py-4"><X size={24} className="mr-2"/> 返回游戏</button>
          </PixelCard>
        </div>
      )}

      {gameState.phase === 'ending' && (
        <div className="fixed inset-0 z-[140] bg-black/99 p-6 flex items-center justify-center">
          <PixelCard title="人生旅程总结" className="max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border-yellow-500 bg-[#1e1e1e]">
             <div className="p-6 overflow-y-auto custom-scroll text-sm md:text-lg text-yellow-100 italic bg-black/80 border-4 border-yellow-900/40 rounded-xl mb-6 leading-relaxed">{loading ? "人生轨迹结算中..." : endingText}</div>
             <button onClick={() => window.location.reload()} className="pixel-btn pixel-btn-danger w-full py-6 font-black text-xl border-4 shadow-2xl">开启新的人生挑战</button>
          </PixelCard>
        </div>
      )}
    </div>
  );
};
export default App;
