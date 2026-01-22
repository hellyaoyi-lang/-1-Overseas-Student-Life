import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set. API routes that call Gemini will fail.');
}
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body || {};

  try {
    if (action === 'generateEvent') {
      const { difficulty, country, week, stats, characterType } = payload || {};
      const prompt = `你是像素养成游戏的文案。\n- 身份：${characterType}\n- 所在国：${country}\n- 学段：${difficulty}\n- 时间：第${week}周\n\n请返回 JSON 格式：{ title, description, options:[{text, resultText, consequence}] }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const parsed = typeof response.text === 'string' ? JSON.parse(response.text) : response;
      return res.status(200).json(parsed);
    }

    if (action === 'generateImage') {
      const { title, description } = payload || {};
      const prompt = `Pixel art for a game event: "${title}". Scene: ${description}. Kairosoft style, 16-bit, vibrant colors, isometric. NO TEXT.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] } });
      const part = (response.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData);
      if (part?.inlineData) {
        const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return res.status(200).json({ imageUrl: dataUrl });
      }
      return res.status(200).json({ imageUrl: null });
    }

    if (action === 'generateEnding') {
      const { gameState } = payload || {};
      const prompt = `为${gameState.playerName}撰写结局评价。\n身份：${gameState.characterType}, 国家：${gameState.country}。最终属性：智力${gameState.stats.intelligence}, 金钱${gameState.stats.money}, 社交${gameState.stats.social}。请写一段200字左右的结局总结。`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      return res.status(200).json({ text: response.text });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err: any) {
    console.error('GenAI error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
