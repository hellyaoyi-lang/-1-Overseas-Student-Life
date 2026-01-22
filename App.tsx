
import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, Country, CharacterArchetype, GameState, RandomEvent, EventOption, GameStats, Task } from './types';
import { INITIAL_STATS, COUNTRY_DATA, ACTIONS, ARCHETYPE_MODS } from './constants';
import { PixelCard } from './components/PixelCard';
import { CharacterView } from './components/CharacterView';
import { generateRandomEvent, generateGameEnding, generateEventImage } from './services/geminiService';
import { 
  Wallet, HeartPulse, Users, Smile, BookOpen, Coffee, DollarSign, MessageSquare, Brain, Target, Trophy, Save, Sparkles, Settings, X, Volume2, VolumeX, Plane, Map, UserCircle, Camera, Loader2, Keyboard 
} from 'lucide-react';

const SAVE_KEY = 'survival_challenge_pc_v1';
const MAX_LOGS = 50; // PC端屏幕大，日志显示更多

// 修复：定义 StatFeedback 组件，用于在属性栏显示数值变动的即时反馈
const StatFeedback: React.FC<{ current: number; prev: number }> = ({ current, prev }) => {
  const diff = current - prev;
  if (diff === 0) return null;
  return (
    <div key={current} className={`absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black pointer-events-none animate-bounce ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
    </div>
  );
};

// 修复：定义 GameLogo 组件，用于游戏标题区域展示
const GameLogo: React.FC = () => (
  <div className="w-12 h-12 bg-black pixel-border flex items-center justify-center relative overflow-hidden group shadow-lg">
    <div className="absolute inset-0 bg-yellow-400 group-hover:bg-pink-400 transition-colors duration-300" />
    <Plane className="relative z-10 text-black group-hover:rotate-12 transition-transform" size={24} />
  </div>
);

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
    logs: ['[系统] 游戏初始化完成。PC版已开启键盘快捷键(1-5)。'],
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
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > 768);
  const scrollRef = useRef<HTMLDivElement>(null);

  // PC 键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase === 'playing' && !loading && !gameState.currentAction) {
        if (e.key === '1') handleAction('study');
        if (e.key === '2') handleAction('work');
        if (e.key === '3') handleAction('rest');
        if (e.key === '4') handleAction('social');
        if (e.key === '5') handleAction('lang');
      } else if (gameState.phase === 'event' && currentEvent) {
        if (e.key === '1' || e.key === 'Enter' || e.key === ' ') {
          // 默认选第一个，或者对应数字
          const idx = parseInt(e.key) - 1;
          if (!isNaN(idx) && currentEvent.options[idx]) {
            handleEventOption(currentEvent.options[idx]);
          } else if (e.key === 'Enter' || e.key === ' ') {
            handleEventOption(currentEvent.options[0]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, gameState.currentAction, loading, currentEvent]);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    if (localStorage.getItem(SAVE_KEY)) setHasSavedGame(true);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState.phase === 'playing' || gameState.phase === 'event') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
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
        nextLogs.push(`🌟 [成就达成]：${newTask.description}！`);
        Object.keys(newTask.reward).forEach(k => {
          const key = k as keyof GameStats;
          nextStats[key] += (newTask!.reward[key] || 0);
        });
      }
      return { ...prev, prevStats: prev.stats, stats: nextStats, currentTask: newTask, logs: nextLogs.slice(-MAX_LOGS) };
    });
  };

  const generateTask = (difficulty: Difficulty, characterType: CharacterArchetype, week: number): Task | null => {
    if (characterType === CharacterArchetype.RichKid) return null;
    const goals: Record<CharacterArchetype, Array<{desc: string, attr: keyof GameStats, val: number}>> = {
      [CharacterArchetype.Nerd]: [
        { desc: "维持 GPA 4.0", attr: "intelligence", val: 130 },
        { desc: "精通当地学术用语", attr: "language", val: 95 }
      ],
      [CharacterArchetype.SocialButterfly]: [
        { desc: "扩充上流社交人脉", attr: "social", val: 110 },
        { desc: "掌握当地流行俚语", attr: "language", val: 80 }
      ],
      [CharacterArchetype.HardWorker]: [
        { desc: "积攒生活备用金", attr: "money", val: 8000 },
        { desc: "提升职业专业度", attr: "intelligence", val: 85 }
      ],
      [CharacterArchetype.RichKid]: [] 
    };
    const pool = goals[characterType] || goals[CharacterArchetype.HardWorker];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { id: Math.random().toString(36), description: pick.desc, targetAttr: pick.attr, targetValue: pick.val, reward: { mood: 20, money: 2000, intelligence: 10 }, deadline: week + 10, isCompleted: false };
  };

  const handleStartGame = () => {
    let stats = { ...INITIAL_STATS[gameState.difficulty] };
    const mods = ARCHETYPE_MODS[gameState.characterType];
    Object.keys(mods).forEach(k => {
      const key = k as keyof GameStats;
      if (typeof mods[key] === 'number') stats[key] = (stats[key] || 0) + (mods[key] as number);
    });
    const firstTask = generateTask(gameState.difficulty, gameState.characterType, 1);
    setGameState(prev => ({ ...prev, week: 1, stats, prevStats: stats, currentTask: firstTask, logs: [`[航站楼] 乘客 ${prev.playerName}，欢迎抵达 ${prev.country}。祝您留学顺利！`], phase: 'playing' }));
  };

  const getActionLabel = (actionId: string) => {
    const isRich = gameState.characterType === CharacterArchetype.RichKid;
    const isNerd = gameState.characterType === CharacterArchetype.Nerd;
    const isButterfly = gameState.characterType === CharacterArchetype.SocialButterfly;
    switch (actionId) {
      case 'study': return isNerd ? '科研/实验' : (isRich ? '私人授课' : '沉浸学习');
      case 'work': return isRich ? '家族见习' : (isNerd ? '学术助教' : '勤工俭学');
      case 'rest': return isRich ? '顶级疗养' : '休息调整';
      case 'social': return isRich ? '名流社交' : (isButterfly ? '网红打卡' : '社交派对');
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
        con = { intelligence: 7, language: 2, mood: -8, stamina: -12 }; 
        logMsg = characterType === CharacterArchetype.RichKid ? "在私人豪宅中接受顶尖教授的专属辅导。" : "在通宵自习室里，你和书本进行着殊死搏斗。"; 
        break;
      case 'work': 
        if (characterType === CharacterArchetype.RichKid) {
          con = { social: 15, money: -3000 * countryInfo.costMultiplier, mood: 10, stamina: -8 }; 
          logMsg = "参加了一场家族注资的商务酒会，谈笑间掌握了行业动向。"; 
        } else {
          con = { money: 2000 / countryInfo.costMultiplier, stamina: -18, mood: -6, social: 3 }; 
          logMsg = "在一整天的打工后，虽然疲惫，但手中厚实的钞票让你感到心安。"; 
        }
        break;
      case 'rest': 
        if (characterType === CharacterArchetype.RichKid) {
          con = { stamina: 40, mood: 25, money: -2000 * countryInfo.costMultiplier }; 
          logMsg = "包下海滨庄园，在和煦的海风中彻底放松身心。"; 
        } else {
          con = { stamina: 30, mood: 15, intelligence: -1 }; 
          logMsg = "睡了一场不被打扰的长觉，精神好多了。"; 
        }
        break;
      case 'social': 
        con = { social: 20, language: 6, money: -1200 * countryInfo.costMultiplier, mood: 12 }; 
        logMsg = "在多元文化的碰撞中，你学会了如何与不同背景的人高效沟通。"; 
        break;
      case 'lang': 
        con = { language: 18, money: -600 * countryInfo.costMultiplier, mood: -4 }; 
        logMsg = "通过背诵单词和观看当地剧集，你感到舌头不再那么僵硬。"; 
        break;
    }

    const shouldTriggerEvent = gameState.week % 4 === 0 || Math.random() > 0.9;
    let eventPromise: Promise<RandomEvent> | null = null;
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
    }, 600);
  };

  const handleEventOption = (opt: EventOption) => {
    applyConsequence(opt.consequence, `[决策]：${opt.resultText}`);
    setCurrentEvent(null);
    setGameState(prev => ({ ...prev, phase: 'playing' }));
    nextWeek();
  };

  const nextWeek = () => {
    setGameState(prev => {
      const nextWeekCount = prev.week + 1;
      const { stamina, money, mood } = prev.stats;
      if (stamina <= 0 || money <= -20000 || mood <= 0) {
        setEndingText("身心承受能力已达极限。这段充满荆棘的留学生活暂告一段落。");
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
    <div className={`relative flex items-center gap-2 bg-black/80 p-2 border-2 border-black flex-1 min-w-[90px] h-14 shadow-md rounded-md`}>
      <span className={`${color} shrink-0`}>{icon}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs md:text-sm font-bold text-white leading-none mb-1.5 truncate">{gameState.stats[key].toFixed(0)}{unit}</span>
        <div className="w-full h-1.5 bg-gray-900 border border-white/10 rounded-full overflow-hidden">
           <div className={`h-full transition-all duration-700 ${color.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, (gameState.stats[key] / (key === 'money' ? 80000 : 200)) * 100)}%` }} />
        </div>
      </div>
      <StatFeedback current={gameState.stats[key]} prev={gameState.prevStats[key]} />
    </div>
  );

  if (gameState.phase === 'setup') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#111] w-full h-full relative">
        <PixelCard className="w-full max-w-5xl bg-[#2d3436] border-[#fab1a0] border-4 shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#fdcb6e] p-6 border-b-4 border-black flex items-center justify-between">
             <div className="flex items-center gap-4"><GameLogo /><div className="text-left"><h1 className="text-sm pixel-title-sub-cute uppercase leading-none mb-1">Legacy Student Simulator</h1><h1 className="text-3xl pixel-title-cute uppercase leading-none">留学生存大挑战</h1></div></div>
             {hasSavedGame && <button onClick={() => { const saved = localStorage.getItem(SAVE_KEY); if (saved) setGameState(JSON.parse(saved)); }} className="pixel-btn pixel-btn-primary px-8 py-3"><Save size={18} className="mr-2"/> 载入存档</button>}
          </div>
          <div className="flex flex-col md:flex-row overflow-hidden flex-1">
            <div className="md:w-1/3 bg-[#636e72] border-r-4 border-black p-4 flex flex-col gap-4">
              <CharacterView country={gameState.country} stats={gameState.stats} characterType={gameState.characterType} currentAction={null} week={1} />
              <div className="p-4 bg-black/40 rounded-lg border-2 border-black">
                <p className="text-[#fdcb6e] font-bold text-sm">【{gameState.characterType}】</p>
                <p className="text-gray-200 text-xs mt-1 italic leading-relaxed">{ARCHETYPE_MODS[gameState.characterType].description}</p>
              </div>
            </div>
            <div className="flex-1 bg-[#dfe6e9] p-8 space-y-6 overflow-y-auto custom-scroll">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4"><label className="block text-xs font-black uppercase text-gray-500">姓名</label><input type="text" value={gameState.playerName} onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value.slice(0, 10) }))} className="w-full border-4 border-black p-3 text-xl font-bold rounded-xl focus:ring-4 ring-blue-200" /></div>
                <div className="space-y-4"><label className="block text-xs font-black text-gray-500">学段背景</label><div className="grid grid-cols-2 gap-2">{Object.values(Difficulty).map(d => (<button key={d} onClick={() => setGameState(prev => ({ ...prev, difficulty: d }))} className={`pixel-btn py-3 text-sm ${gameState.difficulty === d ? 'pixel-btn-secondary' : 'bg-white'}`}>{d}</button>))}</div></div>
              </div>
              <div className="space-y-4"><label className="block text-xs font-black text-gray-500">留学目标</label><div className="grid grid-cols-4 md:grid-cols-7 gap-2">{Object.values(Country).map(c => (<button key={c} onClick={() => setGameState(prev => ({ ...prev, country: c }))} className={`pixel-btn py-3 text-sm flex flex-col items-center gap-1 ${gameState.country === c ? 'pixel-btn-secondary' : 'bg-white'}`}><span className="text-xl">{COUNTRY_DATA[c].flag}</span><span className="text-[10px]">{c}</span></button>))}</div></div>
              <div className="space-y-4"><label className="block text-xs font-black text-gray-500">天赋背景</label><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.values(CharacterArchetype).map(type => (<button key={type} onClick={() => setGameState(prev => ({ ...prev, characterType: type }))} className={`p-4 border-4 border-black rounded-xl transition-all ${gameState.characterType === type ? 'bg-pink-300 -translate-y-1' : 'bg-white shadow-md'}`}>{type}</button>))}</div></div>
              <button onClick={handleStartGame} className="w-full pixel-btn pixel-btn-danger py-6 text-2xl shadow-xl mt-4">✨ 开启辉煌留学季!</button>
            </div>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col md:flex-row bg-[#121212] overflow-hidden h-full relative w-full`}>
      {isEventLoading && <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center backdrop-blur-md"><div className="bg-black/90 p-8 pixel-border border-yellow-500 flex flex-col items-center gap-6 shadow-2xl"><Loader2 className="animate-spin text-yellow-400" size={50} /><span className="text-yellow-400 font-bold text-xl uppercase tracking-widest">命运正在加载中...</span></div></div>}
      
      <div className={`w-full md:w-[60%] h-[40%] md:h-full border-b-4 md:border-b-0 md:border-r-4 border-black relative flex flex-col min-h-0 bg-[#222]`}>
        <div className="bg-black/95 p-3 flex flex-wrap gap-2 shrink-0 z-30 shadow-2xl border-b-4 border-black/50">
          {renderStat(<Brain size={18}/>, "intelligence", "text-purple-400")}
          {renderStat(<Wallet size={18}/>, "money", "text-yellow-400", "$")}
          {renderStat(<HeartPulse size={18}/>, "stamina", "text-red-400")}
          {renderStat(<Smile size={18}/>, "mood", "text-pink-400")}
          {renderStat(<MessageSquare size={18}/>, "language", "text-green-400")}
          {renderStat(<Users size={18}/>, "social", "text-blue-400")}
        </div>
        <div className="flex-1 relative m-3 overflow-hidden border-4 border-black rounded-2xl shadow-inner bg-[#1a1a1a]">
          <CharacterView country={gameState.country} stats={gameState.stats} characterType={gameState.characterType} currentAction={gameState.currentAction} week={gameState.week} />
          {gameState.currentTask && (
            <div className="absolute top-4 left-4 right-4 bg-black/90 p-4 pixel-border-sm flex items-center gap-4 z-20 shadow-2xl border-l-[10px] border-yellow-500 max-w-[450px] rounded-r-2xl">
              <div className="bg-yellow-500 p-3 border-2 border-black shrink-0 rounded-lg"><Target size={20} className="text-black font-bold"/></div>
              <div className="min-w-0 flex-1"><p className="text-xs text-yellow-500 font-black uppercase mb-1">当前目标任务</p><p className={`text-base font-bold ${gameState.currentTask.isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{gameState.currentTask.description}</p></div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/60 px-4 py-2 rounded-full flex items-center gap-2 border-2 border-white/20"><Keyboard size={16} className="text-white/50" /><span className="text-[10px] text-white/50 font-bold uppercase">Press 1-5 to Act</span></div>
          <button onClick={() => setIsMenuOpen(true)} className="absolute bottom-4 right-4 p-4 pixel-btn z-40 bg-gray-800 text-white border-4 hover:scale-110"><Settings size={24}/></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4 bg-[#1a1a1a] min-h-0">
        <div className="bg-black/40 p-3 pixel-border shrink-0">
          <div className="flex gap-3">
            {ACTIONS.map((action, idx) => {
              const Icon = { BookOpen, DollarSign, Coffee, Users, MessageSquare }[action.icon as any] as any;
              return (
                <button key={action.id} disabled={loading || !!gameState.currentAction} onClick={() => handleAction(action.id)} 
                  className={`pixel-btn h-24 flex-1 flex flex-col items-center justify-center gap-2 border-4 ${gameState.currentAction === action.id ? 'bg-yellow-400' : 'bg-white'} group`}>
                  <div className="relative"><Icon size={28} /><span className="absolute -top-4 -right-4 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{idx + 1}</span></div>
                  <span className="text-[11px] font-black uppercase text-center leading-tight group-hover:scale-110 transition-transform">{getActionLabel(action.id)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-[#0d0d0d] pixel-border flex flex-col overflow-hidden shadow-inner">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
            {gameState.logs.map((log, i) => (
              <div key={i} className="border-l-4 border-indigo-500 pl-5 py-3 text-base bg-white/5 text-gray-200 animate-in slide-in-from-right duration-500 hover:bg-white/10 transition-colors rounded-r-lg">{log}</div>
            ))}
          </div>
          <div className="p-4 bg-black text-center border-t-4 border-gray-900 flex justify-between px-8 items-center shrink-0">
             <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Overseas Student Life Simulator</span>
             <span className="text-lg text-yellow-500 font-black">第 {gameState.week} 周 / 50</span>
          </div>
        </div>
      </div>

      {gameState.phase === 'event' && currentEvent && (
        <div className="fixed inset-0 z-[150] bg-black/95 p-8 flex items-center justify-center animate-in zoom-in duration-300">
          <div className="flex flex-col max-h-[90dvh] bg-[#3e2723] pixel-border border-yellow-700 w-full max-w-4xl overflow-hidden shadow-[0_0_100px_rgba(251,191,36,0.3)]">
            <div className="bg-[#5d4037] border-b-4 border-black p-6 flex items-center gap-4 shrink-0"><Sparkles size={28} className="text-yellow-400"/><h3 className="text-yellow-400 font-black text-2xl uppercase tracking-tighter">{currentEvent.title}</h3></div>
            <div className="flex-1 overflow-y-auto custom-scroll flex flex-col md:flex-row">
              <div className="md:w-1/2 bg-black/90 flex items-center justify-center p-8 border-r-4 border-black/50 min-h-[300px]">
                 {isImageLoading ? <div className="flex flex-col items-center gap-4 animate-pulse"><Camera size={48} className="text-yellow-700" /><span className="text-yellow-700 text-xs font-bold uppercase tracking-widest">正在显影中...</span></div> : currentEvent.imageUrl && <img src={currentEvent.imageUrl} className="pixel-border max-h-[50vh] object-contain rounded-xl shadow-2xl hover:scale-105 transition-transform" alt="Event" />}
              </div>
              <div className="flex-1 p-10 bg-black/20 flex flex-col justify-between gap-10">
                <p className="text-2xl text-gray-100 font-bold italic border-l-8 border-yellow-500 pl-8 leading-relaxed mb-8">{currentEvent.description}</p>
                <div className="flex flex-col gap-5">
                  {currentEvent.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleEventOption(opt)} className="pixel-btn pixel-btn-secondary text-left px-8 py-5 text-lg font-black w-full border-4 hover:bg-blue-600 group flex justify-between items-center"><span className="flex-1">{opt.text}</span><span className="bg-black/30 px-3 py-1 rounded text-sm opacity-50 group-hover:opacity-100">快捷键 {idx + 1}</span></button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState.phase === 'ending' && (
        <div className="fixed inset-0 z-[300] bg-black/98 p-10 flex items-center justify-center animate-in fade-in duration-1000">
          <PixelCard title="留学总结" className="max-w-5xl w-full max-h-[85vh] flex flex-col border-yellow-500 bg-[#1a1a1a] shadow-[0_0_120px_rgba(255,255,255,0.1)]">
             <div className="p-10 overflow-y-auto custom-scroll text-xl text-yellow-100 italic bg-black/60 border-4 border-yellow-900/50 rounded-2xl mb-10 leading-relaxed font-medium">{loading ? "正在结算你的留学轨迹..." : endingText}</div>
             <button onClick={() => window.location.reload()} className="pixel-btn pixel-btn-danger w-full py-8 font-black text-2xl border-4 shadow-2xl hover:rotate-1">开启新的留学篇章</button>
          </PixelCard>
        </div>
      )}
    </div>
  );
};
export default App;
