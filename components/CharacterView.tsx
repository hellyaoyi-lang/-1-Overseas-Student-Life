
import React from 'react';
import { Country, GameStats, CharacterArchetype } from '../types';

interface CharacterViewProps {
  country: Country;
  stats: GameStats;
  characterType: CharacterArchetype;
  currentAction?: string | null;
  week: number;
}

export const CharacterView: React.FC<CharacterViewProps> = ({ country, stats, characterType, currentAction, week }) => {
  const isPerforming = !!currentAction;
  const isTired = stats.stamina < 30;
  const isSad = stats.mood < 30;
  const isSleeping = currentAction === 'rest';
  
  const seasonIndex = Math.floor(((week - 1) % 52) / 13);
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const currentSeason = seasons[seasonIndex];

  const getEnvConfig = () => {
    switch (country) {
      case Country.Japan: return { sky: "from-[#ffafbd] to-[#ffc3a0]", ground: "bg-[#d39183]", groundPattern: "radial-gradient(#b8746a 2px, transparent 2px)", landmark: "⛩️", foliage: "🌸", horizon: "🗻" };
      case Country.USA: return { sky: "from-[#4568dc] to-[#b06ab3]", ground: "bg-[#57606f]", groundPattern: "linear-gradient(90deg, #2f3542 2px, transparent 2px)", landmark: "🗽", foliage: "🌵", horizon: "🏙️" };
      case Country.UK: return { sky: "from-[#708090] to-[#b0c4de]", ground: "bg-[#4a5568]", groundPattern: "radial-gradient(#2d3436 2px, transparent 2px)", landmark: "🏰", foliage: "🌳", horizon: "🕰️" };
      case Country.Canada: return { sky: "from-[#84fab0] to-[#8fd3f4]", ground: "bg-[#f1f2f6]", groundPattern: "radial-gradient(#dfe4ea 2px, transparent 2px)", landmark: "🏠", foliage: "🌲", horizon: "🏔️" };
      case Country.Australia: return { sky: "from-[#f6d365] to-[#fda085]", ground: "bg-[#a0522d]", groundPattern: "radial-gradient(#8b4513 2px, transparent 2px)", landmark: "⛵", foliage: "🌿", horizon: "☀️" };
      case Country.Germany: return { sky: "from-[#fbc2eb] to-[#a6c1ee]", ground: "bg-[#3e2723]", groundPattern: "linear-gradient(45deg, #2b1d1a 2px, transparent 2px)", landmark: "🍺", foliage: "🌲", horizon: "⛰️" };
      case Country.Singapore: return { sky: "from-[#00c6ff] to-[#0072ff]", ground: "bg-[#27ae60]", groundPattern: "radial-gradient(#1e8449 2px, transparent 2px)", landmark: "🦁", foliage: "🌴", horizon: "🏢" };
      default: return { sky: "from-[#cfd9df] to-[#e2ebf0]", ground: "bg-[#dfe6e9]", groundPattern: "none", landmark: "🏫", foliage: "🌳", horizon: "☁️" };
    }
  };

  const config = getEnvConfig();
  
  const getArchetypeConfig = () => {
    switch (characterType) {
      case CharacterArchetype.RichKid:
        return { 
          hair: 'bg-[#ffd700]', outfit: 'bg-[#1e272e]', pants: 'bg-[#2d3436]', skin: 'bg-[#ffdbac]',
          hairStyle: 'h-8 w-14 rounded-t-2xl shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.2)]',
          eyeColor: 'bg-amber-900',
          idleAnim: 'animate-[rich-idle_4s_ease-in-out_infinite]',
          bodyMod: 'scale-y-[1.02]'
        };
      case CharacterArchetype.Nerd:
        return { 
          hair: 'bg-[#34495e]', outfit: 'bg-[#ecf0f1]', pants: 'bg-[#34495e]', skin: 'bg-[#ffe0bd]',
          hairStyle: 'h-7 w-13 rounded-sm shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.2)]',
          eyeColor: 'bg-black',
          idleAnim: 'animate-[nerd-idle_0.8s_linear_infinite]',
          bodyMod: 'skew-x-[2deg] origin-bottom'
        };
      case CharacterArchetype.SocialButterfly:
        return { 
          hair: 'bg-gradient-to-r from-[#ef5777] to-[#ff3f34]', outfit: 'bg-[#5758bb]', pants: 'bg-[#30336b]', skin: 'bg-[#ffdbac]',
          hairStyle: 'h-11 w-16 rounded-full shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.15)]',
          eyeColor: 'bg-indigo-950',
          idleAnim: 'animate-[social-idle_1s_ease-in-out_infinite]',
          bodyMod: 'scale-x-[1.05]'
        };
      case CharacterArchetype.HardWorker:
        return { 
          hair: 'bg-[#5d4037]', outfit: 'bg-[#d35400]', pants: 'bg-[#5d4037]', skin: 'bg-[#ffdbac]',
          hairStyle: 'h-7 w-14 rounded-t-none shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.3)]',
          eyeColor: 'bg-stone-900',
          idleAnim: 'animate-[worker-idle_5s_ease-in-out_infinite]',
          bodyMod: 'scale-y-[0.98]'
        };
      default:
        return { hair: 'bg-[#3d2514]', outfit: 'bg-gray-200', pants: 'bg-gray-400', hairStyle: 'h-7 w-12', eyeColor: 'bg-black', skin: 'bg-[#ffdbac]', idleAnim: '', bodyMod: '' };
    }
  };

  const arc = getArchetypeConfig();

  const Eye = () => (
    <div className={`relative w-3.5 h-4 ${arc.eyeColor} rounded-sm overflow-hidden shadow-[1px_1px_0_rgba(0,0,0,0.3)] ${(isTired || isSleeping) ? 'h-[1.5px] mt-1.5' : ''} ${isSad ? 'animate-[pulse_1s_infinite]' : ''}`}>
       {!(isTired || isSleeping) && <div className="w-1 h-1 bg-white absolute top-0.5 left-0.5 rounded-full" />}
    </div>
  );

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b ${config.sky} transition-colors duration-1000 z-0`}>
      
      {/* 背景元素 */}
      <div className="absolute bottom-[35%] left-0 w-full flex justify-around select-none pointer-events-none z-10 opacity-60">
        <div className="text-7xl md:text-9xl transform translate-y-6">{config.horizon}</div>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={`cloud-${i}`} className="absolute top-[10%] text-5xl animate-[float-cloud_25s_linear_infinite] z-20 opacity-80" style={{ left: `${i * 40}%`, animationDelay: `${i * 8}s` }}>☁️</div>
      ))}
      <div className="absolute bottom-[32%] left-[10%] text-6xl md:text-9xl select-none animate-[wiggle_6s_infinite] filter drop-shadow-[0_4px_0_rgba(0,0,0,0.1)] z-30">{config.landmark}</div>
      <div className={`absolute bottom-0 w-full h-[35%] ${config.ground} border-t-4 border-black/30 shadow-[inset_0_4px_0_rgba(0,0,0,0.1)] z-40`} style={{ backgroundImage: config.groundPattern, backgroundSize: '20px 20px' }} />

      {/* 角色模型 */}
      <div className={`absolute bottom-[12%] left-1/2 -translate-x-1/2 flex flex-col items-center z-50 transition-all duration-300 ${isPerforming ? 'scale-110' : 'scale-100'}`}>
        <div className={`relative w-28 h-48 flex flex-col items-center ${isPerforming ? `animate-[action-${currentAction}_0.5s_infinite]` : arc.idleAnim} ${arc.bodyMod}`}>
          
          {/* 头 */}
          <div className="relative z-30 flex flex-col items-center mb-1">
             <div className={`absolute top-0 z-10 pixel-border-sm ${arc.hair} ${arc.hairStyle}`} />
             <div className="w-16 h-16 bg-[#ffdbac] pixel-border border-b-4 mt-2 relative z-20 flex flex-col items-center justify-center shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.1)] rounded-b-2xl">
                <div className="flex gap-4 mb-3 mt-1">
                  <Eye /><Eye />
                </div>
                <div className="relative h-2.5">
                  {currentAction === 'lang' ? (
                     <div className="w-4 h-4 bg-black rounded-full animate-ping" />
                  ) : isPerforming && !isSleeping ? (
                    <div className="w-6 h-2.5 bg-white pixel-border-sm rounded-full overflow-hidden"><div className="w-full h-1 bg-red-400 mt-0.5" /></div>
                  ) : isSad || isSleeping ? (
                    <div className="w-5 h-1.5 border-t-2 border-black/60 rounded-full" />
                  ) : (
                    <div className="w-3 h-1.5 bg-pink-500/30 rounded-full border-b border-black/20" />
                  )}
                </div>
             </div>
          </div>

          {/* 躯干 & 互动道具 */}
          <div className="relative w-16 h-16 z-20 flex justify-center">
             {/* 左臂 */}
             <div className={`absolute -left-5 top-1 w-5 h-12 ${arc.outfit} pixel-border border-t-0 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.2)] rounded-full origin-top ${currentAction ? `animate-[arm-${currentAction}_0.5s_infinite]` : ''}`}>
                <div className={`absolute bottom-0 w-full h-4 ${arc.skin} border-t-2 border-black/10 rounded-b-full`} />
             </div>
             
             {/* 身体 */}
             <div className={`w-full h-full ${arc.outfit} pixel-border border-t-0 relative shadow-[inset_-6px_-6px_0_rgba(0,0,0,0.1),3px_3px_8px_rgba(0,0,0,0.2)] rounded-b-md overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-1/4 bg-black/5" />
                {characterType === CharacterArchetype.RichKid && <div className="absolute top-1 right-1 w-3 h-3 bg-white/20 rounded-full border border-white/30" />}
             </div>

             {/* 右臂 */}
             <div className={`absolute -right-5 top-1 w-5 h-12 ${arc.outfit} pixel-border border-t-0 shadow-[inset_2px_-2px_0_rgba(0,0,0,0.2)] rounded-full origin-top ${currentAction ? `animate-[arm-${currentAction}-alt_0.5s_infinite]` : ''}`}>
                <div className={`absolute bottom-0 w-full h-4 ${arc.skin} border-t-2 border-black/10 rounded-b-full`} />
             </div>

             {/* 互动道具 - 学习（书） */}
             {currentAction === 'study' && (
               <div className="absolute -bottom-2 w-14 h-10 bg-white pixel-border-sm z-40 animate-[prop-float_0.5s_infinite] shadow-lg flex items-center justify-center overflow-hidden">
                 <div className="w-full h-full p-1 flex flex-col gap-1">
                   <div className="h-1 bg-gray-200 w-full"></div>
                   <div className="h-1 bg-gray-200 w-3/4"></div>
                   <div className="h-1 bg-gray-200 w-full"></div>
                 </div>
               </div>
             )}

             {/* 互动道具 - 工作（盘子/托盘） */}
             {currentAction === 'work' && (
               <div className="absolute -bottom-4 w-12 h-4 bg-gray-100 rounded-full pixel-border-sm z-40 animate-[prop-scrub_0.5s_infinite] flex items-center justify-center">
                 <div className="w-6 h-1 bg-gray-300 rounded-full"></div>
               </div>
             )}

             {/* 互动道具 - 休息（Zzz） */}
             {currentAction === 'rest' && (
               <div className="absolute -top-16 -right-12 text-2xl font-black text-blue-400 animate-[prop-sleep_2s_infinite]">Zzz...</div>
             )}

             {/* 互动道具 - 社交（音符） */}
             {currentAction === 'social' && (
               <>
                 <div className="absolute -top-8 -left-8 text-xl animate-bounce">🎵</div>
                 <div className="absolute -top-12 -right-8 text-xl animate-bounce delay-150">🎶</div>
               </>
             )}
          </div>

          {/* 腿部 */}
          <div className="relative w-16 h-12 z-10 -mt-1 flex justify-center gap-1.5">
             <div className={`w-7 h-full ${arc.pants} pixel-border border-t-0 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-end origin-top ${isPerforming && currentAction !== 'rest' ? 'animate-[leg-step_0.4s_infinite]' : ''}`}>
                <div className="w-9 h-4 bg-[#2d3436] pixel-border border-b-4 rounded-t-sm" />
             </div>
             <div className={`w-7 h-full ${arc.pants} pixel-border border-t-0 shadow-[inset_2px_-2px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-end origin-top ${isPerforming && currentAction !== 'rest' ? 'animate-[leg-step-alt_0.4s_infinite_0.2s]' : ''}`}>
                <div className="w-9 h-4 bg-[#2d3436] pixel-border border-b-4 rounded-t-sm" />
             </div>
          </div>
        </div>
        <div className={`w-28 h-4 bg-black/40 rounded-full blur-[2px] -mt-1.5 ${isPerforming ? 'animate-[shadow-work_0.5s_infinite]' : 'animate-[shadow-idle_3s_infinite]'}`} />
      </div>

      <style>{`
        /* 待机动画 */
        @keyframes rich-idle { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-3px) rotate(1deg); } }
        @keyframes nerd-idle { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(1px); } 75% { transform: translateX(-1px); } }
        @keyframes social-idle { 0%, 100% { transform: translateY(0) scaleX(1); } 50% { transform: translateY(-8px) scaleX(1.05); } }
        @keyframes worker-idle { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.97); } }

        /* 动作动画 - 整体身体 */
        @keyframes action-study { 0%, 100% { transform: translateY(0) rotate(2deg); } 50% { transform: translateY(-2px) rotate(-2deg); } }
        @keyframes action-work { 0%, 100% { transform: translateY(0) translateX(-1px); } 50% { transform: translateY(-3px) translateX(1px); } }
        @keyframes action-rest { 0%, 100% { transform: scaleY(0.95) translateY(4px); } 50% { transform: scaleY(0.9) translateY(6px); } }
        @keyframes action-social { 0%, 100% { transform: translateY(0) scale(1.1); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes action-lang { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05) translateY(-5px); } }

        /* 手臂专用动画 */
        /* 学习：手臂举书 */
        @keyframes arm-study { 0%, 100% { transform: rotate(140deg); } 50% { transform: rotate(150deg); } }
        @keyframes arm-study-alt { 0%, 100% { transform: rotate(-140deg); } 50% { transform: rotate(-150deg); } }
        
        /* 工作：刷碗动作 */
        @keyframes arm-work { 0%, 100% { transform: rotate(45deg); } 50% { transform: rotate(90deg); } }
        @keyframes arm-work-alt { 0%, 100% { transform: rotate(-45deg); } 50% { transform: rotate(-90deg); } }

        /* 休息：手垂下 */
        @keyframes arm-rest { 0%, 100% { transform: rotate(10deg); } 50% { transform: rotate(15deg); } }
        @keyframes arm-rest-alt { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(-15deg); } }

        /* 社交：挥手跳舞 */
        @keyframes arm-social { 0%, 100% { transform: rotate(160deg); } 50% { transform: rotate(20deg); } }
        @keyframes arm-social-alt { 0%, 100% { transform: rotate(-160deg); } 50% { transform: rotate(-20deg); } }

        /* 语言：指指点点 */
        @keyframes arm-lang { 0%, 100% { transform: rotate(40deg); } 50% { transform: rotate(60deg); } }
        @keyframes arm-lang-alt { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(-40deg); } }

        /* 道具辅助动画 */
        @keyframes prop-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes prop-scrub { 0%, 100% { transform: translateX(-5px) rotate(-5deg); } 50% { transform: translateX(5px) rotate(5deg); } }
        @keyframes prop-sleep { 0% { opacity: 0; transform: translate(0, 0) scale(0.5); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(20px, -40px) scale(1.2); } }

        /* 通用辅助 */
        @keyframes leg-step { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes leg-step-alt { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shadow-idle { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.1); opacity: 0.3; } }
        @keyframes shadow-work { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes float-cloud { from { transform: translateX(110vw); } to { transform: translateX(-300px); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
      `}</style>
    </div>
  );
};
