
import { Difficulty, Country, RandomEvent, CharacterArchetype } from '../types';

async function postAction(action: string, payload: any) {
  const res = await fetch('/api/genai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`genai proxy error: ${res.status} ${t}`);
  }
  return res.json();
}

export async function generateEventImage(title: string, description: string): Promise<string | undefined> {
  try {
    const r = await postAction('generateImage', { title, description });
    return r.imageUrl ?? undefined;
  } catch (err) {
    console.error('generateEventImage error', err);
    throw err;
  }
}

export async function generateRandomEvent(
  difficulty: Difficulty,
  country: Country,
  week: number,
  stats: any,
  characterType: CharacterArchetype
): Promise<RandomEvent> {
  const r = await postAction('generateEvent', { difficulty, country, week, stats, characterType });
  return r as RandomEvent;
}

export async function generateGameEnding(gameState: any): Promise<string> {
  const r = await postAction('generateEnding', { gameState });
  return r.text ?? '结局生成失败。';
}
