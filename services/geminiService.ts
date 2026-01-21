
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Country, RandomEvent, CharacterArchetype } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateEventImage(title: string, description: string): Promise<string | undefined> {
  try {
    const prompt = `Pixel art for a game event: "${title}". Scene: ${description}. Kairosoft style, 16-bit, vibrant colors, isometric. NO TEXT.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) { console.error("Img Error:", error); }
  return undefined;
}

export async function generateRandomEvent(
  difficulty: Difficulty,
  country: Country,
  week: number,
  stats: any,
  characterType: CharacterArchetype
): Promise<RandomEvent> {
  const prompt = `你是像素养成游戏《留学生生存挑战》的资深文案。
  
  【当前玩家设定】
  - 身份：${characterType}
  - 所在国：${country}
  - 学段：${difficulty}
  - 时间：第${week}周
  
  【核心剧本指令 - 严禁人设崩塌】
  你必须生成一个逻辑自洽的随机事件：
  1. 如果是“豪门阔少/名媛”：
     - 禁止出现：没钱花、兼职辛苦、省钱攻略、丢了零钱、买不起门票。
     - 必须出现：名流圈排挤、限量款抢购失败、家族基金波动、越洋商务晚宴、高端爱好（赛马、滑雪）的意外。
  2. 如果是“清北卷王”：
     - 核心：GPA 4.0的威胁、实验室资源的竞争、顶级教授的冷淡、科研论文被退稿。
  3. 如果是“时尚弄潮儿”：
     - 核心：社交平台掉粉、穿搭被嘲讽、异国浪漫纠纷、时尚买手店的入场券。
  4. 如果是“全能打工人”：
     - 核心：高昂房租、兼职老板的克扣、奖学金竞争、身体超负荷。

  【输出格式】
  - title: 10字内标题。
  - description: 50字内极具代入感的描述。
  - options: 3个选项。每个选项含 text, resultText, consequence(数值变动)。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  resultText: { type: Type.STRING },
                  consequence: {
                    type: Type.OBJECT,
                    properties: {
                      intelligence: { type: Type.NUMBER },
                      stamina: { type: Type.NUMBER },
                      mood: { type: Type.NUMBER },
                      money: { type: Type.NUMBER },
                      language: { type: Type.NUMBER },
                      social: { type: Type.NUMBER }
                    }
                  }
                },
                required: ["text", "resultText", "consequence"]
              }
            }
          },
          required: ["title", "description", "options"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return {
      title: "异国思考",
      description: "看着窗外的景色，你对未来有了新的感悟。",
      options: [{ text: "继续前进", resultText: "你感到内心平静。", consequence: { mood: 5 } }]
    };
  }
}

export async function generateGameEnding(gameState: any): Promise<string> {
  const prompt = `为${gameState.playerName}撰写结局评价。
  身份：${gameState.characterType}, 国家：${gameState.country}。
  最终属性：智力${gameState.stats.intelligence}, 金钱${gameState.stats.money}, 社交${gameState.stats.social}。
  请根据其身份特质，写一段充满人文关怀且符合身份逻辑的200字结局总结。`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text;
  } catch { return "留学生涯圆满结束，新的篇章已经开启。"; }
}
